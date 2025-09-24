import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';

@Entity('currencies')
export class CurrencyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'smallint' })
  exponent: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => LedgerAccountEntity, (ledgerAccount) => ledgerAccount.currency)
  ledgerAccounts: LedgerAccountEntity[];
}
