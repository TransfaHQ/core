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
    description: "Description of the ledger's purpose",
    example: 'Main accounting ledger for company operations',
    nullable: true,
    type: String,
  })
  description: string | null;

  @ApiPropertyOptional({
    description:
      'Additional data represented as key-value pairs. Both the key and value must be strings.',
    type: 'object',
    example: { source: 'web' },
    additionalProperties: { type: 'string' },
  })
  metadata: Record<string, string>;

  @ApiProperty({
    example: '2023-12-01T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-12-01T10:00:00Z',
  })
  updatedAt: Date;
}
