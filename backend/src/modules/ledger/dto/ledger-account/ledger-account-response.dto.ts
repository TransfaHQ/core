import { IsNumber, IsString, Max, Min } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BalanceDto {
  @ApiProperty({ description: 'Total credits', example: 1000 })
  @IsNumber()
  credits: number;

  @ApiProperty({ description: 'Total debits', example: 500 })
  @IsNumber()
  debits: number;

  @ApiProperty({ description: 'Net amount', example: 500 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Currency exponent (number of decimal places, e.g., 2 for USD)',
    example: 2,
    minimum: 0,
    maximum: 30,
  })
  @IsNumber()
  @Min(0)
  @Max(30)
  currencyExponent: number;
}

export class LedgerAccountBalancesDto {
  @ApiProperty({ type: BalanceDto, description: 'Pending balance' })
  pendingBalance: BalanceDto;

  @ApiProperty({ type: BalanceDto, description: 'Posted balance' })
  postedBalance: BalanceDto;

  @ApiProperty({ type: BalanceDto, description: 'Available balance' })
  availableBalance: BalanceDto;
}

export class LedgerAccountResponseDto {
  @ApiProperty({
    description: 'Ledger account unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Name of the ledger account', example: 'Company General Ledger' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the ledger account',
    example: 'Main accounting ledger account',
    nullable: true,
    type: String,
  })
  @IsString()
  description: string | null;

  @ApiProperty({ description: 'Normal balance type', example: 'DEBIT' })
  @IsString()
  normalBalance: string;

  @ApiProperty({
    description: 'Associated ledger ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  ledgerId: string;

  @ApiProperty({
    description: 'External identifier for the ledger account',
    example: 'EXT-12345',
    nullable: true,
    type: String,
  })
  @IsString()
  externalId: string | null;

  @ApiProperty({ type: LedgerAccountBalancesDto, description: 'Balances of the ledger account' })
  balances: LedgerAccountBalancesDto;

  @ApiPropertyOptional({
    description:
      'Additional data represented as key-value pairs. Both the key and value must be strings.',
    type: 'object',
    example: { key: 'currency', value: 'USD' },
    additionalProperties: { type: 'string', minLength: 1, maxLength: 1 },
  })
  metadata: Record<string, string>;

  @ApiProperty({ description: 'Creation timestamp', example: new Date() })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: new Date() })
  updatedAt: Date;
}
