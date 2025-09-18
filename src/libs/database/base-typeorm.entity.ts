import {
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

export abstract class BaseTypeormEntity {
  constructor(props?: unknown) {
    if (props) {
      Object.assign(this, props);
    }
  }

  @PrimaryColumn({ update: false, type: 'uuid' })
  id: string;

  @CreateDateColumn({ insert: true, type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at' })
  deletedAt: Date;

  @BeforeInsert()
  setId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
