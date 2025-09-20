import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { API_PAGE_MAX_NUMBER, API_PAGE_SIZE, API_PAGE_SIZE_MAX } from '@libs/constants';

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
    description: 'Page number for pagination (1-based)',
    example: 1,
    minimum: 0,
    maximum: API_PAGE_MAX_NUMBER,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(API_PAGE_MAX_NUMBER)
  @Type(() => Number)
  readonly page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cursor for cursor-based pagination',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @Type(() => String)
  readonly cursor?: string;
}
