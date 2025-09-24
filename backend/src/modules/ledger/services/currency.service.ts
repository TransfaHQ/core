import { Repository } from 'typeorm';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Transactional } from '@libs/database';

import { CreateCurrencyDto } from '@modules/ledger/dto/currency/create-currency.dto';
import { CurrencyEntity } from '@modules/ledger/entities/currency.entity';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(CurrencyEntity)
    private readonly currencyRepository: Repository<CurrencyEntity>,
    @InjectRepository(LedgerAccountEntity)
    private readonly ledgerAccountRepository: Repository<LedgerAccountEntity>,
  ) {}

  @Transactional()
  async createCurrency(data: CreateCurrencyDto): Promise<CurrencyEntity> {
    // Check if currency code already exists
    const existingCurrency = await this.currencyRepository.findOne({
      where: { code: data.code.toUpperCase() },
    });

    if (existingCurrency) {
      throw new BadRequestException(`Currency with code '${data.code}' already exists`);
    }

    const currency = this.currencyRepository.create({
      code: data.code.toUpperCase(),
      exponent: data.exponent,
      name: data.name,
    });

    return await this.currencyRepository.save(currency);
  }

  async findByCode(code: string): Promise<CurrencyEntity> {
    const currency = await this.currencyRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with code '${code}' not found`);
    }

    return currency;
  }

  async findById(id: number): Promise<CurrencyEntity> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with id '${id}' not found`);
    }

    return currency;
  }

  async paginate(
    page: number = 1,
    limit: number = 10,
    codeFilter?: string,
  ): Promise<PaginatedResult<CurrencyEntity>> {
    const queryBuilder = this.currencyRepository.createQueryBuilder('currency');

    if (codeFilter) {
      queryBuilder.where('currency.code ILIKE :code', {
        code: `%${codeFilter.toUpperCase()}%`,
      });
    }

    queryBuilder
      .orderBy('currency.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Transactional()
  async deleteCurrency(code: string): Promise<void> {
    const currency = await this.findByCode(code);

    // Check if any ledger accounts are using this currency
    const accountCount = await this.ledgerAccountRepository.count({
      where: { currencyCode: currency.code },
    });

    if (accountCount > 0) {
      throw new BadRequestException(
        `Cannot delete currency '${code}' as it is being used by ${accountCount} ledger account(s)`,
      );
    }

    await this.currencyRepository.remove(currency);
  }
}
