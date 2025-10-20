import { isDeepStrictEqual } from 'node:util';
import { DatabaseError } from 'pg';
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

  private async handleExistingRecord(
    idempotencyKey: string,
    requestPayload: any,
    endpoint: string,
  ) {
    const existingResponse = await this.db.kysely
      .selectFrom('idempotencyKeys')
      .selectAll()
      .where('externalId', '=', idempotencyKey)
      .where('endpoint', '=', endpoint)
      .executeTakeFirst();

    if (!existingResponse) {
      throw new Error('Expected existing idempotency record but found none');
    }

    // Validate payload matches
    if (!isDeepStrictEqual(requestPayload, existingResponse.requestPayload)) {
      throw new ConflictException('Idempotency key already used with different request body');
    }

    return existingResponse;
  }

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
      // Validate payload match
      await this.handleExistingRecord(idempotencyKey, request.body ?? {}, endpoint);

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
        ).pipe(
          map(() => response),
          catchError((insertErr) => {
            // Handle race condition: another request already inserted the record
            if (insertErr instanceof DatabaseError && insertErr.code === '23505') {
              return from(
                this.handleExistingRecord(idempotencyKey, request.body ?? {}, endpoint),
              ).pipe(
                map((existing) => {
                  // Set response status to match the stored response
                  responseObj.status(existing.statusCode);
                  responseObj.setHeader('X-Idempotency-Replayed', 'true');
                  return existing.responsePayload;
                }),
              );
            }
            // Re-throw other errors
            return throwError(() => insertErr);
          }),
        );
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
          ).pipe(
            mergeMap(() => throwError(() => err)),
            catchError((insertErr) => {
              // Handle race condition: another request already inserted the record
              if (insertErr instanceof DatabaseError && insertErr.code === '23505') {
                // Validate the existing record matches, then throw the original error
                return from(
                  this.handleExistingRecord(idempotencyKey, request.body ?? {}, endpoint),
                ).pipe(mergeMap(() => throwError(() => err)));
              }
              // Re-throw other insert errors
              return throwError(() => insertErr);
            }),
          );
        }

        return throwError(() => err);
      }),
    );
  }
}
