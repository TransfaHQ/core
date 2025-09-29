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
  /** Cursor for pagination - if provided, returns items after/before this cursor */
  cursor?: string;
  /** Direction to paginate: 'next' for forward, 'prev' for backward (default: 'next') */
  direction?: 'next' | 'prev';
  /** Field to use for cursor-based ordering (default: 'id') */
  cursorField?: keyof O;
  /** Initial sort order when no cursor is provided (default: 'desc') */
  initialOrder?: 'asc' | 'desc';
}

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
 * @param options Configuration for pagination
 * @returns Paginated results with bidirectional cursors
 */
export async function cursorPaginate<T extends keyof DB, O extends Record<string, any>>(
  options: CursorPaginationOptions<T, O>,
): Promise<CursorPaginatedResult<O>> {
  const {
    qb,
    limit = API_PAGE_SIZE,
    cursor,
    direction = 'next',
    cursorField = 'id' as keyof O,
    initialOrder = 'desc',
  } = options;

  // Create a new query to avoid mutating the original
  let query = qb;

  // Validate cursor if provided - if invalid, treat as if no cursor was provided
  const validCursor = cursor && isUUID(cursor) ? cursor : undefined;

  // Determine sort order based on direction and initial order
  const isForward = direction === 'next';
  const sortOrder = isForward ? initialOrder : initialOrder === 'desc' ? 'asc' : 'desc';

  // Apply cursor filtering if provided and valid
  if (validCursor) {
    if (isForward) {
      // For forward pagination
      if (initialOrder === 'desc') {
        query = query.where(cursorField as ReferenceExpression<DB, T>, '<', validCursor);
      } else {
        query = query.where(cursorField as ReferenceExpression<DB, T>, '>', validCursor);
      }
    } else {
      // For backward pagination
      if (initialOrder === 'desc') {
        query = query.where(cursorField as ReferenceExpression<DB, T>, '>', validCursor);
      } else {
        query = query.where(cursorField as ReferenceExpression<DB, T>, '<', validCursor);
      }
    }
  }

  // Apply ordering and limit
  query = query.orderBy(cursorField as string, sortOrder).limit(limit + 1);

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
      if (validCursor) {
        hasPrev = true;
        prevCursor = String(items[0][cursorField]);
      }
    } else {
      // Backward pagination
      hasPrev = hasMore;
      prevCursor = hasPrev ? String(items[0][cursorField]) : undefined;

      // Check if there are next items (only if we have a valid cursor)
      if (validCursor) {
        hasNext = true;
        nextCursor = String(lastItem[cursorField]);
      }
    }
  }

  // If no valid cursor was provided, this is initial load
  if (!validCursor && items.length > 0) {
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

/**
 * Simplified pagination for forward-only navigation
 */
export async function simplePaginate<T extends keyof DB, O extends Record<string, any>>(
  qb: SelectQueryBuilder<DB, T, O>,
  limit: number = API_PAGE_SIZE,
  cursor?: string,
  cursorField: keyof O = 'id' as keyof O,
  order: 'asc' | 'desc' = 'desc',
): Promise<CursorPaginatedResult<O>> {
  return cursorPaginate({
    qb,
    limit,
    cursor,
    cursorField,
    initialOrder: order,
  });
}
