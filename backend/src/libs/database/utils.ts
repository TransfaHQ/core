import { QueryOrder } from '@mikro-orm/core';
import { QueryBuilder } from '@mikro-orm/postgresql';

import { API_PAGE_SIZE } from '@libs/constants';
import { BaseMikroOrmEntity } from '@libs/database/base-mikro-orm.entity';

export interface CursorPaginationOptions<T extends BaseMikroOrmEntity> {
  qb: QueryBuilder<T>;
  limit?: number;
  cursor?: string;
  order?: 'ASC' | 'DESC';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Generic cursor pagination using UUIDv7
 */
export async function cursorPaginate<T extends BaseMikroOrmEntity>(
  options: CursorPaginationOptions<T>,
): Promise<CursorPaginatedResult<T>> {
  const { qb, cursor, order = 'ASC' } = options;
  const limit = options.limit ?? API_PAGE_SIZE;

  if (cursor) {
    if (order === 'ASC') {
      qb.andWhere({ id: { $gt: cursor } });
    } else {
      qb.andWhere({ id: { $lt: cursor } });
    }
  }
  // console.log(qb.limit(1).getQuery());
  qb.orderBy({ id: order === 'ASC' ? QueryOrder.ASC : QueryOrder.DESC });
  // qb.limit(limit + 1);

  const rows = await qb.getResultList(limit + 1);

  const hasExtra = rows.length > limit;
  const data = hasExtra ? rows.slice(0, limit) : rows;

  const nextCursor = order === 'ASC' && hasExtra ? data[data.length - 1].id : undefined;

  const prevCursor = order === 'DESC' && hasExtra ? data[data.length - 1].id : undefined;

  return {
    data,
    nextCursor,
    prevCursor,
    hasNext: order === 'ASC' ? !!nextCursor : false,
    hasPrev: order === 'DESC' ? !!prevCursor : false,
  };
}
