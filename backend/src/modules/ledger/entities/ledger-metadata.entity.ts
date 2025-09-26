import { Entity, ManyToOne, Property } from '@mikro-orm/core';

import { BaseMikroOrmEntity } from '@libs/database';

import type { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import type { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

@Entity({ tableName: 'ledger_metadata' })
export class LedgerMetadataEntity extends BaseMikroOrmEntity {
  @Property({ type: 'varchar', length: 255 })
  key: string;

  @Property({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne('LedgerEntity', {
    deleteRule: 'cascade',
    fieldName: 'ledger_id',
  })
  ledger: LedgerEntity;
}

@Entity({ tableName: 'ledger_account_metadata' })
export class LedgerAccountMetadataEntity extends BaseMikroOrmEntity {
  @Property({ type: 'varchar', length: 255 })
  key: string;

  @Property({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne('LedgerAccountEntity', {
    deleteRule: 'cascade',
    fieldName: 'ledger_account_id',
  })
  ledgerAccount: LedgerAccountEntity;
}
