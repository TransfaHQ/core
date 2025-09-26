import { Cascade, Collection, Entity, ManyToOne, OneToMany, Property } from '@mikro-orm/core';

import { BaseMikroOrmEntity } from '@libs/database';
import { TigerBeetleIdType } from '@libs/database/column-transformer';
import { NormalBalanceEnum } from '@libs/enums';

import type { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import type { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { LedgerAccountBalances } from '@modules/ledger/types';

@Entity({ tableName: 'ledger_accounts' })
export class LedgerAccountEntity extends BaseMikroOrmEntity {
  @Property({ type: 'varchar', length: 255 })
  name: string;

  @Property({ type: 'varchar', length: 255 })
  description?: string;

  @Property({
    type: TigerBeetleIdType,
    fieldName: 'tiger_beetle_id',
  })
  tigerBeetleId: bigint;

  @Property({
    type: 'varchar',
    fieldName: 'external_id',
    length: 180,
    unique: true,
    nullable: true,
  })
  externalId?: string;

  @Property({ type: 'varchar', fieldName: 'currency_code', length: 10 })
  currencyCode: string;

  @Property({ type: 'smallint', fieldName: 'currency_exponent' })
  currencyExponent: number;

  @OneToMany('LedgerAccountMetadataEntity', 'ledgerAccount', {
    cascade: [Cascade.PERSIST],
  })
  metadata = new Collection<LedgerAccountMetadataEntity>(this);

  @ManyToOne('LedgerEntity', {
    deleteRule: 'cascade',
  })
  ledger: LedgerEntity;

  @Property({ fieldName: 'normal_balance', type: 'varchar', length: 6 })
  normalBalance: NormalBalanceEnum;

  balances: LedgerAccountBalances;
}
