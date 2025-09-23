import { In, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, Transactional, cursorPaginate } from '@libs/database';
import { uuidV7 } from '@libs/utils/uuid';

import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { UpdateLedgerDto } from '@modules/ledger/dto/update-ledger.dto';
import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntity)
    private readonly ledgerRepository: Repository<LedgerEntity>,
    @InjectRepository(LedgerMetadataEntity)
    private readonly ledgerMetadataRepository: Repository<LedgerMetadataEntity>,
  ) {}

  @Transactional()
  async createLedger(data: CreateLedgerDto): Promise<LedgerEntity> {
    const ledger = this.ledgerRepository.create({
      id: uuidV7(),
      name: data.name,
      description: data.description,
    });

    await this.ledgerRepository.insert(ledger);
    const metadata: LedgerMetadataEntity[] = Object.entries(data.metadata ?? {}).map(
      ([key, value]) => {
        return this.ledgerMetadataRepository.create({ ledger, key, value, id: uuidV7() });
      },
    );

    if (metadata.length > 0) await this.ledgerMetadataRepository.insert(metadata);

    ledger.metadata = metadata;
    return ledger;
  }

  async retrieveLedger(id: string): Promise<LedgerEntity> {
    return this.ledgerRepository
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.metadata', 'metadata')
      .where('l.id = :id', { id })
      .getOneOrFail();
  }

  async paginate(limit?: number, cursor?: string): Promise<CursorPaginatedResult<LedgerEntity>> {
    return cursorPaginate<LedgerEntity>({
      repo: this.ledgerRepository,
      limit,
      cursor,
      order: 'ASC',
      relations: ['metadata'],
    });
  }

  @Transactional()
  async update(id: string, data: UpdateLedgerDto): Promise<LedgerEntity> {
    const ledger = await this.ledgerRepository
      .createQueryBuilder('l')
      .where('l.id = :id', { id })
      .getOneOrFail();

    ledger.name = data.name ?? ledger.name;
    ledger.description = data.description ?? ledger.description;
    await this.ledgerRepository.update({ id }, ledger);
    const metadataKeyToDelete: string[] = [];
    const metadataToUpdate: LedgerMetadataEntity[] = [];

    for (const [key, value] of Object.entries(data.metadata ?? {})) {
      if (value === null || value === undefined || !value) {
        metadataKeyToDelete.push(key);
      } else {
        metadataToUpdate.push(
          this.ledgerMetadataRepository.create({
            ledger: { id },
            key: key,
            value: value,
          }),
        );
      }
    }

    if (metadataKeyToDelete.length) {
      await this.ledgerMetadataRepository.delete({
        ledger: { id },
        key: In(metadataKeyToDelete),
      });
    }

    // Upsert metadata (update if exists, create if not)
    if (metadataToUpdate.length > 0) {
      await this.ledgerMetadataRepository.upsert(metadataToUpdate, ['ledger', 'key']);
    }

    return this.ledgerRepository
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.metadata', 'metadata')
      .where('l.id = :id', { id })
      .getOneOrFail();
  }
}
