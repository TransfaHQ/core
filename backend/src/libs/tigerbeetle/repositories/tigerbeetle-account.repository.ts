import { Transaction } from 'kysely';

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';
import { DB, TigerbeetleAccounts } from '@libs/database/types';

export interface CreateTigerbeetleAccountData {
  accountId: Buffer;
  debitsPosted: bigint;
  debitsPending: bigint;
  creditsPosted: bigint;
  creditsPending: bigint;
  userData128?: Buffer;
  userData64?: bigint;
  userData32?: number;
  ledger: number;
  code: number;
  flags: number;
  timestamp?: bigint;
  ledgerAccountId?: string;
}

@Injectable()
export class TigerbeetleAccountRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Store a TigerBeetle account in the database
   */
  async createAccount(
    data: CreateTigerbeetleAccountData,
    trx?: Transaction<DB>,
  ): Promise<TigerbeetleAccounts> {
    const queryBuilder = trx || this.db.kysely;

    return await queryBuilder
      .insertInto('tigerbeetleAccounts')
      .values({
        accountId: data.accountId,
        debitsPosted: data.debitsPosted.toString(),
        debitsPending: data.debitsPending.toString(),
        creditsPosted: data.creditsPosted.toString(),
        creditsPending: data.creditsPending.toString(),
        userData128: data.userData128 || null,
        userData64: data.userData64?.toString() || null,
        userData32: data.userData32 || null,
        ledger: data.ledger,
        code: data.code,
        flags: data.flags,
        timestamp: data.timestamp?.toString() || null,
        ledgerAccountId: data.ledgerAccountId || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Batch store multiple TigerBeetle accounts
   */
  async createAccounts(
    accounts: CreateTigerbeetleAccountData[],
    trx?: Transaction<DB>,
  ): Promise<TigerbeetleAccounts[]> {
    if (accounts.length === 0) {
      return [];
    }

    const queryBuilder = trx || this.db.kysely;

    const values = accounts.map((data) => ({
      accountId: data.accountId,
      debitsPosted: data.debitsPosted.toString(),
      debitsPending: data.debitsPending.toString(),
      creditsPosted: data.creditsPosted.toString(),
      creditsPending: data.creditsPending.toString(),
      userData128: data.userData128 || null,
      userData64: data.userData64?.toString() || null,
      userData32: data.userData32 || null,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags,
      timestamp: data.timestamp?.toString() || null,
      ledgerAccountId: data.ledgerAccountId || null,
    }));

    return await queryBuilder
      .insertInto('tigerbeetleAccounts')
      .values(values)
      .returningAll()
      .execute();
  }

  /**
   * Get all accounts ordered by creation time (for replay)
   */
  async getAllAccountsOrdered(): Promise<TigerbeetleAccounts[]> {
    return await this.db.kysely
      .selectFrom('tigerbeetleAccounts')
      .selectAll()
      .orderBy('createdAt', 'asc')
      .execute();
  }

  /**
   * Get account by TigerBeetle ID
   */
  async getAccountById(accountId: Buffer): Promise<TigerbeetleAccounts | undefined> {
    return await this.db.kysely
      .selectFrom('tigerbeetleAccounts')
      .selectAll()
      .where('accountId', '=', accountId)
      .executeTakeFirst();
  }

  /**
   * Get account by ledger account ID
   */
  async getAccountByLedgerAccountId(
    ledgerAccountId: string,
  ): Promise<TigerbeetleAccounts | undefined> {
    return await this.db.kysely
      .selectFrom('tigerbeetleAccounts')
      .selectAll()
      .where('ledgerAccountId', '=', ledgerAccountId)
      .executeTakeFirst();
  }
}
