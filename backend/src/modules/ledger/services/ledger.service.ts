import { DataSource, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';

import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { UpdateLedgerDto } from '@modules/ledger/dto/update-ledger.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
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

  async createLedger(data: CreateLedgerDto): Promise<LedgerResponseDto> {
    const entity = this.ledgerRepository.create({
      name: data.name,
      description: data.description,
    });

    const ledger = await this.ledgerRepository.save(entity);
    const metadata: LedgerMetadataEntity[] = [];

    if (data.metadata && data.metadata.length > 0) {
      data.metadata.map((v) => {
        metadata.push(this.ledgerMetadataRepository.create({ ledger, key: v.key, value: v.value }));
      });
    }
    await this.ledgerMetadataRepository.save(metadata);
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

  async updateLedger(id: string, data: UpdateLedgerDto): Promise<LedgerResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      const ledger = await manager.findOneOrFail(LedgerEntity, {
        where: { id },
        relations: ['metadata'],
      });

      if (data.name !== undefined) {
        ledger.name = data.name;
      }
      if (data.description !== undefined) {
        ledger.description = data.description;
      }

      await manager.save(ledger);

      if (data.metadata !== undefined) {
        for (const metaData of data.metadata) {
          if (metaData.value === null || metaData.value === undefined) {
            // Remove metadata where value is null
            await manager.delete(LedgerMetadataEntity, {
              ledger: { id },
              key: metaData.key,
            });
          } else {
            // Upsert metadata (update if exists, create if not)
            await manager.upsert(
              LedgerMetadataEntity,
              {
                ledger: { id },
                key: metaData.key,
                value: metaData.value,
              },
              ['ledger', 'key']
            );
          }
        }
      }

      const updatedLedger = await manager.findOne(LedgerEntity, {
        where: { id },
        relations: ['metadata'],
      });

      return this.toResponse(updatedLedger!);
    });
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

  private toResponse(ledger: LedgerEntity): LedgerResponseDto {
    return {
      id: ledger.id,
      name: ledger.name,
      description: ledger.description,
      metadata: ledger.metadata?.map((v) => {
        return { key: v.key, value: v.value };
      }),
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
    };
  }
}
