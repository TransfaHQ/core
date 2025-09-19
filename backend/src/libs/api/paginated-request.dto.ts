import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { API_PAGE_MAX_NUMBER, API_PAGE_SIZE, API_PAGE_SIZE_MAX } from '@libs/constants';

export class PaginatedRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(API_PAGE_SIZE_MAX)
  @Type(() => Number)
  readonly limit?: number = API_PAGE_SIZE;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(API_PAGE_MAX_NUMBER)
  @Type(() => Number)
  readonly page?: number = 1;

  @IsOptional()
  @Type(() => String)
  readonly cursor?: string;
}
