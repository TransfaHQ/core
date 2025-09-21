import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Entity('ledger_metadata')
export class LedgerMetadataEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne(() => LedgerEntity, (ledger) => ledger.metadata, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ledger_id' })
  ledger: LedgerEntity;
}

@Entity('ledger_account_metadata')
export class LedgerAccountMetadataEntity extends BaseTypeormEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne(() => LedgerAccountEntity, (ledger) => ledger.metadata, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ledger_account_id' })
  ledger: LedgerAccountEntity;
}
