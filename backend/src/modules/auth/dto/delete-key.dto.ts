import { IsUUID } from 'class-validator';

export class DeleteKeyDto {
  @IsUUID()
  id: string;
}
