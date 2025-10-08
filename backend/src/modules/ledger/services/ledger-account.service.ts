import BigNumber from 'bignumber.js';
import { Selectable } from 'kysely';
import { AccountFlags, Account as TigerBeetleAccount, id } from 'tigerbeetle-node';
import { validate } from 'uuid';

import { Injectable } from '@nestjs/common';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';
import { DatabaseService } from '@libs/database/database.service';
import { LedgerAccounts } from '@libs/database/types';
import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';
import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';

import { CreateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/update-ledger-account.dto';

import { LedgerAccount, LedgerAccountBalances } from '../types';

@Injectable()
export class LedgerAccountService {
  constructor(
    private readonly tigerBeetleService: TigerBeetleService,
    private readonly db: DatabaseService,
  ) {}

  async createLedgerAccount(data: CreateLedgerAccountDto): Promise<LedgerAccount> {
    return this.db.transaction(async (trx) => {
      const ledger = await trx
        .selectFrom('ledgers')
        .where('id', '=', data.ledgerId)
        .selectAll()
        .executeTakeFirstOrThrow();

      const currency = await trx
        .selectFrom('currencies')
        .where('code', '=', data.currency)
        .selectAll()
        .executeTakeFirstOrThrow();

      const account = await trx
        .insertInto('ledgerAccounts')
        .values({
          ledgerId: data.ledgerId,
          name: data.name,
          currencyCode: data.currency,
          description: data.description,
          externalId: data.externalId,
          normalBalance: data.normalBalance,
          tigerBeetleId: tbIdToBuffer(id()),
          currencyExponent: currency.exponent,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const metadata = await Promise.all(
        Object.entries(data.metadata ?? {}).map(async ([key, value]) => {
          const data = {
            ledgerAccountId: account.id,
            key,
            value,
          };
          await trx.insertInto('ledgerAccountMetadata').values(data).executeTakeFirstOrThrow();
          return {
            key,
            value,
          };
        }),
      );

      // Create account on tigerbeetle and save it
      const tbAccount = await this.tigerBeetleService.createAccount({
        id: bufferToTbId(account.tigerBeetleId),
        debits_pending: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        debits_posted: 0n,
        ledger: ledger.tigerBeetleId,
        timestamp: 0n,
        reserved: 0,
        flags:
          account.normalBalance === NormalBalanceEnum.CREDIT
            ? AccountFlags.debits_must_not_exceed_credits
            : AccountFlags.credits_must_not_exceed_debits,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: account.normalBalance === NormalBalanceEnum.CREDIT ? 1 : 0, // account normal balance
        code: currency.id,
      });

      const balances = this.parseAccountBalanceFromTBAccount(account, tbAccount);
      return {
        ...account,
        metadata,
        balances,
      };
    });
  }

  async retrieveLedgerAccount(id: string): Promise<LedgerAccount> {
    const response = await this.db.kysely
      .selectFrom('ledgerAccounts')
      .selectAll()
      .where((eb) => {
        if (validate(id)) {
          return eb('id', '=', id).or('externalId', '=', id);
        }
        return eb('externalId', '=', id);
      })
      .executeTakeFirstOrThrow();

    const metadata = await this.db.kysely
      .selectFrom('ledgerAccountMetadata')
      .select(['key', 'value'])
      .where('ledgerAccountId', '=', response.id)
      .execute();
    const tbAccount = await this.tigerBeetleService.retrieveAccount(response.tigerBeetleId);
    const balances = this.parseAccountBalanceFromTBAccount(response, tbAccount);

    return {
      ...response,
      metadata,
      balances,
    };
  }

  async paginate(options: {
    limit?: number;
    cursor?: string;
    direction?: 'next' | 'prev';
    filters: {
      ledgerId?: string;
      currency?: string;
      normalBalance?: string;
      search?: string;
      metadata?: Record<string, string>;
      ids?: string[];
    };
    order?: 'asc' | 'desc';
  }): Promise<CursorPaginatedResult<LedgerAccount>> {
    const {
      limit = 15,
      cursor,
      direction = 'next',

      order = 'desc',
    } = options;
    const { ledgerId, currency, normalBalance, search, metadata, ids } = options.filters;

    // Build base query with filters
    let baseQuery = this.db.kysely.selectFrom('ledgerAccounts');

    // Apply filters
    if (ledgerId) {
      baseQuery = baseQuery.where('ledgerId', '=', ledgerId);
    }
    if (currency) {
      baseQuery = baseQuery.where('currencyCode', '=', currency);
    }
    if (normalBalance) {
      baseQuery = baseQuery.where('normalBalance', '=', normalBalance);
    }

    if (ids && ids?.length > 0) {
      baseQuery = baseQuery.where('id', 'in', ids);
    }

    if (search) {
      baseQuery = baseQuery.where((eb) =>
        eb('name', 'ilike', `%${search}%`)
          .or('description', 'ilike', `%${search}%`)
          .or('externalId', 'ilike', `%${search}%`),
      );
    }

    Object.entries(metadata ?? {}).forEach(([key, value]) => {
      baseQuery = baseQuery.where((eb) =>
        eb.exists(
          eb
            .selectFrom('ledgerAccountMetadata')
            .select('id')
            .where('ledgerAccountMetadata.ledgerAccountId', '=', eb.ref('ledgerAccounts.id'))
            .where('ledgerAccountMetadata.key', '=', key)
            .where('ledgerAccountMetadata.value', '=', value),
        ),
      );
    });

    // Get all fields for the accounts
    const queryWithSelect = baseQuery.selectAll();

    // Use cursor pagination utility
    const paginatedResult = await cursorPaginate({
      qb: queryWithSelect,
      limit,
      cursor,
      direction,
      initialOrder: order,
    });

    // If no data, return early
    if (paginatedResult.data.length === 0) {
      return {
        ...paginatedResult,
        data: [],
      };
    }

    // Get TigerBeetle accounts for balance calculation
    const tbAccounts = await this.tigerBeetleService.retrieveAccounts(
      paginatedResult.data.map((v) => v.tigerBeetleId),
    );

    // Fetch metadata for accounts (if needed in the future)
    const accountIds = paginatedResult.data.map((account) => account.id);
    const metadataResults = await this.db.kysely
      .selectFrom('ledgerAccountMetadata')
      .select(['ledgerAccountId', 'key', 'value'])
      .where('ledgerAccountId', 'in', accountIds)
      .execute();

    // Group metadata by account ID
    const metadataByAccountId = metadataResults.reduce(
      (acc, meta) => {
        if (!acc[meta.ledgerAccountId]) {
          acc[meta.ledgerAccountId] = [];
        }
        acc[meta.ledgerAccountId].push({ key: meta.key, value: meta.value });
        return acc;
      },
      {} as Record<string, Array<{ key: string; value: string }>>,
    );

    // Combine accounts with their balances and metadata
    const data = paginatedResult.data.map((entity) => {
      const tbAccount = tbAccounts.find(
        (account) => account.id === bufferToTbId(entity.tigerBeetleId),
      );
      const balances = tbAccount
        ? this.parseAccountBalanceFromTBAccount(entity, tbAccount)
        : {
            pendingBalance: {
              credits: 0,
              debits: 0,
              amount: 0,
              currency: entity.currencyCode,
              currencyExponent: entity.currencyExponent,
            },
            postedBalance: {
              credits: 0,
              debits: 0,
              amount: 0,
              currency: entity.currencyCode,
              currencyExponent: entity.currencyExponent,
            },
            avalaibleBalance: {
              credits: 0,
              debits: 0,
              amount: 0,
              currency: entity.currencyCode,
              currencyExponent: entity.currencyExponent,
            },
          };

      return {
        ...entity,
        balances,
        metadata: metadataByAccountId[entity.id] || [],
      };
    });

    return {
      ...paginatedResult,
      data,
    };
  }

  async update(id: string, data: UpdateLedgerAccountDto): Promise<LedgerAccount> {
    return await this.db.transaction(async (trx) => {
      // Update ledger account basic information
      const updatePayload = {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      };

      if (Object.keys(updatePayload).length > 0) {
        await trx.updateTable('ledgerAccounts').set(updatePayload).where('id', '=', id).execute();
      }

      // Handle metadata updates
      if (data.metadata) {
        const metadataKeyToDelete: string[] = [];
        const metadataToUpsert: Array<{ key: string; value: string }> = [];

        for (const [key, value] of Object.entries(data.metadata)) {
          if (value === null || value === undefined || !value) {
            metadataKeyToDelete.push(key);
          } else {
            metadataToUpsert.push({ key, value });
          }
        }

        // Delete metadata entries with null/undefined/empty values
        if (metadataKeyToDelete.length > 0) {
          await trx
            .deleteFrom('ledgerAccountMetadata')
            .where('ledgerAccountId', '=', id)
            .where('key', 'in', metadataKeyToDelete)
            .execute();
        }

        // Upsert metadata entries
        for (const { key, value } of metadataToUpsert) {
          await trx
            .insertInto('ledgerAccountMetadata')
            .values({
              ledgerAccountId: id,
              key,
              value,
            })
            .onConflict((oc) =>
              oc.columns(['ledgerAccountId', 'key']).doUpdateSet({
                value,
              }),
            )
            .execute();
        }
      }

      // Fetch the updated ledger account with metadata
      const updatedAccount = await trx
        .selectFrom('ledgerAccounts')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirstOrThrow();

      const metadata = await trx
        .selectFrom('ledgerAccountMetadata')
        .select(['key', 'value'])
        .where('ledgerAccountId', '=', id)
        .execute();

      // Get TigerBeetle account for balance calculation
      const tbAccount = await this.tigerBeetleService.retrieveAccount(updatedAccount.tigerBeetleId);
      const balances = this.parseAccountBalanceFromTBAccount(updatedAccount, tbAccount);

      return {
        ...updatedAccount,
        metadata,
        balances,
      };
    });
  }

  public parseAccountBalanceFromTBAccount(
    entity: Selectable<LedgerAccounts>,
    tbAccount: TigerBeetleAccount,
  ): LedgerAccountBalances {
    const pendingDebit = BigNumber(tbAccount.debits_pending).toNumber();

    const pendingCredit = BigNumber(tbAccount.credits_pending).toNumber();

    const postedDebit = BigNumber(tbAccount.debits_posted).toNumber();

    const postedCredit = BigNumber(tbAccount.credits_posted).toNumber();

    return computeBalancesAmount(entity, {
      pendingCredit,
      pendingDebit,
      postedCredit,
      postedDebit,
    });
  }
}

export const computeBalancesAmount = (
  account: LedgerAccount | Selectable<LedgerAccounts>,
  balances: {
    pendingCredit: number;
    pendingDebit: number;
    postedCredit: number;
    postedDebit: number;
  },
): LedgerAccountBalances => {
  const { pendingCredit, pendingDebit, postedCredit, postedDebit } = balances;

  let pendingAmount = 0;

  let postedAmount = 0;

  let availableAmount = 0;

  /** Debit available is sum of pending + post on the account */
  const availableDebit = BigNumber(postedDebit).plus(pendingDebit).toNumber();

  if (account.normalBalance === NormalBalanceEnum.CREDIT) {
    pendingAmount = BigNumber(pendingCredit).minus(pendingDebit).toNumber();

    postedAmount = BigNumber(postedCredit).minus(postedDebit).toNumber();
    /**
     * available amount is posted credit minus available debit
     */
    availableAmount = BigNumber(postedCredit).minus(availableDebit).toNumber();
  } else {
    pendingAmount = BigNumber(pendingDebit).minus(pendingCredit).toNumber();

    postedAmount = BigNumber(postedDebit).minus(postedCredit).toNumber();

    /**
     * the available amount is posted debit minus sum of posted credit + pending credit
     */
    availableAmount = BigNumber(postedDebit)
      .minus(BigNumber(postedCredit).plus(pendingCredit))
      .toNumber();
  }

  // Convert from smallest units to decimals
  const divisor = Math.pow(10, account.currencyExponent);
  const decimalPendingCredit = pendingCredit / divisor;
  const decimalPendingDebit = pendingDebit / divisor;
  const decimalPostedCredit = postedCredit / divisor;
  const decimalPostedDebit = postedDebit / divisor;
  const decimalPendingAmount = pendingAmount / divisor;
  const decimalPostedAmount = postedAmount / divisor;
  const decimalAvailableAmount = availableAmount / divisor;
  const decimalAvailableDebit = availableDebit / divisor;

  return {
    pendingBalance: {
      credits: decimalPendingCredit,
      debits: decimalPendingDebit,
      amount: decimalPendingAmount,
      currency: account.currencyCode,
      currencyExponent: account.currencyExponent,
    },
    postedBalance: {
      credits: decimalPostedCredit,
      debits: decimalPostedDebit,
      amount: decimalPostedAmount,
      currency: account.currencyCode,
      currencyExponent: account.currencyExponent,
    },
    avalaibleBalance: {
      credits: decimalPostedCredit,
      debits: decimalAvailableDebit,
      amount: decimalAvailableAmount,
      currency: account.currencyCode,
      currencyExponent: account.currencyExponent,
    },
  };
};
