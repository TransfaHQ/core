import { Column, Entity, OneToMany } from 'typeorm';

import { BaseTypeormEntity } from '@libs/database';

import {
  LedgerAccountMetadataEntity,
  LedgerMetadataEntity,
} from '@modules/ledger/entities/ledger-metadata.entity';

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

  @OneToMany(() => LedgerAccountMetadataEntity, (metadata) => metadata.ledger, {
    cascade: true,
  })
  metadata: LedgerMetadataEntity[];
}
