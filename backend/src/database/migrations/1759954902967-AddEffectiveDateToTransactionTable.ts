import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEffectiveDateToTransactionTable1759954902967 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            alter table ledger_transactions add column effective_at timestamptz not null default now();
            CREATE INDEX idx_ledger_transactions_effective_at ON ledger_transactions(effective_at);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        drop index if exists idx_ledger_transactions_effective_at;
        alter table ledger_transactions drop column effective_at;
    `);
  }
}
