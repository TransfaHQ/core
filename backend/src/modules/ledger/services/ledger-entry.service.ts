import { Injectable } from '@nestjs/common';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';
import { DatabaseService } from '@libs/database/database.service';
import { NormalBalanceEnum } from '@libs/enums';

export type LedgerEntryWithAccount = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  amount: string;
  direction: string;
  ledgerId: string;
  ledgerTransactionId: string;
  ledgerAccountId: string;
  currencyCode: string;
  currencyExponent: number;
  accountName: string;
  transactionExternalId: string;
  deletedAt: Date | null;
};

@Injectable()
export class LedgerEntryService {
  constructor(private readonly db: DatabaseService) {}

  async paginate(options: {
    limit?: number;
    cursor?: string;
    direction?: 'next' | 'prev';
    filters: {
      ledgerId?: string;
      transactionId?: string;
      transactionExternalId?: string;
      accountId?: string;
      accountExternalId?: string;
      direction?: NormalBalanceEnum;
    };
    order?: 'asc' | 'desc';
  }): Promise<CursorPaginatedResult<LedgerEntryWithAccount>> {
    const { limit = 15, cursor, direction = 'next', order = 'desc' } = options;
    const {
      ledgerId,
      transactionId,
      transactionExternalId,
      accountId,
      accountExternalId,
      direction: entryDirection,
    } = options.filters;

    let baseQuery = this.db.kysely.selectFrom('ledgerEntries');

    if (ledgerId) {
      baseQuery = baseQuery.where('ledgerId', '=', ledgerId);
    }

    if (transactionId) {
      baseQuery = baseQuery.where('ledgerTransactionId', '=', transactionId);
    }

    if (transactionExternalId) {
      baseQuery = baseQuery.where('ledgerTransactionId', 'in', (eb) =>
        eb
          .selectFrom('ledgerTransactions')
          .select('id')
          .where('externalId', '=', transactionExternalId),
      );
    }

    if (accountId) {
      baseQuery = baseQuery.where('ledgerAccountId', '=', accountId);
    }

    if (accountExternalId) {
      baseQuery = baseQuery.where('ledgerAccountId', 'in', (eb) =>
        eb.selectFrom('ledgerAccounts').select('id').where('externalId', '=', accountExternalId),
      );
    }

    if (entryDirection) {
      baseQuery = baseQuery.where('direction', '=', entryDirection);
    }

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

    // Fetch account information (currency and name)
    const accountIds = Array.from(
      new Set(paginatedResult.data.map((entry) => entry.ledgerAccountId)),
    );
    const accounts = await this.db.kysely
      .selectFrom('ledgerAccounts')
      .select(['id', 'currencyCode', 'currencyExponent', 'name'])
      .where('id', 'in', accountIds)
      .execute();

    const accountMap = accounts.reduce(
      (acc, account) => {
        acc[account.id] = {
          currencyCode: account.currencyCode,
          currencyExponent: account.currencyExponent,
          name: account.name,
        };
        return acc;
      },
      {} as Record<string, { currencyCode: string; currencyExponent: number; name: string }>,
    );

    // Fetch transaction external IDs
    const transactionIds = Array.from(
      new Set(paginatedResult.data.map((entry) => entry.ledgerTransactionId)),
    );
    const transactions = await this.db.kysely
      .selectFrom('ledgerTransactions')
      .select(['id', 'externalId'])
      .where('id', 'in', transactionIds)
      .execute();

    const transactionMap = transactions.reduce(
      (acc, transaction) => {
        acc[transaction.id] = transaction.externalId;
        return acc;
      },
      {} as Record<string, string>,
    );

    const data: LedgerEntryWithAccount[] = paginatedResult.data.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      amount: entry.amount,
      direction: entry.direction,
      ledgerId: entry.ledgerId,
      ledgerTransactionId: entry.ledgerTransactionId,
      ledgerAccountId: entry.ledgerAccountId,
      deletedAt: entry.deletedAt,
      currencyCode: accountMap[entry.ledgerAccountId].currencyCode,
      currencyExponent: accountMap[entry.ledgerAccountId].currencyExponent,
      accountName: accountMap[entry.ledgerAccountId].name,
      transactionExternalId: transactionMap[entry.ledgerTransactionId],
    }));

    return {
      ...paginatedResult,
      data,
    };
  }
}
