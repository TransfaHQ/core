import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NormalBalanceEnum } from '@libs/enums';
import { uuidV7 } from '@libs/utils/uuid';

export class LedgerEntryResponseDto {
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
    description: 'ID of the associated ledger account',
    example: uuidV7(),
  })
  ledgerAccountId: string;

  @ApiProperty({ description: 'Currency code for the ledger account (ISO 4217)', example: 'USD' })
  ledgerAccountCurrency: string;

  @ApiProperty({
    description: 'Currency exponent (e.g., 2 for USD, meaning 2 decimal places)',
    example: 2,
  })
  ledgerAccountCurrencyExponent: number;

  @ApiProperty({
    description: 'Name of the associated ledger account',
    example: 'Cash Account',
  })
  ledgerAccountName: string;
}

export class LedgerTransactionResponseDto {
  @ApiProperty({ description: 'Unique identifier for the transaction', example: uuidV7() })
  id: string;

  @ApiProperty({
    description: 'Timestamp when the transaction was created',
    example: '2025-10-03T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the transaction was last updated',
    example: '2025-10-03T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'External system ID for cross-reference',
    example: uuidV7(),
  })
  externalId: string;

  @ApiProperty({
    description: 'Description or memo for the transaction',
    example: 'Payout for September',
  })
  description: string;

  @ApiProperty({
    description: 'List of ledger entries associated with the transaction',
    type: [LedgerEntryResponseDto],
    minItems: 2,
    example: [
      {
        id: '0199aaf9-9a19-736c-a9cb-21aaaf7e1218',
        createdAt: '2025-10-03T10:00:00.000Z',
        updatedAt: '2025-10-03T12:00:00.000Z',
        amount: 1000,
        direction: 'credit',
        ledgerAccountId: '0199aaf9-9a19-736c-a9cb-24af81bf5d1a',
        ledgerAccountCurrency: 'USD',
        ledgerAccountCurrencyExponent: 2,
      },
      {
        id: '0199aaf9-9a19-736c-a9cb-21aaaf7e1217',
        createdAt: '2025-10-03T10:00:00.000Z',
        updatedAt: '2025-10-03T12:00:00.000Z',
        amount: 1000,
        direction: 'debit',
        ledgerAccountId: '0199aaf9-9a19-736c-a9cb-24af81bf5d1b',
        ledgerAccountCurrency: 'USD',
        ledgerAccountCurrencyExponent: 2,
      },
    ],
  })
  ledgerEntries: LedgerEntryResponseDto[];

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

  @ApiProperty({
    example: '2025-10-08T20:53:21.239Z',
    description: 'Format: ISO8601. Defaults to time of insertion in the DB if not provided',
    required: false,
  })
  readonly effectiveAt: Date;
}
