import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  createdAt: Date | null;

  @Expose()
  updatedAt: Date | null;
}
