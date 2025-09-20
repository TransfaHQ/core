import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLedgerMetadata1758349222273 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ledger_metadata (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
        ledger_id UUID NOT NULL REFERENCES ledger(id),
        key          VARCHAR(255) NOT NULL,
        value        VARCHAR(255) NOT NULL,
        updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at   TIMESTAMPTZ
      );
      CREATE INDEX idx_ledger_metadata_ledger_id ON ledger_metadata(ledger_id);
      CREATE INDEX idx_ledger_metadata_key ON ledger_metadata(key);
      CREATE INDEX idx_ledger_metadata_value ON ledger_metadata(value);

      -- ledger_account_metadata

      CREATE TABLE ledger_account_metadata (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
        ledger_account_id UUID NOT NULL REFERENCES ledger_account(id),
        key          VARCHAR(255) NOT NULL,
        value        VARCHAR(255) NOT NULL,
        updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at   TIMESTAMPTZ
      );
      CREATE INDEX idx_ledger_metadata_ledger_account_id ON ledger_account_metadata(ledger_account_id);
      CREATE INDEX idx_ledger_account_metadata_key ON ledger_account_metadata(key);
      CREATE INDEX idx_ledger_account_metadata_value ON ledger_account_metadata(value);

    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      drop index if exists idx_ledger_metadata_ledger_id,
        idx_ledger_metadata_key,
        idx_ledger_metadata_value;
      drop table if exists ledger_metadata;

      -- 
      drop index if exists idx_ledger_metadata_ledger_account_id,
        idx_ledger_account_metadata_key,
        idx_ledger_account_metadata_value;
      drop table if exists ledger_account_metadata;

    `);
  }
}
