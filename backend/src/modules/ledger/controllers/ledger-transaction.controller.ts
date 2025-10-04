import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { IdempotencyInterceptor } from '@libs/api/interceptors/idempotency.interceptor';

import { ApiKeyOrJwtGuard } from '@modules/auth/guards/api-key-or-jwt.guard';
import { ledgerTransactionToApiV1Resposne } from '@modules/ledger/controllers/api-response';
import { LedgerTransactionResponseDto } from '@modules/ledger/dto/ledger-transaction/ledger-transaction-response.dto';
import { RecordLedgerTransactionDto } from '@modules/ledger/dto/ledger-transaction/record-ledger-transaction.dto';
import { LedgerTransactionService } from '@modules/ledger/services/ledger-transaction.service';

@ApiTags('ledger-transactions')
@ApiSecurity('api-key')
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '1', path: 'ledger_transactions' })
export class LedgerTransactionController {
  constructor(private ledgerService: LedgerTransactionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({
    summary: 'Create a new ledger transaction',
    description: 'Creates a new ledger transaction with the provided details',
  })
  @ApiCreatedResponse({
    description: 'The ledger transaction has been successfully created',
    type: LedgerTransactionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async create(@Body() body: RecordLedgerTransactionDto): Promise<LedgerTransactionResponseDto> {
    const response = await this.ledgerService.record(body);
    return ledgerTransactionToApiV1Resposne(response);
  }
}
