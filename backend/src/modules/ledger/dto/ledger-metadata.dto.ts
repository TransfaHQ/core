import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class LedgerMetadataDto {
  @ApiProperty({
    description: 'Name of key',
    example: 'key',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  key: string;

  @ApiProperty({
    description: 'Value associated with the key',
    example: 'value',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value: string;
}
