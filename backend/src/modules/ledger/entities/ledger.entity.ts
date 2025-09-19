import { Column, Entity } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

@Entity('ledger')
export class LedgerEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'int', name: 'tiger_beetle_id' })
  tigerBeetleId: number;
}
