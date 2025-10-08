import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEffectivateDateToTransactionTable1759954902967 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            alter table ledger_transactions add column effective_at timestamptz default now()
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter table ledger_transactions drop column effective_at`);
  }
}
