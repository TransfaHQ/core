import { isDeepStrictEqual } from 'node:util';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const responseObj = context.switchToHttp().getResponse();

    const idempotencyKey: string = String(request.headers['idempotency-key'] || '');
    const endpoint: string = `${request.method} ${request.path}`;

    if (!idempotencyKey) {
      throw new BadRequestException(['Missing Idempotency-Key header']);
    }
    responseObj.setHeader('X-Idempotency-Key', idempotencyKey);

    const existingResponse = await this.db.kysely
      .selectFrom('idempotencyKeys')
      .selectAll()
      .where('externalId', '=', idempotencyKey)
      .where('endpoint', '=', endpoint)
      .executeTakeFirst();

    if (existingResponse) {
      const currentRequestPayload = request.body ?? {};
      const storedRequestPayload = existingResponse.requestPayload;

      if (!isDeepStrictEqual(currentRequestPayload, storedRequestPayload)) {
        throw new ConflictException('Idempotency key already used with different request body');
      }

      responseObj.status(existingResponse.statusCode);
      responseObj.setHeader('X-Idempotency-Replayed', 'true');
      return of(existingResponse.responsePayload);
    }
    responseObj.setHeader('X-Idempotency-Replayed', 'false');

    return next.handle().pipe(
      mergeMap((response) => {
        const statusCode = responseObj.statusCode;

        return from(
          this.db.kysely
            .insertInto('idempotencyKeys')
            .values({
              externalId: idempotencyKey,
              requestPayload: request.body ?? {},
              responsePayload: response,
              statusCode,
              endpoint,
            })
            .execute(),
        ).pipe(map(() => response));
      }),

      catchError((err) => {
        const statusCode = typeof err.getStatus === 'function' ? err.getStatus() : 500;

        if (statusCode >= 400 && statusCode < 500) {
          return from(
            this.db.kysely
              .insertInto('idempotencyKeys')
              .values({
                externalId: idempotencyKey,
                requestPayload: request.body ?? {},
                responsePayload: err.getResponse?.() ?? err.response,
                statusCode,
                endpoint,
              })
              .execute(),
          ).pipe(mergeMap(() => throwError(() => err)));
        }

        return throwError(() => err);
      }),
    );
  }
}
