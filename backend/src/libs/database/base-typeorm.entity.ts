import { CreateDateColumn, DeleteDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseTypeormEntity {
  constructor(props?: unknown) {
    if (props) {
      Object.assign(this, props);
    }
  }

  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id: string;

  @CreateDateColumn({ insert: true, type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at' })
  deletedAt: Date;
}
