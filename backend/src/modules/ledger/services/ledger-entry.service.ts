import { Selectable } from 'kysely';

import { Injectable } from '@nestjs/common';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';
import { DatabaseService } from '@libs/database/database.service';
import { LedgerAccounts, LedgerTransactions } from '@libs/database/types';
import { NormalBalanceEnum } from '@libs/enums';

import { Metadata } from '@modules/ledger/types';

export type LedgerEntryResponse = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  amount: string;
  direction: string;
  ledgerId: string;
  ledgerAccount: Selectable<LedgerAccounts>;
  ledgerTransaction: Selectable<LedgerTransactions>;
  currency: {
    code: string;
    exponent: number;
  };
  deletedAt: Date | null;
  metadata: Metadata[];
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
  }): Promise<CursorPaginatedResult<LedgerEntryResponse>> {
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

    const entryIds = Array.from(new Set(paginatedResult.data.map((entry) => entry.id)));

    const accountIds = Array.from(
      new Set(paginatedResult.data.map((entry) => entry.ledgerAccountId)),
    );
    const accounts = await this.db.kysely
      .selectFrom('ledgerAccounts')
      .selectAll()
      .where('id', 'in', accountIds)
      .execute();

    const accountMap = accounts.reduce(
      (acc, account) => {
        acc[account.id] = account;
        return acc;
      },
      {} as Record<string, Selectable<LedgerAccounts>>,
    );

    // Fetch transaction external IDs
    const transactionIds = Array.from(
      new Set(paginatedResult.data.map((entry) => entry.ledgerTransactionId)),
    );
    const transactions = await this.db.kysely
      .selectFrom('ledgerTransactions')
      .selectAll()
      .where('id', 'in', transactionIds)
      .execute();

    const transactionMap = transactions.reduce(
      (acc, transaction) => {
        acc[transaction.id] = transaction;
        return acc;
      },
      {} as Record<string, Selectable<LedgerTransactions>>,
    );

    // Fetch metadata for entries (if needed in the future)
    const metadataResults = await this.db.kysely
      .selectFrom('ledgerEntryMetadata')
      .select(['ledgerEntryId', 'key', 'value'])
      .where('ledgerEntryId', 'in', entryIds)
      .execute();

    // Group metadata by entry ID
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

    const data: LedgerEntryResponse[] = paginatedResult.data.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      amount: entry.amount,
      direction: entry.direction,
      ledgerId: entry.ledgerId,
      ledgerAccount: accountMap[entry.ledgerAccountId],
      ledgerTransaction: transactionMap[entry.ledgerTransactionId],
      deletedAt: entry.deletedAt,
      currency: {
        code: accountMap[entry.ledgerAccountId].currencyCode,
        exponent: accountMap[entry.ledgerAccountId].currencyExponent,
      },
      metadata: metadataByEntryId[entry.id] || [],
    }));

    return {
      ...paginatedResult,
      data,
    };
  }
}
