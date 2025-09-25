import { Column, Entity, OneToMany, type Relation } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';

@Entity('ledgers')
export class LedgerEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'int', name: 'tiger_beetle_id', update: false })
  tigerBeetleId: number;

  @OneToMany('LedgerMetadataEntity', 'ledger', {
    cascade: true,
  })
  metadata: Relation<LedgerMetadataEntity[]>;

  @OneToMany('LedgerAccountEntity', 'ledger', {
    cascade: true,
  })
  ledgerAccounts: Relation<LedgerAccountEntity[]>;
}
