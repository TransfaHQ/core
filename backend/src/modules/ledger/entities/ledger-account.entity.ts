import { Column, Entity } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';
import { CurrencyCode } from '@libs/utils/currency';

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

  @Column({ type: 'varchar', length: 25 })
  currency: CurrencyCode;

  @Column({ name: 'currency_exponent', type: 'int' })
  currencyExponent: number;
}
