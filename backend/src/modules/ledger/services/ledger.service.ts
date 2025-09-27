import { EntityRepository, Transactional } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';
import { uuidV7 } from '@libs/utils/uuid';

import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { UpdateLedgerDto } from '@modules/ledger/dto/update-ledger.dto';
import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntity)
    private readonly ledgerRepository: EntityRepository<LedgerEntity>,
    @InjectRepository(LedgerMetadataEntity)
    private readonly ledgerMetadataRepository: EntityRepository<LedgerMetadataEntity>,
    private readonly em: EntityManager,
  ) {}

  @Transactional()
  async createLedger(data: CreateLedgerDto): Promise<LedgerEntity> {
    const ledger = new LedgerEntity();
    ledger.id = uuidV7();
    ledger.name = data.name;
    ledger.description = data.description;

    await this.em.persistAndFlush(ledger);

    const metadata: LedgerMetadataEntity[] = Object.entries(data.metadata ?? {}).map(
      ([key, value]) => {
        const meta = new LedgerMetadataEntity();
        meta.id = uuidV7();
        meta.key = key;
        meta.value = value;
        meta.ledger = ledger;
        return meta;
      },
    );

    if (metadata.length > 0) {
      metadata.forEach((m) => this.em.persist(m));
      await this.em.flush();
    }

    await this.em.refresh(ledger);
    return ledger;
  }

  async retrieveLedger(id: string): Promise<LedgerEntity> {
    return this.ledgerRepository.findOneOrFail({ id }, { populate: ['metadata'] });
  }

  async paginate(limit?: number, cursor?: string): Promise<CursorPaginatedResult<LedgerEntity>> {
    const qb = this.em.qb(LedgerEntity, 'l').leftJoinAndSelect('l.metadata', 'm');
    return cursorPaginate<LedgerEntity>({
      qb,
      limit,
      cursor,
      order: 'ASC',
    });
  }

  @Transactional()
  async update(id: string, data: UpdateLedgerDto): Promise<LedgerEntity> {
    const ledger = await this.ledgerRepository.findOneOrFail({ id });

    ledger.name = data.name ?? ledger.name;
    ledger.description = data.description ?? ledger.description;

    const metadataKeyToDelete: string[] = [];
    const metadataToUpdate: LedgerMetadataEntity[] = [];

    for (const [key, value] of Object.entries(data.metadata ?? {})) {
      if (value === null || value === undefined || !value) {
        metadataKeyToDelete.push(key);
      } else {
        const meta = new LedgerMetadataEntity();
        meta.key = key;
        meta.value = value;
        meta.ledger = ledger;
        metadataToUpdate.push(meta);
      }
    }

    if (metadataKeyToDelete.length) {
      await this.ledgerMetadataRepository.nativeDelete({
        ledger: { id },
        key: { $in: metadataKeyToDelete },
      });
    }

    // Upsert metadata (update if exists, create if not)
    if (metadataToUpdate.length > 0) {
      await this.em.upsertMany(LedgerMetadataEntity, metadataToUpdate, {
        onConflictFields: ['ledger', 'key'],
      });
    }

    await this.em.flush();

    return this.ledgerRepository.findOneOrFail({ id }, { populate: ['metadata'] });
  }
}
