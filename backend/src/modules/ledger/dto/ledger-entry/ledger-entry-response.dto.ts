import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LedgerTransactionStatusEnum, NormalBalanceEnum } from '@libs/enums';
import { uuidV7 } from '@libs/utils/uuid';

class LedgerEntryAccountDto {
  @ApiProperty({
    description: 'Ledger account unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'Name of the ledger account', example: 'Cash account' })
  name: string;
}

class LedgerEntryTransactionDto {
  @ApiProperty({ description: 'Unique identifier for the transaction', example: uuidV7() })
  id: string;

  @ApiProperty({
    description: 'External system ID for cross-reference',
    example: uuidV7(),
  })
  externalId: string;
}

class LedgerEntryCurrencyDto {
  @ApiProperty({ description: 'Currency code (ISO 4217)', example: 'USD' })
  code: string;

  @ApiProperty({
    description: 'Currency exponent (e.g., 2 for USD, meaning 2 decimal places)',
    example: 2,
  })
  exponent: number;
}

export class LedgerEntryStandaloneResponseDto {
  @ApiProperty({ description: 'Unique identifier for the ledger entry', example: uuidV7() })
  id: string;

  @ApiProperty({
    description: 'Timestamp when the entry was created',
    example: '2025-10-03T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the entry was last updated',
    example: '2025-10-03T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Amount for the ledger entry (in smallest currency unit)',
    example: 1000,
  })
  amount: number;

  @ApiProperty({
    description: 'Direction of the entry (debit or credit)',
    enum: NormalBalanceEnum,
    example: NormalBalanceEnum.DEBIT,
  })
  direction: NormalBalanceEnum;

  @ApiProperty({
    description: 'ID of the associated ledger',
    example: uuidV7(),
  })
  ledgerId: string;

  @ApiProperty({
    description: 'Associated ledger transaction',
  })
  ledgerTransaction: LedgerEntryTransactionDto;

  @ApiProperty({
    description: 'Associated ledger account',
  })
  ledgerAccount: LedgerEntryAccountDto;

  @ApiProperty({
    description: 'Currency for the ledger entry derived from the ledger account ',
  })
  currency: LedgerEntryCurrencyDto;

  @ApiProperty({
    description: 'Status of the entry',
    enum: LedgerTransactionStatusEnum,
    example: LedgerTransactionStatusEnum.POSTED,
  })
  status: LedgerTransactionStatusEnum;

  @ApiPropertyOptional({
    description: 'Additional metadata as key-value pairs. Both keys and values must be strings.',
    type: 'object',
    example: { source: 'api', tag: 'invoice' },
    additionalProperties: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  metadata?: Record<string, string>;
}
