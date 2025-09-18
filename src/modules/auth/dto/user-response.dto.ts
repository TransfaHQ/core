import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: bigint;

  @Expose()
  email: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
