import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsMetadata } from '@libs/api/validators/is-metadata.validator';
import { NormalBalanceEnum } from '@libs/enums';

export class CreateLedgerAccountDto {
  @ApiProperty({
    description: 'Ledger id associated with the ledger account',
    example: '550e8400-e29b-41d4-a716-446655440000',
    minLength: 36,
    maxLength: 36,
  })
  @IsUUID()
  ledgerId: string;

  @ApiProperty({
    description: 'Name of the ledger account',
    example: 'Company General Ledger',
    minLength: 3,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the ledger account purpose',
    example: 'Main accounting ledger account for company operations',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Additional data represented as key-value pairs. Both the key and value must be strings.',
    type: 'object',
    example: { currency: 'USD', region: 'US' },
    additionalProperties: { type: 'string', maxLength: 255, minLength: 3 },
  })
  @IsOptional()
  @IsObject()
  @IsMetadata({ message: 'metadata must have string keys/values max length 255' })
  metadata?: Record<string, string>;

  @ApiProperty({
    description: 'Currency code of the ledger account (ISO 4217)',
    example: 'USD',
    minLength: 3,
    maxLength: 4,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(4)
  currency: string;

  @ApiProperty({
    description: 'Normal balance type for the ledger account',
    enum: NormalBalanceEnum,
    example: NormalBalanceEnum.DEBIT,
  })
  @IsEnum(NormalBalanceEnum)
  normalBalance: NormalBalanceEnum;

  @ApiPropertyOptional({
    description: 'External identifier for the ledger account',
    minLength: 1,
    maxLength: 180,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  externalId?: string;

  @ApiPropertyOptional({ description: 'Max available balance on the account.', example: 1_000_000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBalanceLimit: number | null;

  @ApiPropertyOptional({ description: 'Min available balance on the account.', example: 100_000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBalanceLimit: number | null;
}
