import { ApiProperty } from '@nestjs/swagger';

export class CurrencyResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the currency',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  code: string;

  @ApiProperty({
    description: 'Number of decimal places for the currency',
    example: 2,
  })
  exponent: number;

  @ApiProperty({
    description: 'Full name of the currency',
    example: 'US Dollar',
  })
  name: string;

  @ApiProperty({
    description: 'When the currency was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the currency was last updated',
    example: '2023-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
