import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CursorPaginatedResult } from '@libs/database';

import { ApiKeyOrJwtGuard } from '@modules/auth/guards/api-key-or-jwt.guard';
import { ledgerAccountToApiV1Response } from '@modules/ledger/controllers/api-response';
import { CreateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/create-ledger-account.dto';
import { LedgerAccountResponseDto } from '@modules/ledger/dto/ledger-account/ledger-account-response.dto';
import { ListLedgerAccountRequestDto } from '@modules/ledger/dto/ledger-account/list-ledger-account-request.dto';
import { UpdateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/update-ledger-account.dto';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';

import { LedgerAccount } from '../types';

@ApiTags('ledger-accounts')
@ApiSecurity('basic')
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '1', path: 'ledger_accounts' })
export class LedgerAccountController {
  constructor(private ledgerAccountService: LedgerAccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new ledger account',
    description: 'Creates a new ledger account with the provided details',
  })
  @ApiCreatedResponse({
    description: 'The ledger account has been successfully created',
    type: LedgerAccountResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async createLedgerAccount(
    @Body() body: CreateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    const response = await this.ledgerAccountService.createLedgerAccount(body);
    return ledgerAccountToApiV1Response(response);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a ledger account by ID',
    description: 'Retrieves a single ledger account by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier or externalId of the ledger account',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiOkResponse({
    description: 'The ledger account has been successfully retrieved',
    type: LedgerAccountResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ledger account not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async retrieveLedgerAccount(@Param('id') id: string): Promise<LedgerAccountResponseDto> {
    const response = await this.ledgerAccountService.retrieveLedgerAccount(id);
    return ledgerAccountToApiV1Response(response);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List ledger accounts',
    description: 'Retrieves a paginated list of ledger accounts',
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
    name: 'currency',
    required: false,
    type: String,
    description: 'Filter by currency code',
    example: 'USD',
  })
  @ApiQuery({
    name: 'normalBalance',
    required: false,
    enum: ['credit', 'debit'],
    description: 'Filter by normal balance type',
    example: 'debit',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by account name, description, or external ID',
    example: 'Cash Account',
  })
  @ApiQuery({
    name: 'metadata',
    required: false,
    description: 'Filter by metadata key/value pairs using Stripe convention: ?metadata[key]=value',
    example: 'metadata[department]=finance&metadata[region]=US',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
  })
  @ApiOkResponse({
    description: 'The ledger accounts have been successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/LedgerAccountResponseDto' },
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
  async listAccounts(
    @Query() queryParams: ListLedgerAccountRequestDto,
  ): Promise<CursorPaginatedResult<LedgerAccountResponseDto>> {
    const response = await this.ledgerAccountService.paginate({
      limit: queryParams.limit,
      afterCursor: queryParams.afterCursor,
      beforeCursor: queryParams.beforeCursor,
      filters: {
        ledgerId: queryParams.ledgerId,
        currency: queryParams.currency,
        normalBalance: queryParams.normalBalance,
        search: queryParams.search,
        metadata: queryParams.metadata,
      },
    });
    return { ...response, data: response.data.map(ledgerAccountToApiV1Response) };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a ledger account by ID',
    description:
      'Updates an existing ledger account by its unique identifier with the provided fields',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the ledger account to update',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiOkResponse({
    description: 'The ledger account has been successfully updated',
    type: LedgerAccountResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiNotFoundResponse({ description: 'Ledger account not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async updateLedgerAccount(
    @Param('id') id: string,
    @Body() data: UpdateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    const response = (await this.ledgerAccountService.update(id, data)) as unknown as LedgerAccount;
    return ledgerAccountToApiV1Response(response);
  }
}
