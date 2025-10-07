import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    nullable: true,
    type: String,
  })
  description: string | null;

  @ApiPropertyOptional({
    description:
      'Additional data represented as key-value pairs. Both the key and value must be strings.',
    type: 'object',
    example: { key: 'currency', value: 'USD' },
    additionalProperties: { type: 'string', minLength: 1, maxLength: 1 },
  })
  metadata: Record<string, string>;

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
