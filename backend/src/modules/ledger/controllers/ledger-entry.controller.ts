import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CursorPaginatedResult } from '@libs/database';
import { NormalBalanceEnum } from '@libs/enums';

import { ApiKeyOrJwtGuard } from '@modules/auth/guards/api-key-or-jwt.guard';
import { ledgerEntryStandaloneToApiV1Response } from '@modules/ledger/controllers/api-response';
import { LedgerEntryStandaloneResponseDto } from '@modules/ledger/dto/ledger-entry/ledger-entry-response.dto';
import { ListLedgerEntryRequestDto } from '@modules/ledger/dto/ledger-entry/list-ledger-entry-request.dto';
import { LedgerEntryService } from '@modules/ledger/services/ledger-entry.service';

@ApiTags('ledger-entries')
@ApiSecurity('api-key')
@ApiExtraModels(LedgerEntryStandaloneResponseDto)
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '1', path: 'ledger_entries' })
export class LedgerEntryController {
  constructor(private ledgerEntryService: LedgerEntryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List ledger entries',
    description: 'Retrieves a paginated list of ledger entries',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor for pagination',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiQuery({
    name: 'ledgerId',
    required: false,
    type: String,
    description: 'Filter by ledger ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'transactionId',
    required: false,
    type: String,
    description: 'Filter by transaction ID (native)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'transactionExternalId',
    required: false,
    type: String,
    description: 'Filter by transaction external ID',
    example: 'tx_external_123',
  })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: String,
    description: 'Filter by account ID (native)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'accountExternalId',
    required: false,
    type: String,
    description: 'Filter by account external ID',
    example: 'acc_external_123',
  })
  @ApiQuery({
    name: 'balanceDirection',
    required: false,
    enum: NormalBalanceEnum,
    description: 'Filter by direction (credit or debit)',
    example: NormalBalanceEnum.DEBIT,
  })
  @ApiOkResponse({
    description: 'The ledger entries have been successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/LedgerEntryStandaloneResponseDto' },
        },
        nextCursor: {
          type: 'string',
          description: 'Cursor for the next page',
          example: '01234567-89ab-cdef-0123-456789abcdef',
        },
        prevCursor: {
          type: 'string',
          description: 'Cursor for the previous page',
          example: '01234567-89ab-cdef-0123-456789abcdef',
        },
        hasNext: {
          type: 'boolean',
          description: 'Whether there are more items after this page',
        },
        hasPrev: {
          type: 'boolean',
          description: 'Whether there are more items before this page',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async list(
    @Query() queryParams: ListLedgerEntryRequestDto,
  ): Promise<CursorPaginatedResult<LedgerEntryStandaloneResponseDto>> {
    const response = await this.ledgerEntryService.paginate({
      limit: queryParams.limit,
      cursor: queryParams.cursor,
      direction: queryParams.direction,
      filters: {
        ledgerId: queryParams.ledgerId,
        transactionId: queryParams.transactionId,
        transactionExternalId: queryParams.transactionExternalId,
        accountId: queryParams.accountId,
        accountExternalId: queryParams.accountExternalId,
        direction: queryParams.balanceDirection,
      },
    });
    return { ...response, data: response.data.map(ledgerEntryStandaloneToApiV1Response) };
  }
}
