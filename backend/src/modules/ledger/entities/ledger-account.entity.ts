import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';
import { ColumnNumericTransformer } from '@libs/database/column-transformer';
import { NormalBalanceEnum } from '@libs/enums';

import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { LedgerAccountBalances } from '@modules/ledger/types';

@Entity('ledger_account')
export class LedgerAccountEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'numeric', name: 'tiger_beetle_id', transformer: new ColumnNumericTransformer() })
  tigerBeetleId: bigint;

  @Column({ type: 'varchar', name: 'external_id', length: 180, unique: true })
  externalId: string;

  @Column({ type: 'varchar', length: 5 })
  currency: string;

  @Column({ name: 'currency_exponent', type: 'smallint' })
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

  @Column({ name: 'normal_balance', type: 'varchar', length: 6 })
  normalBalance: NormalBalanceEnum;

  balances: LedgerAccountBalances;
}
