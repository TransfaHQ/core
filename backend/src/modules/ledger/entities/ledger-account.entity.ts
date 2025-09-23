import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';
import { TigerBeetleIdTransformer } from '@libs/database/column-transformer';
import { NormalBalanceEnum } from '@libs/enums';

import { CurrencyEntity } from '@modules/ledger/entities/currency.entity';
import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { LedgerAccountBalances } from '@modules/ledger/types';

@Entity('ledger_accounts')
export class LedgerAccountEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'bytea', name: 'tiger_beetle_id', transformer: new TigerBeetleIdTransformer() })
  tigerBeetleId: bigint;

  @Column({ type: 'varchar', name: 'external_id', length: 180, unique: true })
  externalId: string;

  @Column({ type: 'varchar', name: 'currency_code', length: 10 })
  currencyCode: string;

  @Column({ type: 'smallint', name: 'currency_exponent' })
  currencyExponent: number;

  @OneToMany(() => LedgerAccountMetadataEntity, (metadata) => metadata.ledgerAccount, {
    cascade: true,
  })
  metadata: LedgerAccountMetadataEntity[];

  @ManyToOne(() => LedgerEntity, (ledger) => ledger.ledgerAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ledger_id' })
  ledger: LedgerEntity;

  @ManyToOne(() => CurrencyEntity, (currency) => currency.ledgerAccounts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'currency_code', referencedColumnName: 'code' })
  currency: CurrencyEntity;

  @Column({ name: 'normal_balance', type: 'varchar', length: 6 })
  normalBalance: NormalBalanceEnum;

  balances: LedgerAccountBalances;
}
