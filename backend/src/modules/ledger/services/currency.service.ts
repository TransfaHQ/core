import { EntityManager, EntityRepository, Transactional } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

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
    private readonly currencyRepository: EntityRepository<CurrencyEntity>,
    @InjectRepository(LedgerAccountEntity)
    private readonly ledgerAccountRepository: EntityRepository<LedgerAccountEntity>,
    private readonly em: EntityManager,
  ) {}

  @Transactional()
  async createCurrency(data: CreateCurrencyDto): Promise<CurrencyEntity> {
    // Check if currency code already exists
    const existingCurrency = await this.currencyRepository.findOne({
      code: data.code.toUpperCase(),
    });

    if (existingCurrency) {
      throw new BadRequestException(`Currency with code '${data.code}' already exists`);
    }

    const currency = new CurrencyEntity();
    currency.code = data.code.toUpperCase();
    currency.exponent = data.exponent;
    currency.name = data.name;

    await this.em.persistAndFlush(currency);
    return currency;
  }

  async findByCode(code: string): Promise<CurrencyEntity> {
    const currency = await this.currencyRepository.findOne({ code: code.toUpperCase() });

    if (!currency) {
      throw new NotFoundException(`Currency with code '${code}' not found`);
    }

    return currency;
  }

  async findById(id: number): Promise<CurrencyEntity> {
    const currency = await this.currencyRepository.findOne({ id });

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
    const where: any = {};

    if (codeFilter) {
      where.code = { $ilike: `%${codeFilter.toUpperCase()}%` };
    }

    const [data, total] = await this.currencyRepository.findAndCount(where, {
      orderBy: { code: 'asc' },
      offset: (page - 1) * limit,
      limit,
    });

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
    const accountCount = await this.ledgerAccountRepository.count({ currencyCode: currency.code });

    if (accountCount > 0) {
      throw new BadRequestException(
        `Cannot delete currency '${code}' as it is being used by ${accountCount} ledger account(s)`,
      );
    }

    await this.em.removeAndFlush(currency);
  }
}
