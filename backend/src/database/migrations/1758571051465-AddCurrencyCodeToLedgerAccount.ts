import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyCodeToLedgerAccount1758571051465 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ledger_account ADD COLUMN currency_code VARCHAR(10);`);

    // Migrate existing currency data to currency_code
    await queryRunner.query(`
				UPDATE ledger_account
				SET currency_code = currency
				WHERE currency IS NOT NULL;
		`);

    await queryRunner.query(`ALTER TABLE ledger_account ALTER COLUMN currency_code SET NOT NULL;`);

    await queryRunner.query(`ALTER TABLE ledger_account DROP COLUMN currency`);

    await queryRunner.query(`
				ALTER TABLE ledger_account
				ADD CONSTRAINT fk_ledger_account_currency_code
				FOREIGN KEY (currency_code) REFERENCES currencies(code) ON DELETE RESTRICT;
		`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
				ALTER TABLE ledger_account
				ADD COLUMN currency VARCHAR(5),
		`);

    // Migrate data back with currency codes
    await queryRunner.query(`
				UPDATE ledger_account
				SET currency = currency_code
				WHERE currency_code IS NOT NULL;
		`);

    await queryRunner.query(`
				ALTER TABLE ledger_account
				DROP CONSTRAINT IF EXISTS fk_ledger_account_currency_code;
		`);

    await queryRunner.query(`
				ALTER TABLE ledger_account
				DROP COLUMN currency_code;
		`);
  }
}
