import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

import { ApiKeyOrJwtGuard } from '@modules/auth/guards/api-key-or-jwt.guard';
import { currencyToApiV1Response } from '@modules/ledger/controllers/api-response';
import { CreateCurrencyDto } from '@modules/ledger/dto/currency/create-currency.dto';
import { CurrencyResponseDto } from '@modules/ledger/dto/currency/currency-response.dto';
import { ListCurrencyRequestDto } from '@modules/ledger/dto/currency/list-currency-request.dto';
import { CurrencyService, PaginatedResult } from '@modules/ledger/services/currency.service';

@ApiTags('currencies')
@ApiSecurity('basic')
@UseGuards(ApiKeyOrJwtGuard)
@Controller({ version: '1', path: 'currencies' })
export class CurrencyController {
  constructor(private currencyService: CurrencyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new currency',
    description: 'Creates a new currency with the provided details',
  })
  @ApiCreatedResponse({
    description: 'The currency has been successfully created',
    type: CurrencyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or currency code already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async createCurrency(@Body() body: CreateCurrencyDto): Promise<CurrencyResponseDto> {
    const response = await this.currencyService.createCurrency(body);
    return currencyToApiV1Response(response);
  }

  @Get(':code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a currency by code',
    description: 'Retrieves a single currency by its code',
  })
  @ApiParam({
    name: 'code',
    description: 'Currency code (e.g., USD, EUR)',
    example: 'USD',
  })
  @ApiOkResponse({
    description: 'The currency has been successfully retrieved',
    type: CurrencyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Currency not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async getCurrency(@Param('code') code: string): Promise<CurrencyResponseDto> {
    const response = await this.currencyService.findByCode(code);
    return currencyToApiV1Response(response);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List currencies',
    description: 'Retrieves a paginated list of currencies',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search currencies by code or name (partial match)',
    example: 'USD',
  })
  @ApiOkResponse({
    description: 'The currencies have been successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CurrencyResponseDto' },
        },
        total: {
          type: 'number',
          description: 'Total number of currencies',
        },
        page: {
          type: 'number',
          description: 'Current page number',
        },
        limit: {
          type: 'number',
          description: 'Items per page',
        },
        totalPages: {
          type: 'number',
          description: 'Total number of pages',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async listCurrencies(
    @Query() queryParams: ListCurrencyRequestDto,
  ): Promise<PaginatedResult<CurrencyResponseDto>> {
    const response = await this.currencyService.paginate(
      queryParams.page,
      queryParams.limit,
      queryParams.search,
    );
    return {
      ...response,
      data: response.data.map(currencyToApiV1Response),
    };
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a currency by code',
    description: 'Deletes a currency by its code. Cannot delete if ledger accounts are using it.',
  })
  @ApiParam({
    name: 'code',
    description: 'Currency code to delete',
    example: 'BTC',
  })
  @ApiOkResponse({
    description: 'The currency has been successfully deleted',
  })
  @ApiBadRequestResponse({
    description: 'Currency is being used by ledger accounts and cannot be deleted',
  })
  @ApiNotFoundResponse({
    description: 'Currency not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing API key',
  })
  async deleteCurrency(@Param('code') code: string): Promise<void> {
    await this.currencyService.deleteCurrency(code);
  }
}
