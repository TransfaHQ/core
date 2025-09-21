import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { LedgerMetadataDto } from '@modules/ledger/dto/ledger-metadata.dto';

export class UpdateLedgerDto {
  @ApiPropertyOptional({
    description: 'Name of the ledger',
    example: 'Company General Ledger',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the ledger purpose',
    example: 'Main accounting ledger for company operations',
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
    type: [LedgerMetadataDto],
    example: [
      { key: 'currency', value: 'USD' },
      { key: 'region', value: 'NA' },
    ],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LedgerMetadataDto)
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(250)
  metadata?: LedgerMetadataDto[];
}