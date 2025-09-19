import { Column, Entity } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

@Entity('ledger_account')
export class LedgerAccountEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'bigint', name: 'tiger_beetle_id' })
  tigerBeetleId: bigint;

  @Column({ type: 'varchar', name: 'external_id', length: 180, unique: true })
  externalId: string;

  @Column({ type: 'varchar', length: 5 })
  currency: string;

  @Column({ name: 'currency_exponent', type: 'smallint' })
  currencyExponent: number;
}
