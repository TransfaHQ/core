import { Column, Entity, OneToMany } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';

@Entity('ledger')
export class LedgerEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'int', name: 'tiger_beetle_id' })
  tigerBeetleId: number;

  @OneToMany(() => LedgerMetadataEntity, (metadata) => metadata.ledger, {
    cascade: true,
  })
  metadata: LedgerMetadataEntity[];

  @OneToMany(() => LedgerAccountEntity, (account) => account.ledger, {
    cascade: true,
  })
  ledgerAccounts: LedgerAccountEntity[];
}
