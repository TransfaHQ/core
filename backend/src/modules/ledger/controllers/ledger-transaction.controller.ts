import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { IdempotencyInterceptor } from '@libs/api/interceptors/idempotency.interceptor';
import { CursorPaginatedResult } from '@libs/database';
import { LedgerTransactionStatusEnum } from '@libs/enums';

import { ApiKeyOrJwtGuard } from '@modules/auth/guards/api-key-or-jwt.guard';
import { ledgerTransactionToApiV1Resposne } from '@modules/ledger/controllers/api-response';
import { LedgerTransactionResponseDto } from '@modules/ledger/dto/ledger-transaction/ledger-transaction-response.dto';
import { ListLedgerTransactionRequestDto } from '@modules/ledger/dto/ledger-transaction/list-ledger-transaction-request.dto';
import {
  PostOrArchiveLedgerTransactionDto,
  RecordLedgerTransactionDto,
} from '@modules/ledger/dto/ledger-transaction/record-ledger-transaction.dto';
import { LedgerTransactionService } from '@modules/ledger/services/ledger-transaction.service';

@ApiTags('ledger-transactions')
@ApiSecurity('basic')
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '1', path: 'ledger_transactions' })
export class LedgerTransactionController {
  constructor(private ledgerService: LedgerTransactionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description: 'Unique key to prevent duplicate transactions',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a ledger transaction by ID',
    description: 'Retrieves a single ledger transaction by its unique identifier or external ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier or externalId of the ledger transaction',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiOkResponse({
    description: 'The ledger transaction has been successfully retrieved',
    type: LedgerTransactionResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ledger transaction not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async retrieve(@Param('id') id: string): Promise<LedgerTransactionResponseDto> {
    const response = await this.ledgerService.retrieve(id);
    return ledgerTransactionToApiV1Resposne(response);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List ledger transactions',
    description: 'Retrieves a paginated list of ledger transactions',
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
    name: 'externalId',
    required: false,
    type: String,
    description: 'Filter by external ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by transaction description',
    example: 'Payment for invoice',
  })
  @ApiQuery({
    name: 'metadata',
    required: false,
    description: 'Filter by metadata key/value pairs using Stripe convention: ?metadata[key]=value',
    example: 'metadata[source]=api&metadata[tag]=invoice',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
  })
  @ApiOkResponse({
    description: 'The ledger transactions have been successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/LedgerTransactionResponseDto' },
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
    @Query() queryParams: ListLedgerTransactionRequestDto,
  ): Promise<CursorPaginatedResult<LedgerTransactionResponseDto>> {
    const response = await this.ledgerService.paginate({
      limit: queryParams.limit,
      cursor: queryParams.cursor,
      direction: queryParams.direction,
      filters: {
        externalId: queryParams.externalId,
        search: queryParams.search,
        metadata: queryParams.metadata,
      },
    });
    return { ...response, data: response.data.map(ledgerTransactionToApiV1Resposne) };
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description: 'Unique key to prevent duplicate transactions',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Post a pending transaction',
    description: 'Post a pending transaction',
  })
  @ApiAcceptedResponse({
    description: 'The ledger transaction has been successfully posted',
    type: LedgerTransactionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the ledger transaction',
    example: 'a7f68f16-9834-4a6e-9a7d-5e9f4fc1d1a2',
  })
  async postPendingTransaction(
    @Param() params: PostOrArchiveLedgerTransactionDto,
  ): Promise<LedgerTransactionResponseDto> {
    const response = await this.ledgerService.postOrArchiveTransaction(
      params.id,
      LedgerTransactionStatusEnum.POSTED,
    );
    return ledgerTransactionToApiV1Resposne(response);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description: 'Unique key to prevent duplicate transactions',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Archive a pending transaction',
    description: 'Archive a pending transaction',
  })
  @ApiAcceptedResponse({
    description: 'The ledger transaction has been successfully posted',
    type: LedgerTransactionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the ledger transaction',
    example: 'a7f68f16-9834-4a6e-9a7d-5e9f4fc1d1a2',
  })
  async archivePendingTransaction(
    @Param() params: PostOrArchiveLedgerTransactionDto,
  ): Promise<LedgerTransactionResponseDto> {
    const response = await this.ledgerService.postOrArchiveTransaction(
      params.id,
      LedgerTransactionStatusEnum.ARCHIVED,
    );
    return ledgerTransactionToApiV1Resposne(response);
  }
}
