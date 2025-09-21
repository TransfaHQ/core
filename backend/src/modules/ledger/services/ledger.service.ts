import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, Transactional, cursorPaginate } from '@libs/database';

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
    const entity = this.ledgerRepository.create({
      name: data.name,
      description: data.description,
    });

    const ledger = await this.ledgerRepository.save(entity);
    const metadata: LedgerMetadataEntity[] = Object.entries(data.metadata ?? {}).map(
      ([key, value]) => {
        return this.ledgerMetadataRepository.create({ ledger, key, value });
      },
    );

    if (metadata.length > 0) await this.ledgerMetadataRepository.save(metadata);

    ledger.metadata = metadata;
    return ledger;
  }

  async retrieveLedger(id: string): Promise<LedgerEntity> {
    return this.ledgerRepository.findOneOrFail({
      where: { id },
      relations: ['metadata'],
    });
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
    const ledger = await this.ledgerRepository.findOneOrFail({
      where: { id },
      relations: ['metadata'],
    });

    ledger.name = data.name ?? ledger.name;
    ledger.description = data.description ?? ledger.description;
    await this.ledgerRepository.save(ledger);

    for (const [key, value] of Object.entries(data.metadata ?? {})) {
      if (value === null || value === undefined) {
        // Remove metadata where value is null
        await this.ledgerMetadataRepository.delete({
          ledger: { id },
          key: key,
        });
      } else {
        // Upsert metadata (update if exists, create if not)
        await this.ledgerMetadataRepository.upsert(
          {
            ledger: { id },
            key: key,
            value: value,
          },
          ['ledger', 'key'],
        );
      }
    }

    const updatedLedger = await this.ledgerRepository.findOne({
      where: { id },
      relations: ['metadata'],
    });
    return updatedLedger!;
  }
}
