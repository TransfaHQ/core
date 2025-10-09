import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import {
  BadRequestException,
  CallHandler,
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

    const idempotencyKey: string = request.headers['idempotency-key'];
    const endpoint: string = request.originalUrl;

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
      responseObj.status(existingResponse.statusCode);
      responseObj.setHeader('X-Idempotency-Replayed', 'true');
      return of(existingResponse.responsePayload);
    }
    responseObj.setHeader('X-Idempotency-Replayed', 'false');

    return next.handle().pipe(
      tap(async (response) => {
        const statusCode = responseObj.statusCode;

        await this.db.kysely
          .insertInto('idempotencyKeys')
          .values({
            externalId: idempotencyKey,
            requestPayload: request.body ?? {},
            responsePayload: response,
            statusCode,
            endpoint,
          })
          .execute();
      }),

      catchError(async (err) => {
        const statusCode = typeof err.getStatus === 'function' ? err.getStatus() : 500;

        if (statusCode >= 400 && statusCode < 500) {
          await this.db.kysely
            .insertInto('idempotencyKeys')
            .values({
              externalId: idempotencyKey,
              requestPayload: request.body ?? {},
              responsePayload: err.response,
              statusCode,
              endpoint,
            })
            .execute();
        }

        throw err;
      }),
    );
  }
}
