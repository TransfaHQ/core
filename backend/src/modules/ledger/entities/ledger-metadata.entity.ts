import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

import type { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import type { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Entity('ledger_metadata')
export class LedgerMetadataEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne('LedgerEntity', 'metadata', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ledger_id' })
  ledger: Relation<LedgerEntity>;
}

@Entity('ledger_account_metadata')
export class LedgerAccountMetadataEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne('LedgerAccountEntity', 'metadata', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ledger_account_id' })
  ledgerAccount: Relation<LedgerAccountEntity>;
}
