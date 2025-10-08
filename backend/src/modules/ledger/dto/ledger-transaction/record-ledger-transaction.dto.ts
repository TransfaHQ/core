import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsValidDateOrDateTime } from '@libs/api/validators/is-date-or-datetime.validator';
import { IsMetadata } from '@libs/api/validators/is-metadata.validator';
import { uuidV7 } from '@libs/utils/uuid';

export class RecordLedgerEntryDto {
  @ApiProperty({
    description: 'UUID of the source ledger account',
    example: 'a7f68f16-9834-4a6e-9a7d-5e9f4fc1d1a2',
  })
  @IsUUID()
  sourceAccountId: string;

  @ApiProperty({
    description: 'UUID of the destination ledger account',
    example: 'b2e58f27-7234-4e3d-8b2c-8f8f8c5edc23',
  })
  @IsUUID()
  destinationAccountId: string;

  @ApiProperty({
    description: 'Amount to transfer',
    example: 10,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class RecordLedgerTransactionDto {
  @ApiProperty({
    description: 'Description or memo for the transaction',
    minLength: 3,
    maxLength: 255,
    example: 'Payout for September',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  description: string;

  @ApiProperty({
    description: 'External system reference ID (must be unique per transaction)',
    minLength: 1,
    maxLength: 180,
    example: uuidV7(),
  })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  externalId: string;

  @ApiProperty({
    description: 'Array of ledger entries involved in the transaction',
    type: [RecordLedgerEntryDto],
    minItems: 1,
    maxItems: 1000,
  })
  @ValidateNested({ each: true })
  @Type(() => RecordLedgerEntryDto)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  ledgerEntries: RecordLedgerEntryDto[];

  @ApiPropertyOptional({
    description:
      'Additional data represented as key-value pairs. Keys and values must be strings, max length 255.',
    type: 'object',
    example: { currency: 'USD', region: 'US' },
    additionalProperties: { type: 'string', maxLength: 255, minLength: 3 },
  })
  @IsOptional()
  @IsObject()
  @IsMetadata({ message: 'metadata must have string keys/values max length 255' })
  metadata?: Record<string, string>;

  @ApiPropertyOptional({
    example: '2025-10-08T20:53:21.239Z',
    description: 'Format: ISO8601. Defaults to time of insertion in the DB if not provided',
  })
  @IsOptional()
  @IsValidDateOrDateTime()
  readonly effectiveAt?: string;
}
