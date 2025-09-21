import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

@Catch(QueryFailedError)
export class TypeormQueryErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = 500;
    let message = "Internal server error. Please contact Transfa's Engineering team.";
    let error = 'Internal server';

    Logger.error(`db error: ${exception.detail}`);

    try {
      const messageStart = `${exception.table.split('_').join(' ')} with`;
      message = exception.detail.replace('Key', messageStart);
      error = 'Bad Request Exception';
      status = 409;
    } catch (error) {}

    response.status(status).json({
      statusCode: status,
      message: [message],
      error,
    });
  }
}
