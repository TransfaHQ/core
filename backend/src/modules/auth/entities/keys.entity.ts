import { Entity, Property } from '@mikro-orm/core';

import { BaseMikroOrmEntity } from '@libs/database';

@Entity({ tableName: 'keys' })
export class KeysEntity extends BaseMikroOrmEntity {
  @Property({ type: 'varchar', length: 255 })
  secret: string;
}
