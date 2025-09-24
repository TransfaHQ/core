import { IsInt, IsNotEmpty, IsString, Length, Max, Min } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({
    description: 'Currency code (e.g., USD, EUR, BTC)',
    example: 'BTC',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  code: string;

  @ApiProperty({
    description: 'Number of decimal places for the currency',
    example: 8,
    minimum: 0,
    maximum: 18,
  })
  @IsInt()
  @Min(0)
  @Max(18)
  exponent: number;

  @ApiProperty({
    description: 'Full name of the currency',
    example: 'Bitcoin',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;
}
