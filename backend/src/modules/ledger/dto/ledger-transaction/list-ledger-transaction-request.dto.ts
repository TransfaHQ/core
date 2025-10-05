import { IsObject, IsOptional, IsString } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedRequestDto } from '@libs/api/paginated-request.dto';

export class ListLedgerTransactionRequestDto extends PaginatedRequestDto {
  @ApiPropertyOptional({
    description: 'Filter by external ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    description: 'Search by transaction description',
    example: 'Payment for invoice',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by metadata key/value pairs using Stripe convention: metadata[key]=value',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { source: 'api', tag: 'invoice' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
