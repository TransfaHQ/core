import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLedgerAccountsTable1760045414688 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_accounts
          ADD COLUMN bound_check_account_tiger_beetle_id bytea UNIQUE,
          ADD COLUMN bound_funding_account_tiger_beetle_id bytea UNIQUE,
          ADD COLUMN min_balance_limit NUMERIC CHECK (min_balance_limit >= 0),
          ADD COLUMN max_balance_limit NUMERIC CHECK (max_balance_limit >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_accounts
          DROP COLUMN IF EXISTS bound_check_account_tiger_beetle_id,
          DROP COLUMN IF EXISTS bound_funding_account_tiger_beetle_id,
          DROP COLUMN IF EXISTS min_balance_limit,
          DROP COLUMN IF EXISTS max_balance_limit;
    `);
  }
}
