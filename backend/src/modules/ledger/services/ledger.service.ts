import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';

import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
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

  async createLedger(data: CreateLedgerDto): Promise<LedgerResponseDto> {
    const entity = this.ledgerRepository.create({
      name: data.name,
      description: data.description,
    });

    const ledger = await this.ledgerRepository.save(entity);
    const metadata = [] as LedgerMetadataEntity[];

    if (data.metadata.length > 0) {
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
