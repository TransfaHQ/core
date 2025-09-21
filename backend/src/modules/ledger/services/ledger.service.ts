import { DataSource, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, Transactional, cursorPaginate } from '@libs/database';

import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
import { UpdateLedgerDto } from '@modules/ledger/dto/update-ledger.dto';
import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(LedgerEntity)
    private readonly ledgerRepository: Repository<LedgerEntity>,
    @InjectRepository(LedgerMetadataEntity)
    private readonly ledgerMetadataRepository: Repository<LedgerMetadataEntity>,
  ) {}

  @Transactional()
  async createLedger(data: CreateLedgerDto): Promise<LedgerResponseDto> {
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
    return this.toResponse(ledger);
  }

  async retrieveLedger(id: string): Promise<LedgerResponseDto> {
    const ledger = await this.ledgerRepository.findOneOrFail({
      where: { id },
      relations: ['metadata'],
    });
    return this.toResponse(ledger);
  }

  async paginate(
    limit?: number,
    cursor?: string,
  ): Promise<CursorPaginatedResult<LedgerResponseDto>> {
    const response = await cursorPaginate<LedgerEntity>({
      repo: this.ledgerRepository,
      limit,
      cursor,
      order: 'ASC',
      relations: ['metadata'],
    });

    return {
      ...response,
      data: response.data.map((v) => this.toResponse(v)),
    };
  }

  @Transactional()
  async update(id: string, data: UpdateLedgerDto): Promise<LedgerResponseDto> {
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
    return this.toResponse(updatedLedger!);
  }

  private toResponse(ledger: LedgerEntity): LedgerResponseDto {
    return {
      id: ledger.id,
      name: ledger.name,
      description: ledger.description,
      metadata: Object.fromEntries(ledger.metadata?.map((v) => [v.key, v.value])),
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
    };
  }
}
