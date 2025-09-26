import { Entity, Property } from '@mikro-orm/core';

import { BaseMikroOrmEntity } from '@libs/database';

@Entity({ tableName: 'users' })
export class UserEntity extends BaseMikroOrmEntity {
  @Property({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Property({ type: 'varchar', length: 255 })
  password: string;

  @Property({ type: 'boolean', default: true, fieldName: 'is_active' })
  isActive: boolean;
}
