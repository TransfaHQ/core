import { Response } from 'express';
import { NoResultError } from 'kysely';
import { DatabaseError } from 'pg';

import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';

@Catch(DatabaseError)
export class KyselyExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(KyselyExceptionFilter.name);

  catch(exception: DatabaseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Default error response
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let detail = exception.message;

    this.logger.error(`Database Error: ${exception.message}`, exception.stack);

    // Handle specific PostgreSQL error codes
    switch (exception.code) {
      case '23505': {
        // unique_violation
        status = HttpStatus.CONFLICT;
        message = 'Conflict';
        const messageStart = `${exception.table.split('_').join(' ')} with`;
        detail = exception.detail.replace('Key', messageStart);
        break;
      }
      // foreign_key_violation
      case '23503': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint violation';
        detail = exception.detail || 'Referenced record does not exist';
        break;
      }

      // not_null_violation
      case '23502': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Not null constraint violation';
        detail = exception.detail || 'A required field was not provided';
        break;
      }

      // check_violation
      case '23514': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Check constraint violation';
        detail = exception.detail || 'Value does not meet the required conditions';
        break;
      }

      // undefined_table
      case '42P01': {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database schema error';
        detail = 'The requested table does not exist';
        break;
      }

      // undefined_column
      case '42703': {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database schema error';
        detail = 'The requested column does not exist';
        break;
      }
    }

    // Send the response
    response.status(status).json({
      statusCode: status,
      message: detail,
      error: status < 500 ? message : undefined,
    });
  }
}

@Catch(NoResultError)
export class KyselyNoResultErrorExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(KyselyNoResultErrorExceptionFilter.name);

  catch(exception: NoResultError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let message = 'Resource not found';
    try {
      const tableName = (exception.node as any)?.from?.froms?.[0]?.table?.identifier?.name;
      if (tableName) {
        message = `${tableName} resource not found`;
      }
    } catch (err) {
      this.logger.debug(`Failed to extract table name from NoResultError: ${err}`);
    }

    this.logger.error(`Database Error: ${JSON.stringify(exception.node)}`, exception.stack);

    // Default error response
    const status = HttpStatus.NOT_FOUND;

    response.status(status).json({
      statusCode: status,
      message,
      error: message,
    });
  }
}
