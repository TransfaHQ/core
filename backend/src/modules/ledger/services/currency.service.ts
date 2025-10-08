import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';

import { CreateCurrencyDto } from '@modules/ledger/dto/currency/create-currency.dto';
import { Currency } from '@modules/ledger/types';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CurrencyService {
  constructor(private readonly db: DatabaseService) {}

  async createCurrency(data: CreateCurrencyDto): Promise<Currency> {
    return await this.db.transaction(async (trx) => {
      // Check if currency code already exists
      const existingCurrency = await trx
        .selectFrom('currencies')
        .select(['id'])
        .where('code', '=', data.code.toUpperCase())
        .executeTakeFirst();

      if (existingCurrency) {
        throw new BadRequestException(`Currency with code '${data.code}' already exists`);
      }

      const currency = await trx
        .insertInto('currencies')
        .values({
          code: data.code.toUpperCase(),
          exponent: data.exponent,
          name: data.name,
        })
        .returning(['id', 'code', 'exponent', 'name', 'createdAt', 'updatedAt'])
        .executeTakeFirstOrThrow();

      return currency;
    });
  }

  async findByCode(code: string): Promise<Currency> {
    const currency = await this.db.kysely
      .selectFrom('currencies')
      .select(['id', 'code', 'exponent', 'name', 'createdAt', 'updatedAt'])
      .where('code', '=', code.toUpperCase())
      .executeTakeFirst();

    if (!currency) {
      throw new NotFoundException(`Currency with code '${code}' not found`);
    }

    return currency;
  }

  async findById(id: number): Promise<Currency> {
    const currency = await this.db.kysely
      .selectFrom('currencies')
      .select(['id', 'code', 'exponent', 'name', 'createdAt', 'updatedAt'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!currency) {
      throw new NotFoundException(`Currency with id '${id}' not found`);
    }

    return currency;
  }

  async paginate(
    page: number = 1,
    limit: number = 10,
    searchFilter?: string,
  ): Promise<PaginatedResult<Currency>> {
    let query = this.db.kysely
      .selectFrom('currencies')
      .select(['id', 'code', 'exponent', 'name', 'createdAt', 'updatedAt']);

    if (searchFilter) {
      const searchUpper = searchFilter.toUpperCase();
      const searchPattern = `%${searchFilter}%`;
      query = query.where((eb) =>
        eb.or([eb('code', 'ilike', `%${searchUpper}%`), eb('name', 'ilike', searchPattern)]),
      );
    }

    const [data, totalResult] = await Promise.all([
      query
        .orderBy('code', 'asc')
        .offset((page - 1) * limit)
        .limit(limit)
        .execute(),
      this.db.kysely
        .selectFrom('currencies')
        .select(({ fn }) => [fn.count<number>('id').as('count')])
        .$if(!!searchFilter, (qb) => {
          const searchUpper = searchFilter!.toUpperCase();
          const searchPattern = `%${searchFilter}%`;
          return qb.where((eb) =>
            eb.or([eb('code', 'ilike', `%${searchUpper}%`), eb('name', 'ilike', searchPattern)]),
          );
        })
        .executeTakeFirstOrThrow(),
    ]);

    const total = totalResult.count;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteCurrency(code: string): Promise<void> {
    return await this.db.transaction(async (trx) => {
      const currency = await trx
        .selectFrom('currencies')
        .select(['id', 'code'])
        .where('code', '=', code.toUpperCase())
        .executeTakeFirst();

      if (!currency) {
        throw new NotFoundException(`Currency with code '${code}' not found`);
      }

      // Check if any ledger accounts are using this currency
      const accountCountResult = await trx
        .selectFrom('ledgerAccounts')
        .select(({ fn }) => [fn.count<number>('id').as('count')])
        .where('currencyCode', '=', currency.code)
        .where('deletedAt', 'is', null)
        .executeTakeFirstOrThrow();

      const accountCount = accountCountResult.count;

      if (accountCount > 0) {
        throw new BadRequestException(
          `Cannot delete currency '${code}' as it is being used by ${accountCount} ledger account(s)`,
        );
      }

      await trx.deleteFrom('currencies').where('id', '=', currency.id).execute();
    });
  }
}
