import { Cascade, Collection, Entity, OneToMany, Property } from '@mikro-orm/core';

import { BaseMikroOrmEntity } from '@libs/database';

import type { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import type { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';

@Entity({ tableName: 'ledgers' })
export class LedgerEntity extends BaseMikroOrmEntity {
  @Property({ type: 'varchar', length: 255 })
  name: string;

  @Property({ type: 'varchar', length: 255 })
  description: string;

  @Property({ type: 'integer', fieldName: 'tiger_beetle_id', persist: false })
  tigerBeetleId: number;

  @OneToMany('LedgerMetadataEntity', 'ledger', {
    cascade: [Cascade.PERSIST],
  })
  metadata = new Collection<LedgerMetadataEntity>(this);

  @OneToMany('LedgerAccountEntity', 'ledger', {
    cascade: [Cascade.PERSIST],
  })
  ledgerAccounts = new Collection<LedgerAccountEntity>(this);
}
