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

import { CursorPaginationInterceptor } from '@libs/api/cursor-paginated.interceptor';
import { CursorPaginatedResult } from '@libs/database';

import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CreateLedgerDto } from '@modules/ledger/dto/create-ledger.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
import { ListLedgerRequestDto } from '@modules/ledger/dto/list-ledger.dto';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@UseGuards(ApiKeyGuard)
@Controller({ version: '1', path: 'ledgers' })
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLedger(
    @Body()
    body: CreateLedgerDto,
  ): Promise<LedgerResponseDto> {
    return this.ledgerService.createLedger(body);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async retrieveLedger(@Param('id') id: string): Promise<LedgerResponseDto> {
    return this.ledgerService.retrieveLedger(id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CursorPaginationInterceptor)
  async listLegders(
    @Query() queryParams: ListLedgerRequestDto,
  ): Promise<CursorPaginatedResult<LedgerResponseDto>> {
    return this.ledgerService.paginate(queryParams.limit, queryParams.cursor);
  }
}
