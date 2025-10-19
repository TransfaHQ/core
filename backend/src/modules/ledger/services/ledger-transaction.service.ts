import { BigNumber } from 'bignumber.js';
import { Selectable } from 'kysely';
import { PinoLogger } from 'nestjs-pino';
import { Transfer, TransferFlags, amount_max, id } from 'tigerbeetle-node';
import { validate } from 'uuid';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CursorPaginatedResult, CursorPaginationRequest, cursorPaginate } from '@libs/database';
import { DatabaseService } from '@libs/database/database.service';
import { LedgerAccounts } from '@libs/database/types';
import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';
import { LedgerTransactionStatusEnum, NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { uuidV7 } from '@libs/utils/uuid';

import { RecordLedgerTransactionDto } from '@modules/ledger/dto/ledger-transaction/record-ledger-transaction.dto';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerAccount, LedgerTransaction } from '@modules/ledger/types';

type TBTransferMap = Map<bigint, Transfer>;

@Injectable()
export class LedgerTransactionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tigerBeetleService: TigerBeetleService,
    private readonly ledgerAccountService: LedgerAccountService,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Record a ledger transaction (multi-entry) and create the corresponding
   * TigerBeetle transfers.
   *
   * Behavior (high level):
   * 1. Validate the provided ledger entries (accounts exist, not the same,
   *    belong to the same ledger, same currency).
   * 2. Load ledgers and TigerBeetle account state required for balance parsing.
   * 3. Build TigerBeetle Transfer objects for each entry pair and enforce
   *    balance bounds (min/max) by appending additional TB transfers when needed.
   * 4. Store DB-side records (ledgerTransactions, ledgerTransactionMetadata, ledgerEntries)
   *    inside a DB transaction and then submit the TigerBeetle transfers.
   *
   * Important notes:
   * - Amounts are converted to the smallest currency unit using the account's currencyExponent.
   * - A `user_data_128` TB id is used to group TB transfers for this ledger transaction.
   * - When status is POSTED, transfers are created as non-pending (flags differ).
   *
   * @param data - DTO containing transaction-level fields and ledgerEntries (pairs)
   * @returns The created LedgerTransaction (DB record) with metadata and ledgerEntries populated
   * @throws BadRequestException on input validation errors
   */
  async record(data: RecordLedgerTransactionDto): Promise<LedgerTransaction> {
    // ----------------------------
    // 1) Collect unique ledger account IDs from the request entries
    // ----------------------------
    const ledgerAccountIds: Set<string> = new Set();
    for (const entry of data.ledgerEntries) {
      ledgerAccountIds.add(entry.sourceAccountId);
      ledgerAccountIds.add(entry.destinationAccountId);
    }

    // ----------------------------
    // 2) Fetch ledger account records from DB
    // ----------------------------
    const ledgerAccounts = await this.db.kysely
      .selectFrom('ledgerAccounts')
      .selectAll()
      .where('id', 'in', Array.from(ledgerAccountIds))
      .execute();

    // Build a map for fast lookup by id
    const ledgerAccountMap = ledgerAccounts.reduce(
      (acc, account) => {
        acc[account.id] = account;
        return acc;
      },
      {} as Record<string, (typeof ledgerAccounts)[0]>,
    );

    // ----------------------------
    // 3) Validate each entry pair for basic invariants
    //    - source != destination
    //    - same ledger
    //    - same currency code
    // ----------------------------
    for (const entry of data.ledgerEntries) {
      const sourceAccount = ledgerAccountMap[entry.sourceAccountId];
      const destinationAccount = ledgerAccountMap[entry.destinationAccountId];

      if (!sourceAccount || !destinationAccount) {
        throw new BadRequestException(['one or more ledger accounts not found']);
      }

      if (sourceAccount.id === destinationAccount.id) {
        throw new BadRequestException([
          'sourceAccountId & destinationAccountId should not be the same',
        ]);
      }

      if (sourceAccount.ledgerId !== destinationAccount.ledgerId) {
        throw new BadRequestException([
          'sourceAccountId & destinationAccountId should belong to the same ledger',
        ]);
      }

      if (sourceAccount.currencyCode !== destinationAccount.currencyCode) {
        throw new BadRequestException([
          'sourceAccountId & destinationAccountId should have the same currency code',
        ]);
      }
    }

    // ----------------------------
    // 4) Load ledgers involved in the transaction
    // ----------------------------
    const ledgerIdsSet = new Set(ledgerAccounts.map((v) => v.ledgerId));
    const ledgers = await this.db.kysely
      .selectFrom('ledgers')
      .selectAll()
      .where('id', 'in', Array.from(ledgerIdsSet))
      .execute();

    // ----------------------------
    // 5) Retrieve TigerBeetle accounts for each ledgerAccount to parse balances
    // ----------------------------
    const tbAccountBuffers = ledgerAccounts.map((v) => v.tigerBeetleId);
    const tbAccounts = await this.tigerBeetleService.retrieveAccounts(tbAccountBuffers);

    // Parse ledger account balances from TB accounts for the response returned later
    const parsedLedgerAccounts: Record<string, LedgerAccount> = {};
    for (const ledgerAccount of ledgerAccounts) {
      const tbAccount = tbAccounts.find(
        (account) => account.id === bufferToTbId(ledgerAccount.tigerBeetleId),
      );
      parsedLedgerAccounts[ledgerAccount.id] = {
        ...ledgerAccount,
        balances: this.ledgerAccountService.parseAccountBalanceFromTBAccount(
          ledgerAccount,
          tbAccount!, // safe because mapping is 1:1 in normal operation
        ),
      };
    }

    // ----------------------------
    // 6) Prepare TB transfers and ledger entry DB objects
    // ----------------------------
    const ledgerTransactionStatus = data.status ?? LedgerTransactionStatusEnum.POSTED;

    // A single TB user_data_128 groups all TB transfers belonging to this ledger transaction
    const ledgerTransferTbId = id();

    // Array of TB transfers to send to TigerBeetle
    const tbTransfersData: Transfer[] = [];

    // Map to deduplicate TB transfers by TB transfer id (Transfer.id is TB id)
    const tbTransferMap: TBTransferMap = new Map();

    // DB-level ledger entries to insert (we push two entries per ledger entry pair: credit + debit)
    const ledgerEntryData: {
      id: string;
      ledgerId: string;
      direction: string;
      ledgerAccountId: string;
      amount: string; // string representation in smallest unit
      tigerBeetleId: bigint;
    }[] = [];

    const ledgerEntryMetadata: {
      ledgerEntryId: string;
      key: string;
      value: string;
    }[] = [];

    for (const entry of data.ledgerEntries) {
      const sourceAccount = ledgerAccountMap[entry.sourceAccountId];
      const destinationAccount = ledgerAccountMap[entry.destinationAccountId];

      // Convert human amount to smallest currency unit (e.g., cents) using currencyExponent
      const currencyExponentMultiplier = BigNumber(10).pow(sourceAccount.currencyExponent);
      const amount = BigNumber(entry.amount).multipliedBy(currencyExponentMultiplier).toFixed();

      // Find ledger record for this pair (they share ledgerId due to earlier validation)
      const ledger = ledgers.find((l) => l.id === sourceAccount.ledgerId)!;

      // Build the TB transfer (debit: source, credit: destination)
      const tbTransfer: Transfer = {
        id: id(),
        credit_account_id: bufferToTbId(destinationAccount.tigerBeetleId),
        debit_account_id: bufferToTbId(sourceAccount.tigerBeetleId),
        amount: BigInt(amount),
        user_data_128: ledgerTransferTbId,
        user_data_64: 0n,
        user_data_32: 0,
        ledger: ledger.tigerBeetleId,
        code: 1,
        // If the outer ledgerTransaction is POSTED we don't create pending transfers.
        // If it's PENDING we mark the transfer as pending so it can be posted/voided later.
        flags:
          ledgerTransactionStatus === LedgerTransactionStatusEnum.POSTED
            ? TransferFlags.linked
            : TransferFlags.pending | TransferFlags.linked,
        pending_id: 0n,
        timeout: 0,
        timestamp: 0n,
      };

      const sourceEntryId = uuidV7();
      const destinationEntryId = uuidV7();

      // Two DB ledger entries: one credit (destination) and one debit (source)
      ledgerEntryData.push({
        id: destinationEntryId,
        ledgerAccountId: entry.destinationAccountId,
        ledgerId: destinationAccount.ledgerId,
        amount,
        tigerBeetleId: tbTransfer.id,
        direction: NormalBalanceEnum.CREDIT,
      });

      ledgerEntryData.push({
        id: sourceEntryId,
        ledgerAccountId: entry.sourceAccountId,
        ledgerId: sourceAccount.ledgerId,
        amount,
        tigerBeetleId: tbTransfer.id,
        direction: NormalBalanceEnum.DEBIT,
      });

      // Apply account balance limit checks (min/max) which may append extra TB transfers
      // The helper `checkBalanceLimits` will add required balancing/checking transfers into
      // tbTransfersData and will use tbTransferMap to deduplicate.
      this.checkBalanceLimits(
        sourceAccount,
        destinationAccount,
        tbTransfer,
        ledgerTransactionStatus,
        tbTransfersData,
        tbTransferMap,
      );

      // Process ledger entry metadata

      Object.entries(entry.sourceMetadata ?? {}).forEach(([key, value]) => {
        ledgerEntryMetadata.push({
          ledgerEntryId: sourceEntryId,
          key,
          value,
        });
      });

      Object.entries(entry.destinationMetadata ?? {}).forEach(([key, value]) => {
        ledgerEntryMetadata.push({
          ledgerEntryId: destinationEntryId,
          key,
          value,
        });
      });
    }

    // ----------------------------
    // 7) Finalize TB transfer flags for the batch:
    //    - TigerBeetle uses `linked` to group transfers.
    //    - The last transfer in the batch must not have `linked` set to indicate the end.
    //    - For POSTED transactions, last transfer should clear the linked flag entirely (0).
    //    - For PENDING transactions, the last transfer should be `pending` (not linked-only).
    // ----------------------------
    // Safety: tbTransfersData must have at least one item (there is at least one ledger entry pair).
    const lastIndex = tbTransfersData.length - 1;
    tbTransfersData[lastIndex].flags =
      ledgerTransactionStatus === LedgerTransactionStatusEnum.POSTED ? 0 : TransferFlags.pending;

    // ----------------------------
    // 8) Persist DB objects and create TB transfers inside a DB transaction
    // ----------------------------
    return this.db.transaction(async (trx) => {
      // 8.a Insert ledger transaction master record
      const ledgerTransaction = await trx
        .insertInto('ledgerTransactions')
        .values({
          externalId: data.externalId as string,
          description: data.description,
          // Store TB group id as buffer in DB
          tigerBeetleId: tbIdToBuffer(ledgerTransferTbId),
          effectiveAt: data.effectiveAt,
          status: ledgerTransactionStatus,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // 8.b Insert metadata (if provided)
      const ledgerTransactionMetadata = Object.entries(data.metadata ?? {}).map(([key, value]) => ({
        ledgerTransactionId: ledgerTransaction.id,
        key,
        value,
      }));

      if (ledgerTransactionMetadata.length > 0) {
        await trx
          .insertInto('ledgerTransactionMetadata')
          .values(ledgerTransactionMetadata)
          .execute();
      }

      // 8.c Insert ledger entries (credit + debit rows)
      const insertedEntries = await trx
        .insertInto('ledgerEntries')
        .values(
          ledgerEntryData.map((v) => ({
            id: v.id,
            ledgerAccountId: v.ledgerAccountId,
            ledgerId: v.ledgerId,
            ledgerTransactionId: ledgerTransaction.id,
            amount: v.amount,
            tigerBeetleId: tbIdToBuffer(v.tigerBeetleId),
            direction: v.direction,
          })),
        )
        .returningAll()
        .execute();

      // 8.d Insert all  ledger entry metdata
      if (ledgerEntryMetadata.length > 0) {
        await trx.insertInto('ledgerEntryMetadata').values(ledgerEntryMetadata).execute();
      }

      // 8.e Create all TigerBeetle transfers prepared earlier
      //      (this is done after DB inserts so the DB state and TB transfers stay consistent)
      await this.tigerBeetleService.createTransfers(tbTransfersData);

      // 8.f Return the composed LedgerTransaction including metadata and populated ledgerEntries
      return {
        ...ledgerTransaction,
        metadata: ledgerTransactionMetadata,
        ledgerEntries: insertedEntries.map((entry) => ({
          ...entry,
          metadata: ledgerEntryMetadata.filter((metadata) => metadata.ledgerEntryId == entry.id),
          ledgerAccount: parsedLedgerAccounts[entry.ledgerAccountId],
        })),
      };
    });
  }

  async retrieve(id: string): Promise<LedgerTransaction> {
    const transaction = await this.db.kysely
      .selectFrom('ledgerTransactions')
      .selectAll()
      .where((eb) => {
        if (validate(id)) {
          return eb('id', '=', id).or('externalId', '=', id);
        }
        return eb('externalId', '=', id);
      })
      .executeTakeFirst();

    if (!transaction) {
      throw new NotFoundException('Ledger transaction not found');
    }

    const metadata = await this.db.kysely
      .selectFrom('ledgerTransactionMetadata')
      .select(['key', 'value'])
      .where('ledgerTransactionId', '=', transaction.id)
      .execute();

    const entries = await this.db.kysely
      .selectFrom('ledgerEntries as le')
      .innerJoin('ledgerAccounts as la', 'la.id', 'le.ledgerAccountId')
      .select([
        'le.id',
        'le.createdAt',
        'le.updatedAt',
        'le.amount',
        'le.direction',
        'le.ledgerId',
        'le.tigerBeetleId',
        'le.ledgerAccountId',
        'le.deletedAt',
        'la.currencyCode',
        'la.currencyExponent',
        'la.name as accountName',
      ])
      .where('le.ledgerTransactionId', '=', transaction.id)
      .execute();

    const entryIds = Array.from(new Set(entries.map((entry) => entry.id)));

    // Fetch metadata for accounts (if needed in the future)
    const metadataResults = await this.db.kysely
      .selectFrom('ledgerEntryMetadata')
      .select(['ledgerEntryId', 'key', 'value'])
      .where('ledgerEntryId', 'in', entryIds)
      .execute();

    // Group metadata by account ID
    const metadataByEntryId = metadataResults.reduce(
      (acc, meta) => {
        if (!acc[meta.ledgerEntryId]) {
          acc[meta.ledgerEntryId] = [];
        }
        acc[meta.ledgerEntryId].push({ key: meta.key, value: meta.value });
        return acc;
      },
      {} as Record<string, Array<{ key: string; value: string }>>,
    );

    return {
      ...transaction,
      metadata,
      ledgerEntries: entries.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        amount: entry.amount,
        direction: entry.direction,
        ledgerAccountId: entry.ledgerAccountId,
        ledgerAccount: {
          currencyCode: entry.currencyCode,
          currencyExponent: entry.currencyExponent,
          name: entry.accountName,
        } as Selectable<LedgerAccount>,
        ledgerId: entry.ledgerId,
        ledgerTransactionId: transaction.id,
        tigerBeetleId: entry.tigerBeetleId,
        deletedAt: entry.deletedAt,
        metadata: metadataByEntryId[entry.id] || [],
      })),
    };
  }

  async paginate(
    options: CursorPaginationRequest<{
      externalId?: string;
      search?: string;
      metadata?: Record<string, string>;
    }>,
  ): Promise<CursorPaginatedResult<LedgerTransaction>> {
    const { limit = 15, afterCursor, beforeCursor, order = 'desc' } = options;
    const { externalId, search, metadata } = options.filters;

    let baseQuery = this.db.kysely.selectFrom('ledgerTransactions');

    if (externalId) {
      baseQuery = baseQuery.where('externalId', '=', externalId);
    }

    if (search) {
      baseQuery = baseQuery.where('description', 'ilike', `%${search}%`);
    }

    Object.entries(metadata ?? {}).forEach(([key, value]) => {
      baseQuery = baseQuery.where((eb) =>
        eb.exists(
          eb
            .selectFrom('ledgerTransactionMetadata')
            .select('id')
            .where(
              'ledgerTransactionMetadata.ledgerTransactionId',
              '=',
              eb.ref('ledgerTransactions.id'),
            )
            .where('ledgerTransactionMetadata.key', '=', key)
            .where('ledgerTransactionMetadata.value', '=', value),
        ),
      );
    });

    const queryWithSelect = baseQuery.selectAll();

    const paginatedResult = await cursorPaginate({
      qb: queryWithSelect,
      limit,
      afterCursor: afterCursor,
      beforeCursor: beforeCursor,
      initialOrder: order,
    });

    if (paginatedResult.data.length === 0) {
      return {
        ...paginatedResult,
        data: [],
      };
    }

    const transactionIds = paginatedResult.data.map((txn) => txn.id);

    const metadataResults = await this.db.kysely
      .selectFrom('ledgerTransactionMetadata')
      .select(['ledgerTransactionId', 'key', 'value'])
      .where('ledgerTransactionId', 'in', transactionIds)
      .execute();

    const metadataByTransactionId = metadataResults.reduce(
      (acc, meta) => {
        if (!acc[meta.ledgerTransactionId]) {
          acc[meta.ledgerTransactionId] = [];
        }
        acc[meta.ledgerTransactionId].push({ key: meta.key, value: meta.value });
        return acc;
      },
      {} as Record<string, Array<{ key: string; value: string }>>,
    );

    const entries = await this.db.kysely
      .selectFrom('ledgerEntries as le')
      .innerJoin('ledgerAccounts as la', 'la.id', 'le.ledgerAccountId')
      .select([
        'le.id',
        'le.createdAt',
        'le.updatedAt',
        'le.amount',
        'le.direction',
        'le.ledgerId',
        'le.tigerBeetleId',
        'le.ledgerAccountId',
        'le.deletedAt',
        'le.ledgerTransactionId',
        'la.currencyCode',
        'la.currencyExponent',
        'la.name as accountName',
      ])
      .where('le.ledgerTransactionId', 'in', transactionIds)
      .execute();

    const entriesByTransactionId = entries.reduce(
      (acc, entry) => {
        if (!acc[entry.ledgerTransactionId]) {
          acc[entry.ledgerTransactionId] = [];
        }
        acc[entry.ledgerTransactionId].push({
          id: entry.id,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          amount: entry.amount,
          direction: entry.direction,
          ledgerAccountId: entry.ledgerAccountId,
          ledgerAccount: {
            currencyCode: entry.currencyCode,
            currencyExponent: entry.currencyExponent,
            name: entry.accountName,
          } as any,
          ledgerTransactionId: entry.ledgerTransactionId,
          tigerBeetleId: entry.tigerBeetleId,
          ledgerId: entry.ledgerId,
          deletedAt: entry.deletedAt,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    const data = paginatedResult.data.map((transaction) => ({
      ...transaction,
      metadata: metadataByTransactionId[transaction.id] || [],
      ledgerEntries: entriesByTransactionId[transaction.id] || [],
    }));

    return {
      ...paginatedResult,
      data,
    };
  }

  /**
   * Posts or archives a pending ledger transaction in TigerBeetle and updates its status in the database.
   *
   * ## 🧩 TigerBeetle Two-Phase Commit
   * This function implements TigerBeetle's **two-phase commit**:
   * 1. First, a transfer is created with a `pending` flag (`debit_pending`/`credit_pending`) — this reserves the funds.
   * 2. Then, this function either:
   *    - Posts the pending transfer using `post_pending_transfer`
   *    - Or voids it using `void_pending_transfer`
   *
   * This is done by referencing the original `pending_id` (from the pending transfer).
   *
   * ## 💰 Why `amount_max` Is Used for Posting
   * - TigerBeetle allows using a magic constant `amount_max` to indicate:
   *   > "Use the full pending amount from the original transfer"
   * - This avoids having to duplicate the amount exactly in the posting phase.
   * - For archival (voiding), the amount is set to `0n`, meaning "cancel the pending transfer."
   *
   * ## 🔗 Purpose of `linked` Flags
   * - TigerBeetle allows linking multiple transfers as a batch using the `linked` flag.
   * - This ensures that **either all transfers succeed together or all fail**, enabling atomic multi-entry transactions.
   * - The `linked` flag is set on **all but the last transfer**.
   * - The **last transfer clears `linked`** to signal "this is the end of the batch."
   *
   * @param ledgerTransactionId - The UUID of the transaction to post or archive
   * @param status - The new status to apply (`POSTED` or `ARCHIVED`)
   * @returns The updated `LedgerTransaction` after status change
   *
   * @throws {NotFoundException} If the transaction doesn't exist or isn't pending
   * @throws {Error} If TigerBeetle transfer creation fails
   */
  async postOrArchiveTransaction(
    ledgerTransactionId: string,
    status: LedgerTransactionStatusEnum,
  ): Promise<LedgerTransaction> {
    await this.db.transaction(async (trx) => {
      const ledgerTransaction = await trx
        .selectFrom('ledgerTransactions')
        .select(['id', 'status', 'tigerBeetleId'])
        .where(({ eb, and }) =>
          and([
            eb('id', '=', ledgerTransactionId),
            eb('status', '=', LedgerTransactionStatusEnum.PENDING),
          ]),
        )
        .forUpdate() // lock transaction and make sure there is no update happening at the same time
        .executeTakeFirstOrThrow();

      const ledgerEntries = await trx
        .selectFrom('ledgerEntries')
        .select(['id', 'tigerBeetleId', 'ledgerId', 'ledgerAccountId', 'direction'])
        .where('ledgerTransactionId', '=', ledgerTransactionId)
        .execute();

      this.logger.info(
        `${status} transaction ${ledgerTransactionId} with ${ledgerEntries.length} entries`,
      );

      const ledgers = await trx
        .selectFrom('ledgers')
        .select(['id', 'tigerBeetleId'])
        .where('id', 'in', Array.from(new Set(ledgerEntries.map((v) => v.ledgerId))))
        .execute();

      const ledgerAccounts = await trx
        .selectFrom('ledgerAccounts')
        .select([
          'id',
          'boundCheckAccountTigerBeetleId',
          'boundFundingAccountTigerBeetleId',
          'normalBalance',
          'maxBalanceLimit',
          'minBalanceLimit',
          'tigerBeetleId',
        ])
        .where(({ eb, and, or }) =>
          and([
            eb('id', 'in', Array.from(new Set(ledgerEntries.map((e) => e.ledgerAccountId)))),
            or([eb('minBalanceLimit', 'is not', null), eb('maxBalanceLimit', 'is not', null)]),
          ]),
        )
        .execute();

      // amount_max is a helper from tigerbeetle package that helps to post the full amount
      const transferAmount = status === LedgerTransactionStatusEnum.ARCHIVED ? 0n : amount_max;
      // We need to post or archive here
      const tbTransfersData: Transfer[] = [];
      const tbTransferMap: Map<bigint, Transfer> = new Map();

      // Each tb transfer has 2 entries on on our end. Here we are grouping them together
      const entriesPerTbTransferId = ledgerEntries.reduce(
        (res, value) => {
          const tbId = bufferToTbId(value.tigerBeetleId);
          const values = res.get(tbId) ?? [];
          values.push(value);
          res.set(tbId, values);
          return res;
        },

        new Map() as Map<bigint, (typeof ledgerEntries)[0][]>,
      );

      for (const [tbTransferId, entries] of entriesPerTbTransferId) {
        const sourceEntry = entries.find((e) => e.direction === NormalBalanceEnum.DEBIT)!;
        const destinationEntry = entries.find((e) => e.direction === NormalBalanceEnum.CREDIT)!;

        const sourceAccount = ledgerAccounts.find((a) => a.id === sourceEntry.ledgerAccountId);
        const destinationAccount = ledgerAccounts.find(
          (a) => a.id === destinationEntry.ledgerAccountId,
        );

        if (!sourceEntry || !destinationEntry) {
          throw new BadRequestException('Invalid entry structure');
        }

        const data = {
          id: id(),
          credit_account_id: 0n, // we don't need to set the account id if we set the pending_id already
          debit_account_id: 0n, // we don't need to set the account id if we set the pending_id already
          amount: transferAmount,
          user_data_128: bufferToTbId(ledgerTransaction.tigerBeetleId),
          user_data_64: 0n,
          user_data_32: 0,
          ledger: ledgers.find((v) => v.id === sourceEntry.ledgerId)!.tigerBeetleId, // ledgers will always has value. So it is safe here
          code: 1,
          flags:
            status === LedgerTransactionStatusEnum.POSTED
              ? TransferFlags.linked | TransferFlags.post_pending_transfer
              : TransferFlags.void_pending_transfer | TransferFlags.linked,
          pending_id: tbTransferId,
          timeout: 0,
          timestamp: 0n,
        };

        this.checkBalanceLimits(
          sourceAccount!,
          destinationAccount!,
          data,
          status,
          tbTransfersData,
          tbTransferMap,
        );
      }

      // Remove linked flag from the latest transfer.
      // No check here because for a transaction, there will be always at least two entries then this list won't be empty
      tbTransfersData[tbTransfersData.length - 1].flags =
        status === LedgerTransactionStatusEnum.POSTED
          ? TransferFlags.post_pending_transfer
          : TransferFlags.void_pending_transfer;

      await this.tigerBeetleService.createTransfers(tbTransfersData);

      await trx
        .updateTable('ledgerTransactions')
        .set({ status })
        .where('id', '=', ledgerTransactionId)
        .execute();
    });

    return this.retrieve(ledgerTransactionId);
  }

  /**
   * Implements max balance limit checking using TigerBeetle's control account pattern.
   *
   * This creates a 4-transfer sequence:
   * 1. Set control account balance to limit
   * 2. Create pending balancing transfer to check if limit would be exceeded
   * 3. Void the pending transfer (cleanup)
   * 4. Reset control account to zero (cleanup)
   *
   * If transfer #2 fails due to insufficient balance, the entire transaction is rejected,
   * preventing the account from exceeding its max balance limit.
   *
   * @param account - The account with max balance limit
   * @param status - Transaction status (only enforced for POSTED)
   * @param transferToPerform - The original transfer to validate
   * @param response - Array to append validation transfers to
   */
  private transferWithMaxBalanceBound(
    account: Partial<Selectable<LedgerAccounts>>,
    status: LedgerTransactionStatusEnum,
    transferToPerform: Transfer,
    response: Transfer[],
    tbTransferMap: TBTransferMap,
  ): void {
    if (account.maxBalanceLimit == null) return;

    if (status !== LedgerTransactionStatusEnum.POSTED) return;

    if (!account.boundCheckAccountTigerBeetleId || !account.boundFundingAccountTigerBeetleId) {
      this.logger.error(
        `Account ${account.id} missing bound accounts despite having maxBalanceLimit`,
      );
      throw new BadRequestException(
        `Account ${account.id} missing bound accounts despite having maxBalanceLimit`,
      );
    }

    const isDebitAccount = account.normalBalance === NormalBalanceEnum.DEBIT;

    const boundFundingAccountTigerBeetleId = bufferToTbId(account.boundFundingAccountTigerBeetleId);

    const boundCheckAccountTigerBeetleId = bufferToTbId(account.boundCheckAccountTigerBeetleId);
    const maxBalanceLimit = BigInt(account.maxBalanceLimit);

    const checkAccountTransfer = isDebitAccount
      ? {
          debit_account_id: boundCheckAccountTigerBeetleId,
          credit_account_id: bufferToTbId(account.tigerBeetleId!),
        }
      : {
          debit_account_id: bufferToTbId(account.tigerBeetleId!),
          credit_account_id: boundCheckAccountTigerBeetleId,
        };

    const controlAccountTransfer = isDebitAccount
      ? {
          debit_account_id: boundFundingAccountTigerBeetleId,
          credit_account_id: boundCheckAccountTigerBeetleId,
        }
      : {
          debit_account_id: boundCheckAccountTigerBeetleId,
          credit_account_id: boundFundingAccountTigerBeetleId,
        };

    const balancingFlag = isDebitAccount
      ? TransferFlags.balancing_credit
      : TransferFlags.balancing_debit;

    const common = {
      user_data_128: transferToPerform.user_data_128,
      user_data_64: 0n,
      user_data_32: 0,
      ledger: transferToPerform.ledger,
      code: transferToPerform.code,
      pending_id: 0n,
      timeout: 0,
      timestamp: 0n,
      flags: TransferFlags.linked,
    };

    const pendingTransferId = id();

    [
      transferToPerform,
      // Transfer 1: Set control account's balance to the limit
      {
        ...common,
        id: id(),
        ...controlAccountTransfer,
        amount: maxBalanceLimit, // Limit
        flags: TransferFlags.linked,
      },
      // Transfer 2: Check if destination balance would exceed limit (PENDING)
      {
        ...common,
        id: pendingTransferId,
        ...checkAccountTransfer,
        amount: amount_max,
        flags: TransferFlags.linked | balancingFlag | TransferFlags.pending,
      },
      // Transfer 3: Void the pending transfer (cleanup)
      {
        ...common,
        id: id(),
        debit_account_id: 0n,
        credit_account_id: 0n,
        amount: 0n,
        pending_id: pendingTransferId, // References the pending transfer
        flags: TransferFlags.linked | TransferFlags.void_pending_transfer,
      },
      // Transfer 4: Reset control account balance to zero (cleanup)
      {
        ...common,
        id: id(),
        debit_account_id: boundCheckAccountTigerBeetleId,
        credit_account_id: boundFundingAccountTigerBeetleId,
        amount: maxBalanceLimit, // AMOUNT_MAX
        flags: balancingFlag | TransferFlags.linked,
      },
    ].forEach((data) => {
      if (!tbTransferMap.has(data.id)) {
        response.push(data);
      }
    });

    tbTransferMap.set(transferToPerform.id, transferToPerform);
  }

  /**
   * This function prevents an account’s balance from dropping below a specified
   * minimum (minBalance).
   *
   * TigerBeetle itself doesn’t provide “minimum balance” enforcement directly.
   * Instead, we implement a **control transfer** pattern using an internal
   * “control account” that represents the boundary condition.
   *
   * The logic mirrors the `transferWithMaxBalanceBound()` method but operates
   * in the opposite direction:
   * - It “reserves” the amount that would bring the balance *below* the minimum,
   *   effectively preventing the account from going under its defined floor.
   *
   * This creates a 4-transfer sequence:
   * 1. Set control account balance to limit
   * 2. Create pending balancing transfer to check if limit would be exceeded
   * 3. Void the pending transfer (cleanup)
   * 4. Reset control account to zero (cleanup)
   *
   * If transfer #4 fails due to insufficient balance, the entire transaction is rejected,
   * preventing the account from exceeding its max balance limit.
   *
   * @param account - The account with max balance limit
   * @param status - Transaction status (only enforced for POSTED)
   * @param transferToPerform - The original transfer to validate
   * @param response - Array to append validation transfers to
   */
  private transferWithMinBalanceBound(
    account: Partial<Selectable<LedgerAccounts>>,
    status: LedgerTransactionStatusEnum,
    transferToPerform: Transfer,
    response: Transfer[],
    tbTransferMap: TBTransferMap,
  ): void {
    if (account.minBalanceLimit == null) return;

    if (status !== LedgerTransactionStatusEnum.POSTED) return;

    if (!account.boundCheckAccountTigerBeetleId || !account.boundFundingAccountTigerBeetleId) {
      this.logger.error(
        `Account ${account.id} missing bound accounts despite having minBalanceLimit`,
      );
      throw new BadRequestException(
        `Account ${account.id} missing bound accounts despite having minBalanceLimit`,
      );
    }

    const boundFundingAccountTigerBeetleId = bufferToTbId(account.boundFundingAccountTigerBeetleId);

    const boundCheckAccountTigerBeetleId = bufferToTbId(account.boundCheckAccountTigerBeetleId);

    const limit = BigInt(account.minBalanceLimit);

    const isDebitAccount = account.normalBalance === NormalBalanceEnum.DEBIT;

    const checkAccountTransfer = isDebitAccount
      ? {
          debit_account_id: boundCheckAccountTigerBeetleId,
          credit_account_id: bufferToTbId(account.tigerBeetleId!),
        }
      : {
          debit_account_id: bufferToTbId(account.tigerBeetleId!),
          credit_account_id: boundCheckAccountTigerBeetleId,
        };

    const controlAccountTransfer = isDebitAccount
      ? {
          debit_account_id: boundFundingAccountTigerBeetleId,
          credit_account_id: boundCheckAccountTigerBeetleId,
        }
      : {
          debit_account_id: boundCheckAccountTigerBeetleId,
          credit_account_id: boundFundingAccountTigerBeetleId,
        };

    const balancingFlag = isDebitAccount
      ? TransferFlags.balancing_credit
      : TransferFlags.balancing_debit;

    const common = {
      user_data_128: transferToPerform.user_data_128,
      user_data_64: 0n,
      user_data_32: 0,
      ledger: transferToPerform.ledger,
      code: transferToPerform.code,
      pending_id: 0n,
      timeout: 0,
      timestamp: 0n,
      flags: TransferFlags.linked,
    };

    const pendingTransferId = id();

    [
      // Transfer 1: Set control account's balance to the limit
      {
        ...common,
        id: id(),
        ...controlAccountTransfer,
        amount: limit, // Limit
        flags: TransferFlags.linked,
      },
      // Transfer 2: Check if destination balance would exceed limit (PENDING)
      {
        ...common,
        id: pendingTransferId,
        ...checkAccountTransfer,
        amount: limit,
        flags: TransferFlags.linked | balancingFlag | TransferFlags.pending,
      },
      transferToPerform,
      // Transfer 4: Void the pending transfer (cleanup)
      {
        ...common,
        id: id(),
        debit_account_id: 0n,
        credit_account_id: 0n,
        amount: 0n,
        pending_id: pendingTransferId, // References the pending transfer
        flags: TransferFlags.linked | TransferFlags.void_pending_transfer,
      },
      // Transfer 4: Reset control account balance to zero (cleanup)
      {
        ...common,
        id: id(),
        debit_account_id: boundCheckAccountTigerBeetleId,
        credit_account_id: boundFundingAccountTigerBeetleId,
        amount: limit,
        flags: balancingFlag | TransferFlags.linked,
      },
    ].forEach((data) => {
      if (!tbTransferMap.has(data.id)) {
        response.push(data);
      }
    });

    tbTransferMap.set(transferToPerform.id, transferToPerform);
  }

  /**
   * 🔍 Enforces account balance limits during a ledger transaction.
   *
   * This method applies **minimum** and **maximum** balance constraints
   * for both the source and destination accounts involved in a TigerBeetle transfer.
   *
   * It integrates with TigerBeetle’s “control account” pattern to simulate
   * soft limits on balances that TigerBeetle itself doesn’t directly enforce.
   *
   * ---
   * ## 🧠 How It Works
   *
   * Each ledger transaction consists of paired entries:
   * - **Source account** (debit)
   * - **Destination account** (credit)
   *
   * Depending on the account’s **normal balance type** (`DEBIT` or `CREDIT`),
   * certain constraints apply:
   *
   * | Account Type | Possible Limit | Enforcement Direction |
   * |---------------|----------------|------------------------|
   * | CREDIT normal | Min balance (avoid going negative) | Check on **source account** |
   * | DEBIT normal  | Min balance (avoid going below floor) | Check on **destination account** |
   * | DEBIT normal  | Max balance (avoid exceeding cap) | Check on **source account** |
   * | CREDIT normal | Max balance (avoid exceeding cap) | Check on **destination account** |
   *
   * ---
   * ## ⚙️ Order of Enforcement
   *
   * 1. **Min balance checks** first — ensures no overdraft-like situations.
   * 2. **Max balance checks** second — ensures accounts don’t exceed credit caps.
   *
   * This ordering ensures that **debit-side limits** (insufficient funds)
   * are validated before **credit-side capacity** (overflow) checks.
   *
   * ---
   * ## 🧩 Linked Transfer Chain Logic
   *
   * Each enforcement may append one or more “control” transfers to the TigerBeetle
   * transfer batch (`tbTransfersData`), using `linked` flags.
   *
   * The order of transfers is critical because TigerBeetle executes them atomically:
   * - Min balance transfers run **before** max balance transfers.
   * - Control-account transfers are linked so that failure of any one check
   *   cancels the entire batch.
   *
   * ---
   * @param sourceAccount - The debit-side ledger account for this transfer.
   * @param destinationAccount - The credit-side ledger account for this transfer.
   * @param data - The TigerBeetle `Transfer` object being constructed.
   * @param status - The transaction status (`POSTED` or `PENDING`).
   * @param tbTransfersData - Array collecting all TigerBeetle transfers to be created.
   * @param tbTransferMap - Map of already-added transfers (prevents duplicates).
   */
  private checkBalanceLimits(
    sourceAccount: Partial<Selectable<LedgerAccounts>>,
    destinationAccount: Partial<Selectable<LedgerAccounts>>,
    data: Transfer,
    status: LedgerTransactionStatusEnum,
    tbTransfersData: Transfer[],
    tbTransferMap: TBTransferMap,
  ): void {
    // ---------------------------------------------
    // 1️⃣ Enforce MIN BALANCE limits first
    // ---------------------------------------------
    // CREDIT-normal source accounts can drop below zero,
    // so enforce min balance on the *source*.
    if (sourceAccount && sourceAccount.normalBalance === NormalBalanceEnum.CREDIT) {
      this.transferWithMinBalanceBound(sourceAccount, status, data, tbTransfersData, tbTransferMap);
    }

    // DEBIT-normal destination accounts might go below allowed minimum
    // when receiving a debit transfer — enforce lower bound.
    if (destinationAccount && destinationAccount.normalBalance === NormalBalanceEnum.DEBIT) {
      this.transferWithMinBalanceBound(
        destinationAccount,
        status,
        data,
        tbTransfersData,
        tbTransferMap,
      );
    }

    // ---------------------------------------------
    // 2️⃣ Enforce MAX BALANCE limits next
    // ---------------------------------------------
    // DEBIT-normal source accounts may exceed their upper balance limit after a debit.
    if (sourceAccount && sourceAccount.normalBalance === NormalBalanceEnum.DEBIT) {
      this.transferWithMaxBalanceBound(sourceAccount, status, data, tbTransfersData, tbTransferMap);
    }

    // CREDIT-normal destination accounts may exceed their limit after crediting.
    if (destinationAccount && destinationAccount.normalBalance === NormalBalanceEnum.CREDIT) {
      this.transferWithMaxBalanceBound(
        destinationAccount,
        status,
        data,
        tbTransfersData,
        tbTransferMap,
      );
    }

    // ---------------------------------------------
    // 3️⃣ Append original transfer if not already added
    // ---------------------------------------------
    // If no additional bound-transfer logic handled this one,
    // ensure the main transaction transfer itself is queued.
    if (!tbTransferMap.has(data.id)) tbTransfersData.push(data);
  }
}
