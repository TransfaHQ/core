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
  UseInterceptors,
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

import { MTCursorPaginationInterceptor } from '@libs/api/interceptors/mt-cursor-paginated.interceptor';
import { CursorPaginatedResult } from '@libs/database';

import { ApiKeyOrJwtGuard } from '@modules/auth/guards/api-key-or-jwt.guard';
import { ledgerToApiV1Response } from '@modules/ledger/controllers/api-response';
import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
import { ListLedgerRequestDto } from '@modules/ledger/dto/list-ledger.dto';
import { UpdateLedgerDto } from '@modules/ledger/dto/update-ledger.dto';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@ApiTags('ledgers')
@ApiSecurity('api-key')
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '1', path: 'ledgers' })
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new ledger',
    description: 'Creates a new ledger with the provided name and description',
  })
  @ApiCreatedResponse({
    description: 'The ledger has been successfully created',
    type: LedgerResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async createLedger(@Body() body: CreateLedgerDto): Promise<LedgerResponseDto> {
    const response = await this.ledgerService.createLedger(body);
    return ledgerToApiV1Response(response);
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
    type: LedgerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Ledger not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async retrieveLedger(@Param('id') id: string): Promise<LedgerResponseDto> {
    const response = await this.ledgerService.retrieveLedger(id);
    return ledgerToApiV1Response(response);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a ledger by ID',
    description: 'Updates an existing ledger by its unique identifier with the provided fields',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the ledger to update',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiOkResponse({
    description: 'The ledger has been successfully updated',
    type: LedgerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Ledger not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async updateLedger(
    @Param('id') id: string,
    @Body() data: UpdateLedgerDto,
  ): Promise<LedgerResponseDto> {
    const response = await this.ledgerService.update(id, data);
    return ledgerToApiV1Response(response);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List ledgers',
    description: 'Retrieves a paginated list of ledgers',
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
          items: { $ref: '#/components/schemas/LedgerResponseDto' },
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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing API key' })
  async listLedgers(
    @Query() queryParams: ListLedgerRequestDto,
  ): Promise<CursorPaginatedResult<LedgerResponseDto>> {
    const response = await this.ledgerService.paginate(queryParams);
    return { ...response, data: response.data.map(ledgerToApiV1Response) };
  }
}

@ApiTags('ledgers')
@ApiSecurity('api-key')
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '0', path: 'ledgers' })
export class MTLedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(MTCursorPaginationInterceptor)
  @ApiOperation({
    summary: 'List ledgers following Modern Treasury format',
    description: 'Retrieves a paginated list of ledgers',
  })
  @ApiOkResponse({
    description: 'The ledgers have been successfully retrieved',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/LedgerResponseDto' },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async listLegders(
    @Query() queryParams: ListLedgerRequestDto,
  ): Promise<CursorPaginatedResult<LedgerResponseDto>> {
    const response = await this.ledgerService.paginate(queryParams);
    return { ...response, data: response.data.map(ledgerToApiV1Response) };
  }
}
