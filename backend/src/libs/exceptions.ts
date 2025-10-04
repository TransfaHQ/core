import { CreateTransferError, CreateTransfersError } from 'tigerbeetle-node';

import { BadRequestException } from '@nestjs/common';

export class InsufficientBalanceException extends BadRequestException {}

export class TigerBeetleTransferException extends BadRequestException {
  constructor(key: string, tbErrors: CreateTransfersError[]) {
    super({
      message: TigerBeetleTransferException.formatMessage(tbErrors, key),
      error: 'Bad Request',
      statusCode: 400,
    });
  }

  private static formatMessage(errors: CreateTransfersError[], key: string): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      let message: string = 'A transaction error occurred.';
      const prefix = `${key} at index ${error.index}`;
      if (error.result === CreateTransferError.exceeds_credits) {
        message = `${prefix} exceeds the available credits.`;
      } else if (error.result === CreateTransferError.exceeds_debits) {
        message = `${prefix} exceeds the allowed debits.`;
      } else {
        message = `${prefix} failed with an unknown error.`;
      }

      messages.push(message);
    }
    return messages;
  }
}
