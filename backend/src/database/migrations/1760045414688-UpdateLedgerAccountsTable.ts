import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLedgerAccountsTable1760045414688 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_accounts
          ADD COLUMN control_account_tiger_beetle_id bytea UNIQUE,
          ADD COLUMN operator_account_tiger_beetle_id bytea UNIQUE,
          ADD COLUMN balance_limit NUMERIC CHECK (balance_limit >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_accounts
          DROP COLUMN IF EXISTS control_account_tiger_beetle_id,
          DROP COLUMN IF EXISTS operator_account_tiger_beetle_id,
          DROP COLUMN IF EXISTS balance_limit;
    `);
  }
}
