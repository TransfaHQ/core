import { Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  @Expose()
  token: string;
}
