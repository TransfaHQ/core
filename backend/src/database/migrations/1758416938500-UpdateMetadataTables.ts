import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMetadataTables1758416938500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_metadata ADD CONSTRAINT ledger_metadata_ledger_id_key_unique UNIQUE (ledger_id, key);
        ALTER TABLE ledger_account_metadata ADD CONSTRAINT ledger_account_metadata_ledger_account_id_key_unique UNIQUE (ledger_account_id, key);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_metadata DROP CONSTRAINT ledger_metadata_ledger_id_key_unique;
        ALTER TABLE ledger_account_metadata DROP CONSTRAINT ledger_account_metadata_ledger_account_id_key_unique;
    `);
  }
}
