import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedRequestDto } from '@libs/api/paginated-request.dto';
import { NormalBalanceEnum } from '@libs/enums';

export class ListLedgerAccountRequestDto extends PaginatedRequestDto {
  @ApiPropertyOptional({
    description: 'Filter by ledger ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  ledger_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by currency code',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Filter by normal balance type',
    enum: NormalBalanceEnum,
    example: NormalBalanceEnum.DEBIT,
  })
  @IsOptional()
  @IsEnum(NormalBalanceEnum)
  normal_balance?: NormalBalanceEnum;
}
