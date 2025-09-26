import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'currencies' })
export class CurrencyEntity {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Property({ type: 'smallint' })
  exponent: number;

  @Property({ type: 'varchar', length: 100 })
  name: string;

  @Property({ fieldName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
