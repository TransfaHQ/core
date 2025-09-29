import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { API_PAGE_SIZE, API_PAGE_SIZE_MAX } from '@libs/constants';

export class PaginatedRequestDto {
  @ApiPropertyOptional({
    description: 'Number of items to return per page',
    example: 20,
    minimum: 0,
    maximum: API_PAGE_SIZE_MAX,
    default: API_PAGE_SIZE,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(API_PAGE_SIZE_MAX)
  @Type(() => Number)
  readonly limit?: number = API_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Cursor for cursor-based pagination',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @Type(() => String)
  readonly cursor?: string;

  @ApiPropertyOptional({
    description: 'Direction to paginate: next for forward, prev for backward',
    enum: ['next', 'prev'],
    example: 'next',
    default: 'next',
  })
  @IsOptional()
  @IsEnum(['next', 'prev'])
  @Type(() => String)
  readonly direction?: 'next' | 'prev';
}
