import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexToLedgerMetadata1758420577768 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE UNIQUE INDEX idx_ledger_metadata_ledger_key_unique
            ON ledger_metadata(ledger_id, key);
        `);

    await queryRunner.query(`
            CREATE UNIQUE INDEX idx_ledger_account_metadata_account_key_unique
            ON ledger_account_metadata(ledger_account_id, key);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX IF EXISTS idx_ledger_metadata_ledger_key_unique;
        `);

    await queryRunner.query(`
            DROP INDEX IF EXISTS idx_ledger_account_metadata_account_key_unique;
        `);
  }
}
