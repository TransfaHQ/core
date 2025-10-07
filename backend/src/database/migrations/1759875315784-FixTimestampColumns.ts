import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTimestampColumns1759875315784 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix ledger_transactions timestamp columns
    // Convert existing TIMESTAMP WITHOUT TIME ZONE to TIMESTAMPTZ
    // Using AT TIME ZONE 'UTC' to ensure existing data is treated as UTC
    await queryRunner.query(`
      ALTER TABLE ledger_transactions
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING deleted_at AT TIME ZONE 'UTC';
    `);

    // Fix ledger_entries timestamp columns
    await queryRunner.query(`
      ALTER TABLE ledger_entries
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING deleted_at AT TIME ZONE 'UTC';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert ledger_transactions timestamp columns back to TIMESTAMP WITHOUT TIME ZONE
    await queryRunner.query(`
      ALTER TABLE ledger_transactions
        ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN deleted_at TYPE TIMESTAMP WITHOUT TIME ZONE USING deleted_at AT TIME ZONE 'UTC';
    `);

    // Revert ledger_entries timestamp columns
    await queryRunner.query(`
      ALTER TABLE ledger_entries
        ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN deleted_at TYPE TIMESTAMP WITHOUT TIME ZONE USING deleted_at AT TIME ZONE 'UTC';
    `);
  }
}
