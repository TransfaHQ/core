import { Column, Entity } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

@Entity('user')
export class UserEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;
}
