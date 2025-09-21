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
import { ledgerAccountEntityToApiV1Response } from '@modules/ledger/controllers/api-response';
import { CreateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/create-ledger-account.dto';
import { LedgerAccountResponseDto } from '@modules/ledger/dto/ledger-account/ledger-account-response.dto';
import { UpdateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/updae-ledger-account.dto';
import { ListLedgerRequestDto } from '@modules/ledger/dto/list-ledger.dto';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';

@ApiTags('ledger-accounts')
@ApiSecurity('api-key')
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
    description: 'The ledger has been successfully created',
    type: LedgerAccountResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async createLedger(@Body() body: CreateLedgerAccountDto): Promise<LedgerAccountResponseDto> {
    const response = await this.ledgerAccountService.createLedgerAccount(body);
    return ledgerAccountEntityToApiV1Response(response);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a ledger by ID',
    description: 'Retrieves a single ledger by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the ledger',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiOkResponse({
    description: 'The ledger has been successfully retrieved',
    type: LedgerAccountResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ledger not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async retrieveLedger(@Param('id') id: string): Promise<LedgerAccountResponseDto> {
    const response = await this.ledgerAccountService.retrieveLedgerAccount(id);
    return ledgerAccountEntityToApiV1Response(response);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List ledgers',
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
  @ApiOkResponse({
    description: 'The ledgers have been successfully retrieved',
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
  async listLedgers(
    @Query() queryParams: ListLedgerRequestDto,
  ): Promise<CursorPaginatedResult<LedgerAccountResponseDto>> {
    const response = await this.ledgerAccountService.paginate(
      queryParams.limit,
      queryParams.cursor,
    );
    return { ...response, data: response.data.map(ledgerAccountEntityToApiV1Response) };
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
  @ApiNotFoundResponse({ description: 'Ledger account not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async updateLedger(
    @Param('id') id: string,
    @Body() data: UpdateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    const response = await this.ledgerAccountService.update(id, data);
    return ledgerAccountEntityToApiV1Response(response);
  }
}
