import { ApiProperty } from '@nestjs/swagger';

export class LedgerResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the ledger',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the ledger',
    example: 'Company General Ledger',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the ledger purpose',
    example: 'Main accounting ledger for company operations',
  })
  description: string;

  @ApiProperty({
    description: 'Timestamp when the ledger was created',
    example: '2023-12-01T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the ledger was last updated',
    example: '2023-12-01T10:00:00Z',
  })
  updatedAt: Date;
}
