import { Transaction } from 'kysely';

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';
import { DB } from '@libs/database/types';
import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';

export interface CreateTigerbeetleAccountData {
  accountId: bigint;
  debitsPosted: bigint;
  debitsPending: bigint;
  creditsPosted: bigint;
  creditsPending: bigint;
  userData128?: bigint;
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
  async createAccount(data: CreateTigerbeetleAccountData, trx?: Transaction<DB>) {
    const queryBuilder = trx || this.db.kysely;

    return await queryBuilder
      .insertInto('tigerbeetleAccounts')
      .values({
        accountId: tbIdToBuffer(data.accountId),
        debitsPosted: tbIdToBuffer(data.debitsPosted),
        debitsPending: tbIdToBuffer(data.debitsPending),
        creditsPosted: tbIdToBuffer(data.creditsPosted),
        creditsPending: tbIdToBuffer(data.creditsPending),
        userData128: data.userData128 ? tbIdToBuffer(data.userData128) : null,
        userData64: data.userData64 ? tbIdToBuffer(data.userData64) : null,
        userData32: data.userData32 || null,
        ledger: data.ledger,
        code: data.code,
        flags: data.flags,
        timestamp: data.timestamp ? tbIdToBuffer(data.timestamp) : null,
        ledgerAccountId: data.ledgerAccountId || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Batch store multiple TigerBeetle accounts
   */
  async createAccounts(accounts: CreateTigerbeetleAccountData[], trx?: Transaction<DB>) {
    if (accounts.length === 0) {
      return [];
    }

    const queryBuilder = trx || this.db.kysely;

    const values = accounts.map((data) => ({
      accountId: tbIdToBuffer(data.accountId),
      debitsPosted: tbIdToBuffer(data.debitsPosted),
      debitsPending: tbIdToBuffer(data.debitsPending),
      creditsPosted: tbIdToBuffer(data.creditsPosted),
      creditsPending: tbIdToBuffer(data.creditsPending),
      userData128: data.userData128 ? tbIdToBuffer(data.userData128) : null,
      userData64: data.userData64 ? tbIdToBuffer(data.userData64) : null,
      userData32: data.userData32 || null,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags,
      timestamp: data.timestamp ? tbIdToBuffer(data.timestamp) : null,
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
  async getAllAccountsOrdered(): Promise<
    Array<{
      accountId: string;
      debitsPosted: string;
      debitsPending: string;
      creditsPosted: string;
      creditsPending: string;
      userData128: string | null;
      userData64: string | null;
      userData32: number | null;
      ledger: number;
      code: number;
      flags: number;
      timestamp: string | null;
      ledgerAccountId: string | null;
      createdAt: Date;
      updatedAt: Date;
      id: string;
    }>
  > {
    const accounts = await this.db.kysely
      .selectFrom('tigerbeetleAccounts')
      .selectAll()
      .orderBy('createdAt', 'asc')
      .execute();

    return accounts.map((account) => ({
      accountId: bufferToTbId(account.accountId).toString(),
      debitsPosted: bufferToTbId(account.debitsPosted).toString(),
      debitsPending: bufferToTbId(account.debitsPending).toString(),
      creditsPosted: bufferToTbId(account.creditsPosted).toString(),
      creditsPending: bufferToTbId(account.creditsPending).toString(),
      userData128: account.userData128 ? bufferToTbId(account.userData128).toString() : null,
      userData64: account.userData64 ? bufferToTbId(account.userData64).toString() : null,
      userData32: account.userData32,
      ledger: account.ledger,
      code: account.code,
      flags: account.flags,
      timestamp: account.timestamp ? bufferToTbId(account.timestamp).toString() : null,
      ledgerAccountId: account.ledgerAccountId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      id: account.id,
    }));
  }
}
