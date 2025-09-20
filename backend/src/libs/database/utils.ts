import { Repository, SelectQueryBuilder } from 'typeorm';

import { API_PAGE_SIZE } from '@libs/constants';
import { BaseTypeormEntity } from '@libs/database/base-typeorm.entity';

export interface CursorPaginationOptions<T extends BaseTypeormEntity> {
  repo: Repository<T>;
  limit?: number;
  cursor?: string;
  order?: 'ASC' | 'DESC';
  where?: (qb: SelectQueryBuilder<T>) => SelectQueryBuilder<T>;
  relations?: string[];
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
export async function cursorPaginate<T extends BaseTypeormEntity>(
  options: CursorPaginationOptions<T>,
): Promise<CursorPaginatedResult<T>> {
  const { repo, cursor, order = 'ASC', where, relations = [] } = options;
  const limit = options.limit ?? API_PAGE_SIZE;
  let qb = repo
    .createQueryBuilder('entity')
    .orderBy('entity.id', order)
    .take(limit + 1);

  // Apply relations
  for (const relation of relations) {
    qb = qb.leftJoinAndSelect(`entity.${relation}`, relation.replace('.', '_'));
  }

  if (cursor) {
    if (order === 'ASC') {
      qb = qb.where('entity.id > :cursor', { cursor });
    } else {
      qb = qb.where('entity.id < :cursor', { cursor });
    }
  }

  if (where) {
    qb = where(qb);
  }

  const rows = await qb.getMany();

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
