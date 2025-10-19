import { Injectable } from '@nestjs/common';

import { API_PAGE_SIZE } from '@libs/constants';
import { CursorPaginatedResult, CursorPaginationRequest, cursorPaginate } from '@libs/database';
import { DatabaseService } from '@libs/database/database.service';

import { CreateLedgerDto } from '@modules/ledger/dto/ledger/create-ledger.dto';
import { UpdateLedgerDto } from '@modules/ledger/dto/ledger/update-ledger.dto';

import { Ledger } from '../types';

@Injectable()
export class LedgerService {
  constructor(private readonly db: DatabaseService) {}

  async createLedger(data: CreateLedgerDto): Promise<Ledger> {
    return await this.db.transaction(async (trx) => {
      const ledger = await trx
        .insertInto('ledgers')
        .values({
          name: data.name,
          description: data.description,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const metadataEntries = Object.entries(data.metadata ?? {}).map(([key, value]) => ({
        ledgerId: ledger.id,
        key,
        value,
      }));

      if (metadataEntries.length > 0) {
        await trx.insertInto('ledgerMetadata').values(metadataEntries).execute();
      }

      return { ...ledger, metadata: metadataEntries };
    });
  }

  async retrieveLedger(id: string): Promise<Ledger> {
    const ledger = await this.db.kysely
      .selectFrom('ledgers')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirstOrThrow();

    const metadata = await this.db.kysely
      .selectFrom('ledgerMetadata')
      .select(['key', 'value'])
      .where('ledgerId', '=', id)
      .execute();

    return {
      ...ledger,
      metadata,
    };
  }

  async paginate(
    options: CursorPaginationRequest<undefined>,
  ): Promise<CursorPaginatedResult<Ledger>> {
    const { limit = API_PAGE_SIZE, beforeCursor, afterCursor, order = 'desc' } = options;

    // Get paginated ledgers using the new utility
    const baseQuery = this.db.kysely.selectFrom('ledgers').selectAll();
    const paginatedResult = await cursorPaginate({
      qb: baseQuery,
      limit,
      afterCursor: afterCursor,
      beforeCursor: beforeCursor,
      initialOrder: order,
    });

    // If no data, return early
    if (paginatedResult.data.length === 0) {
      return {
        ...paginatedResult,
        data: [],
      };
    }

    // Fetch metadata for all ledgers
    const ledgerIds = paginatedResult.data.map((ledger) => ledger.id);
    const metadata = await this.db.kysely
      .selectFrom('ledgerMetadata')
      .select(['ledgerId', 'key', 'value'])
      .where('ledgerId', 'in', ledgerIds)
      .execute();

    // Group metadata by ledger ID
    const metadataByLedgerId = metadata.reduce(
      (acc, meta) => {
        if (!acc[meta.ledgerId]) {
          acc[meta.ledgerId] = [];
        }
        acc[meta.ledgerId].push({ key: meta.key, value: meta.value });
        return acc;
      },
      {} as Record<string, Array<{ key: string; value: string }>>,
    );

    // Combine ledgers with their metadata
    const data = paginatedResult.data.map((ledger) => ({
      ...ledger,
      metadata: metadataByLedgerId[ledger.id] || [],
    }));

    return {
      ...paginatedResult,
      data,
    };
  }

  async update(id: string, data: UpdateLedgerDto): Promise<Ledger> {
    return await this.db.transaction(async (trx) => {
      // Update ledger basic information
      const updatePayload = {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      };
      if (Object.keys(updatePayload).length > 0) {
        await trx
          .updateTable('ledgers')
          .set(updatePayload)
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirstOrThrow();
      }

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
            .deleteFrom('ledgerMetadata')
            .where('ledgerId', '=', id)
            .where('key', 'in', metadataKeyToDelete)
            .execute();
        }

        // Upsert metadata entries
        for (const { key, value } of metadataToUpsert) {
          await trx
            .insertInto('ledgerMetadata')
            .values({
              ledgerId: id,
              key,
              value,
            })
            .onConflict((oc) =>
              oc.columns(['ledgerId', 'key']).doUpdateSet({
                value,
              }),
            )
            .execute();
        }
      }

      // Fetch the updated ledger with metadata
      const metadata = await trx
        .selectFrom('ledgerMetadata')
        .select(['key', 'value'])
        .where('ledgerId', '=', id)
        .execute();

      const updatedLedger = await trx
        .selectFrom('ledgers')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      return {
        ...updatedLedger,
        metadata,
      };
    });
  }
}
