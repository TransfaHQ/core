import { Transaction } from 'kysely';

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';
import { DB, TigerbeetleTransfers } from '@libs/database/types';

export interface CreateTigerbeetleTransferData {
  transferId: Buffer;
  debitAccountId: Buffer;
  creditAccountId: Buffer;
  amount: bigint;
  pendingId?: Buffer;
  userData128?: Buffer;
  userData64?: bigint;
  userData32?: number;
  timeout?: bigint;
  ledger: number;
  code: number;
  flags: number;
  timestamp?: bigint;
  ledgerEntryId?: string;
}

@Injectable()
export class TigerbeetleTransferRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Store a TigerBeetle transfer in the database
   */
  async createTransfer(
    data: CreateTigerbeetleTransferData,
    trx?: Transaction<DB>,
  ): Promise<TigerbeetleTransfers> {
    const queryBuilder = trx || this.db.kysely;

    return await queryBuilder
      .insertInto('tigerbeetleTransfers')
      .values({
        transferId: data.transferId,
        debitAccountId: data.debitAccountId,
        creditAccountId: data.creditAccountId,
        amount: data.amount.toString(),
        pendingId: data.pendingId || null,
        userData128: data.userData128 || null,
        userData64: data.userData64?.toString() || null,
        userData32: data.userData32 || null,
        timeout: data.timeout?.toString() || null,
        ledger: data.ledger,
        code: data.code,
        flags: data.flags,
        timestamp: data.timestamp?.toString() || null,
        ledgerEntryId: data.ledgerEntryId || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Batch store multiple TigerBeetle transfers
   */
  async createTransfers(
    transfers: CreateTigerbeetleTransferData[],
    trx?: Transaction<DB>,
  ): Promise<TigerbeetleTransfers[]> {
    if (transfers.length === 0) {
      return [];
    }

    const queryBuilder = trx || this.db.kysely;

    const values = transfers.map((data) => ({
      transferId: data.transferId,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
      amount: data.amount.toString(),
      pendingId: data.pendingId || null,
      userData128: data.userData128 || null,
      userData64: data.userData64?.toString() || null,
      userData32: data.userData32 || null,
      timeout: data.timeout?.toString() || null,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags,
      timestamp: data.timestamp?.toString() || null,
      ledgerEntryId: data.ledgerEntryId || null,
    }));

    return await queryBuilder
      .insertInto('tigerbeetleTransfers')
      .values(values)
      .returningAll()
      .execute();
  }

  /**
   * Get all transfers ordered by creation time (for replay)
   */
  async getAllTransfersOrdered(): Promise<TigerbeetleTransfers[]> {
    return await this.db.kysely
      .selectFrom('tigerbeetleTransfers')
      .selectAll()
      .orderBy('createdAt', 'asc')
      .execute();
  }

  /**
   * Get transfer by TigerBeetle ID
   */
  async getTransferById(transferId: Buffer): Promise<TigerbeetleTransfers | undefined> {
    return await this.db.kysely
      .selectFrom('tigerbeetleTransfers')
      .selectAll()
      .where('transferId', '=', transferId)
      .executeTakeFirst();
  }

  /**
   * Get transfers for a specific ledger entry
   */
  async getTransfersByLedgerEntryId(ledgerEntryId: string): Promise<TigerbeetleTransfers[]> {
    return await this.db.kysely
      .selectFrom('tigerbeetleTransfers')
      .selectAll()
      .where('ledgerEntryId', '=', ledgerEntryId)
      .orderBy('createdAt', 'asc')
      .execute();
  }
}
