import { BaseEntity, PrimaryKey, Property } from '@mikro-orm/core';

export abstract class BaseMikroOrmEntity extends BaseEntity {
  constructor(props?: unknown) {
    super();
    if (props) {
      Object.assign(this, props);
    }
  }

  @PrimaryKey({ type: 'uuid', defaultRaw: 'uuid_generate_v7()' })
  id: string;

  @Property({ fieldName: 'created_at', defaultRaw: 'now()', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ fieldName: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
