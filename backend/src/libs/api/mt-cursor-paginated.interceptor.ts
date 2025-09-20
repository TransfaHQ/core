import { Response } from 'express';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

import { CursorPaginatedResult } from '@libs/database';

@Injectable()
export class MTCursorPaginationInterceptor<T>
  implements NestInterceptor<CursorPaginatedResult<T>, T[]>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<CursorPaginatedResult<T>>,
  ): Observable<T[]> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();

    return next.handle().pipe(
      tap((result: CursorPaginatedResult<T>) => {
        if (result?.nextCursor) res.setHeader('X-After-Cursor', result.nextCursor);
      }),

      map((result) => result.data),
    );
  }
}
