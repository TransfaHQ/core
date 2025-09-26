import { EntityRepository, QueryOrder } from '@mikro-orm/core';

import { API_PAGE_SIZE } from '@libs/constants';
import { BaseMikroOrmEntity } from '@libs/database/base-mikro-orm.entity';

export interface CursorPaginationOptions<T extends BaseMikroOrmEntity> {
  repo: EntityRepository<T>;
  limit?: number;
  cursor?: string;
  order?: 'ASC' | 'DESC';
  where?: object;
  populate?: string[];
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
  const { repo, cursor, order = 'ASC', where = {}, populate = [] } = options;
  const limit = options.limit ?? API_PAGE_SIZE;

  const conditions: any = { ...where };

  if (cursor) {
    if (order === 'ASC') {
      conditions.id = { $gt: cursor };
    } else {
      conditions.id = { $lt: cursor };
    }
  }

  const rows = await repo.find(conditions, {
    orderBy: { id: order === 'ASC' ? QueryOrder.ASC : QueryOrder.DESC } as any,
    limit: limit + 1,
    populate: populate as any,
  });

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
