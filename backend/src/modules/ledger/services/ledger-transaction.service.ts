import { BigNumber } from 'bignumber.js';
import { Transfer, TransferFlags, id } from 'tigerbeetle-node';
import { validate } from 'uuid';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';
import { DatabaseService } from '@libs/database/database.service';
import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';
import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { uuidV7 } from '@libs/utils/uuid';

import { RecordLedgerTransactionDto } from '@modules/ledger/dto/ledger-transaction/record-ledger-transaction.dto';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerAccount, LedgerTransaction } from '@modules/ledger/types';

@Injectable()
export class LedgerTransactionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tigerBeetleService: TigerBeetleService,
    private readonly ledgerAccountService: LedgerAccountService,
  ) {}

  async record(data: RecordLedgerTransactionDto): Promise<LedgerTransaction> {
    const ledgerAccountIds: Set<string> = new Set([]);

    for (const entry of data.ledgerEntries) {
      ledgerAccountIds.add(entry.sourceAccountId);
      ledgerAccountIds.add(entry.destinationAccountId);
    }

    const ledgerAccounts = await this.db.kysely
      .selectFrom('ledgerAccounts')
      .selectAll()
      .where('id', 'in', Array.from(ledgerAccountIds))
      .execute();

    const ledgerAccountMap = ledgerAccounts.reduce(
      (result, account) => {
        result[account.id] = account;
        return result;
      },
      {} as Record<string, (typeof ledgerAccounts)[0]>,
    );

    for (const entryData of data.ledgerEntries) {
      const sourceAccount = ledgerAccountMap[entryData.sourceAccountId];
      const destinationAccount = ledgerAccountMap[entryData.destinationAccountId];

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

      // Make sure that we have the same currency for ledger accounts
      if (destinationAccount.currencyCode !== sourceAccount.currencyCode) {
        throw new BadRequestException([
          'sourceAccountId & destinationAccountId should have the same currency code',
        ]);
      }
    }

    const ledgers = await this.db.kysely
      .selectFrom('ledgers')
      .selectAll()
      .where('id', 'in', Array.from(new Set(ledgerAccounts.map((v) => v.ledgerId))))
      .execute();

    const tbAccounts = await this.tigerBeetleService.retrieveAccounts(
      ledgerAccounts.map((v) => v.tigerBeetleId),
    );

    const parsedLedgerAccounts: Record<string, LedgerAccount> = {};

    for (const ledgerAccount of ledgerAccounts) {
      const tbAccount = tbAccounts.find(
        (account) => account.id === bufferToTbId(ledgerAccount.tigerBeetleId),
      );
      parsedLedgerAccounts[ledgerAccount.id] = {
        ...ledgerAccount,
        balances: this.ledgerAccountService.parseAccountBalanceFromTBAccount(
          ledgerAccount,
          tbAccount!,
        ),
      };
    }

    // Parse them into transfer
    const ledgerEntryData: {
      id: string;
      ledgerId: string;
      direction: string;
      ledgerAccountId: string;
      amount: string;
      tigerBeetleId: bigint;
    }[] = [];

    const ledgerTransferTbId = id();
    const tbTransfersData: Transfer[] = [];
    for (const entry of data.ledgerEntries) {
      const sourceAccount = ledgerAccountMap[entry.sourceAccountId];
      const destinationAccount = ledgerAccountMap[entry.destinationAccountId];
      const currencyExponentMultiplier = BigNumber(10).pow(sourceAccount.currencyExponent);

      const ledger = ledgers.find((v) => v.id === sourceAccount.ledgerId)!;

      const amount = BigNumber(entry.amount).multipliedBy(currencyExponentMultiplier).toFixed();
      const data: Transfer = {
        id: id(),
        credit_account_id: bufferToTbId(destinationAccount.tigerBeetleId),
        debit_account_id: bufferToTbId(sourceAccount.tigerBeetleId),
        amount: BigInt(amount),
        user_data_128: ledgerTransferTbId,
        user_data_64: 0n,
        user_data_32: 0,
        ledger: ledger.tigerBeetleId,
        code: 1,
        flags: TransferFlags.linked,
        pending_id: 0n,
        timeout: 0,
        timestamp: 0n,
      };

      ledgerEntryData.push({
        id: uuidV7(),
        ledgerAccountId: entry.destinationAccountId,
        amount,
        tigerBeetleId: data.id,
        direction: NormalBalanceEnum.CREDIT,
        ledgerId: ledgerAccountMap[entry.destinationAccountId].ledgerId,
      });

      ledgerEntryData.push({
        id: uuidV7(),
        ledgerAccountId: entry.sourceAccountId,
        amount,
        tigerBeetleId: data.id,
        direction: NormalBalanceEnum.DEBIT,
        ledgerId: ledgerAccountMap[entry.sourceAccountId].ledgerId,
      });

      tbTransfersData.push(data);
    }

    // Remove linked flag from the latest transfer
    tbTransfersData[tbTransfersData.length - 1].flags = 0;

    return this.db.transaction(async (trx) => {
      // Create transaction record
      const ledgerTransaction = await trx
        .insertInto('ledgerTransactions')
        .values({
          externalId: data.externalId as string,
          description: data.description,
          tigerBeetleId: tbIdToBuffer(ledgerTransferTbId),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const ledgerTransactionMetadata = Object.entries(data.metadata ?? {}).map(([key, value]) => {
        return {
          ledgerTransactionId: ledgerTransaction.id,
          key,
          value,
        };
      });

      if (ledgerTransactionMetadata.length > 0)
        await trx
          .insertInto('ledgerTransactionMetadata')
          .values(ledgerTransactionMetadata)
          .execute();

      // Insert all the entries
      const entries = await trx
        .insertInto('ledgerEntries')
        .values(
          ledgerEntryData.map((v) => {
            return {
              id: v.id,
              ledgerAccountId: v.ledgerAccountId,
              ledgerId: v.ledgerId,
              ledgerTransactionId: ledgerTransaction.id,
              amount: v.amount,
              tigerBeetleId: tbIdToBuffer(v.tigerBeetleId),
              direction: v.direction,
            };
          }),
        )
        .returningAll()
        .execute();

      await this.tigerBeetleService.createTransfers(tbTransfersData);

      return {
        ...ledgerTransaction,
        metadata: ledgerTransactionMetadata,
        ledgerEntries: entries.map((entry) => {
          return {
            ...entry,
            ledgerAccount: parsedLedgerAccounts[entry.ledgerAccountId],
          };
        }),
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
        } as any,
        ledgerId: entry.ledgerId,
        ledgerTransactionId: transaction.id,
        tigerBeetleId: entry.tigerBeetleId,
        deletedAt: entry.deletedAt,
      })),
    };
  }

  async paginate(options: {
    limit?: number;
    cursor?: string;
    direction?: 'next' | 'prev';
    filters: {
      externalId?: string;
      search?: string;
      metadata?: Record<string, string>;
    };
    order?: 'asc' | 'desc';
  }): Promise<CursorPaginatedResult<LedgerTransaction>> {
    const { limit = 15, cursor, direction = 'next', order = 'desc' } = options;
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
      cursor,
      direction,
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
}
