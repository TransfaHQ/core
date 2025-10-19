import { ReferenceExpression, SelectQueryBuilder } from 'kysely';
import { validate as isUUID } from 'uuid';

import { API_PAGE_SIZE } from '@libs/constants';

import { DB } from './types';

/**
 * Configuration options for cursor pagination
 */
export interface CursorPaginationOptions<T extends keyof DB, O extends Record<string, any>> {
  /** The Kysely query builder (can be a transaction or regular connection) */
  qb: SelectQueryBuilder<DB, T, O>;
  /** Number of items to return per page (default: API_PAGE_SIZE) */
  limit?: number;
  /** Cursor for forward pagination - returns items after this cursor */
  afterCursor?: string;
  /** Cursor for backward pagination - returns items before this cursor */
  beforeCursor?: string;
  /** Field to use for cursor-based ordering (default: 'id') */
  cursorField?: keyof O;
  /** Initial sort order when no cursor is provided (default: 'desc') */
  initialOrder?: 'asc' | 'desc';
}

export type CursorPaginationRequest<F> = {
  limit?: number;
  afterCursor?: string;
  beforeCursor?: string;
  filters: F;
  order?: 'asc' | 'desc';
};

/**
 * Result of cursor-based pagination
 */
export interface CursorPaginatedResult<T> {
  /** The paginated data */
  data: T[];
  /** Cursor for the next page (undefined if no next page) */
  nextCursor?: string;
  /** Cursor for the previous page (undefined if no previous page) */
  prevCursor?: string;
  /** Whether there are more items after current page */
  hasNext: boolean;
  /** Whether there are more items before current page */
  hasPrev: boolean;
}

/**
 * Generic bidirectional cursor pagination for Kysely
 *
 * Supports both forward and backward pagination with efficient cursor-based queries.
 * Uses UUIDv7 IDs by default for natural chronological ordering.
 *
 * If order is asc:
 *    - after -> where id > cursor order by asc
 *    - before -> where id < cursor order by desc
 *
 * If order is desc:
 *    - after -> where id < cursor order by desc
 *    - before -> where id > cursor order by asc
 *
 * @param options Configuration for pagination
 * @returns Paginated results with bidirectional cursors
 */
export async function cursorPaginate<T extends keyof DB, O extends Record<string, any>>(
  options: CursorPaginationOptions<T, O>,
): Promise<CursorPaginatedResult<O>> {
  const {
    qb,
    limit = API_PAGE_SIZE,
    afterCursor: after,
    beforeCursor: before,
    cursorField = 'id' as keyof O,
    initialOrder = 'desc',
  } = options;

  // Create a new query to avoid mutating the original
  let query = qb;

  // Validate cursors if provided - if invalid, treat as if no cursor was provided
  const validAfter = after && isUUID(after) ? after : undefined;
  const validBefore = before && isUUID(before) ? before : undefined;

  // Determine sort order based on which cursor is provided
  const isForward = !validBefore; // Forward if using 'after' or no cursor

  if (initialOrder === 'asc') {
    if (validAfter) {
      query = query.where(cursorField as ReferenceExpression<DB, T>, '>', validAfter);
      query = query.orderBy(cursorField as string, 'asc');
    } else if (validBefore) {
      query = query.where(cursorField as ReferenceExpression<DB, T>, '<', validBefore);
      query = query.orderBy(cursorField as string, 'desc');
    } else {
      query = query.orderBy(cursorField as string, initialOrder);
    }
  } else {
    if (validAfter) {
      query = query.where(cursorField as ReferenceExpression<DB, T>, '<', validAfter);
      query = query.orderBy(cursorField as string, 'desc');
    } else if (validBefore) {
      query = query.where(cursorField as ReferenceExpression<DB, T>, '>', validBefore);
      query = query.orderBy(cursorField as string, 'asc');
    } else {
      query = query.orderBy(cursorField as string, initialOrder);
    }
  }

  query = query.limit(limit + 1);

  // Execute query
  const results = await query.execute();

  // Determine if there are more results
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;

  // For backward pagination, reverse the items to maintain correct order
  if (!isForward) {
    items.reverse();
  }

  let nextCursor: string | undefined;
  let prevCursor: string | undefined;
  let hasNext = false;
  let hasPrev = false;

  if (items.length > 0) {
    const lastItem = items[items.length - 1];

    if (isForward) {
      // Forward pagination
      hasNext = hasMore;
      nextCursor = hasNext ? String(lastItem[cursorField]) : undefined;

      // Check if there are previous items (only if we have a valid cursor)
      if (validAfter) {
        hasPrev = true;
        prevCursor = String(items[0][cursorField]);
      }
    } else {
      // Backward pagination
      hasPrev = hasMore;
      prevCursor = hasPrev ? String(items[0][cursorField]) : undefined;

      // Check if there are next items (only if we have a valid cursor)
      if (validBefore) {
        hasNext = true;
        nextCursor = String(lastItem[cursorField]);
      }
    }
  }

  // If no valid cursor was provided, this is initial load
  if (!validAfter && !validBefore && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = hasMore ? String(lastItem[cursorField]) : undefined;
    hasNext = hasMore;
    // No previous page for initial load
  }

  return {
    data: items,
    nextCursor,
    prevCursor,
    hasNext,
    hasPrev,
  };
}
