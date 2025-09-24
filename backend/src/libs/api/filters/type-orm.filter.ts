import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

@Catch(QueryFailedError)
export class TypeormQueryErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = 500;
    const message = "Internal server error. Please contact Transfa's Engineering team.";
    const error = 'Internal server';

    Logger.error(`db error: ${exception}`);

    response.status(status).json({
      statusCode: status,
      message: [message],
      error,
    });
  }
}
