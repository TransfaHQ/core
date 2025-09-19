import { Column, Entity } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

@Entity('keys')
export class KeysEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  secret: string;
}