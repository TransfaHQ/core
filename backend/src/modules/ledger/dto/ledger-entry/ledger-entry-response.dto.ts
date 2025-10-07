import { ApiProperty } from '@nestjs/swagger';

import { NormalBalanceEnum } from '@libs/enums';
import { uuidV7 } from '@libs/utils/uuid';

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
    description: 'ID of the associated ledger transaction',
    example: uuidV7(),
  })
  ledgerTransactionId: string;

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

  @ApiProperty({
    description: 'External ID of the associated ledger transaction',
    example: 'tx_external_123',
  })
  ledgerTransactionExternalId: string;
}
