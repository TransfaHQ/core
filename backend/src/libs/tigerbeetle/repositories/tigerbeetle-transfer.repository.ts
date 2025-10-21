import { Transaction } from 'kysely';

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';
import { DB } from '@libs/database/types';
import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';

export interface CreateTigerbeetleTransferData {
  transferId: bigint;
  debitAccountId: bigint;
  creditAccountId: bigint;
  amount: bigint;
  pendingId?: bigint;
  userData128?: bigint;
  userData64?: bigint;
  userData32?: number;
  timeout?: number;
  ledger: number;
  code: number;
  flags: number;
  timestamp?: bigint;
}

@Injectable()
export class TigerbeetleTransferRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Store a TigerBeetle transfer in the database
   */
  async createTransfer(data: CreateTigerbeetleTransferData, trx?: Transaction<DB>) {
    const queryBuilder = trx || this.db.kysely;

    return await queryBuilder
      .insertInto('tigerbeetleTransfers')
      .values({
        transferId: tbIdToBuffer(data.transferId),
        debitAccountId: tbIdToBuffer(data.debitAccountId),
        creditAccountId: tbIdToBuffer(data.creditAccountId),
        amount: data.amount.toString(),
        pendingId: data.pendingId ? tbIdToBuffer(data.pendingId) : null,
        userData128: data.userData128 ? tbIdToBuffer(data.userData128) : null,
        userData64: data.userData64 ? tbIdToBuffer(data.userData64) : null,
        userData32: data.userData32 || null,
        timeout: data.timeout || null,
        ledger: data.ledger,
        code: data.code,
        flags: data.flags,
        timestamp: data.timestamp ? tbIdToBuffer(data.timestamp) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Batch store multiple TigerBeetle transfers
   */
  async createTransfers(transfers: CreateTigerbeetleTransferData[], trx?: Transaction<DB>) {
    if (transfers.length === 0) {
      return [];
    }

    const queryBuilder = trx || this.db.kysely;

    const values = transfers.map((data) => ({
      transferId: tbIdToBuffer(data.transferId),
      debitAccountId: tbIdToBuffer(data.debitAccountId),
      creditAccountId: tbIdToBuffer(data.creditAccountId),
      amount: data.amount.toString(),
      pendingId: data.pendingId ? tbIdToBuffer(data.pendingId) : null,
      userData128: data.userData128 ? tbIdToBuffer(data.userData128) : null,
      userData64: data.userData64 ? tbIdToBuffer(data.userData64) : null,
      userData32: data.userData32 || null,
      timeout: data.timeout,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags,
      timestamp: data.timestamp ? tbIdToBuffer(data.timestamp) : null,
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
  async getAllTransfersOrdered(): Promise<
    Array<{
      transferId: string;
      debitAccountId: string;
      creditAccountId: string;
      amount: string;
      pendingId: string | null;
      userData128: string | null;
      userData64: string | null;
      userData32: number | null;
      timeout: number | null;
      ledger: number;
      code: number;
      flags: number;
      timestamp: string | null;
      createdAt: Date;
      updatedAt: Date;
      id: string;
    }>
  > {
    const transfers = await this.db.kysely
      .selectFrom('tigerbeetleTransfers')
      .selectAll()
      .orderBy('createdAt', 'asc')
      .execute();

    return transfers.map((transfer) => ({
      transferId: bufferToTbId(transfer.transferId).toString(),
      debitAccountId: bufferToTbId(transfer.debitAccountId).toString(),
      creditAccountId: bufferToTbId(transfer.creditAccountId).toString(),
      amount: transfer.amount.toString(),
      pendingId: transfer.pendingId ? bufferToTbId(transfer.pendingId).toString() : null,
      userData128: transfer.userData128 ? bufferToTbId(transfer.userData128).toString() : null,
      userData64: transfer.userData64 ? bufferToTbId(transfer.userData64).toString() : null,
      userData32: transfer.userData32,
      timeout: transfer.timeout,
      ledger: transfer.ledger,
      code: transfer.code,
      flags: transfer.flags,
      timestamp: transfer.timestamp ? bufferToTbId(transfer.timestamp).toString() : null,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      id: transfer.id,
    }));
  }
}
