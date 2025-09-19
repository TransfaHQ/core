import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';

import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntity)
    private readonly ledgerRepository: Repository<LedgerEntity>,
  ) {}

  async createLedger(data: CreateLedgerDto): Promise<LedgerResponseDto> {
    const entity = this.ledgerRepository.create({
      name: data.name,
      description: data.description,
    });

    const ledger = await this.ledgerRepository.save(entity);

    return this.toResposne(ledger);
  }

  async retrieveLedger(id: string): Promise<LedgerResponseDto> {
    const ledger = await this.ledgerRepository.findOneByOrFail({ id });
    return this.toResposne(ledger);
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
    });

    return {
      ...response,
      data: response.data.map((v) => this.toResposne(v)),
    };
  }

  private toResposne(ledger: LedgerEntity): LedgerResponseDto {
    return {
      id: ledger.id,
      name: ledger.name,
      description: ledger.description,
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
    };
  }
}
