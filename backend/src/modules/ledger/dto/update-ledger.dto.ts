import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsMetadata } from '@libs/api/validators/is-metadata.validator';

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
  name: string;

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
  description: string;

  @ApiPropertyOptional({
    description:
      'Additional data represented as key-value pairs. Both the key and value must be strings.',
    type: 'object',
    example: { key: 'currency', value: 'USD' },
    additionalProperties: { type: 'string', maxLength: 255, minLength: 3 },
  })
  @IsOptional()
  @IsObject()
  @IsMetadata({ message: 'metadata must have string keys/values max length 255' })
  metadata: Record<string, string>;
}
