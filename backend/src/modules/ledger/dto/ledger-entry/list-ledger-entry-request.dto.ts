import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedRequestDto } from '@libs/api/paginated-request.dto';
import { NormalBalanceEnum } from '@libs/enums';

export class ListLedgerEntryRequestDto extends PaginatedRequestDto {
  @ApiPropertyOptional({
    description: 'Filter by ledger ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  ledgerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction ID (native)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction external ID',
    example: 'tx_external_123',
  })
  @IsOptional()
  @IsString()
  transactionExternalId?: string;

  @ApiPropertyOptional({
    description: 'Filter by account ID (native)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by account external ID',
    example: 'acc_external_123',
  })
  @IsOptional()
  @IsString()
  accountExternalId?: string;

  @ApiPropertyOptional({
    description: 'Filter by direction (credit or debit)',
    enum: NormalBalanceEnum,
    example: NormalBalanceEnum.DEBIT,
  })
  @IsOptional()
  @IsEnum(NormalBalanceEnum)
  balanceDirection?: NormalBalanceEnum;
}
