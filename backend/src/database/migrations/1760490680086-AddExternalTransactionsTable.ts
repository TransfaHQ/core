import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalTransactionsTable1760490680086 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix ledger_entries timestamp columns
    await queryRunner.query(`
      ALTER TABLE idempotency_keys
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    `);

    await queryRunner.query(`
        create table external_transactions(
            id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
            amount NUMERIC NOT NULL,
            date TIMESTAMPTZ NOT NULL,
            vendor_name VARCHAR(512) NOT NULL,
            vendor_description VARCHAR(1000),
            vendor_id VARCHAR(512) NOT NULL,
            currency_code character varying(10) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
        `);

    await queryRunner.query(`create table cdc_normalized_ledger_entries(
        -- ledger_entries fields
        ledger_entry_id UUID NOT NULL REFERENCES ledger_entries(id) ON DELETE RESTRICT,
        ledger_entry_amount NUMERIC NOT NULL CHECK (ledger_entry_amount >= 0),
        ledger_entry_tiger_beetle_id bytea NOT NULL,
        ledger_entry_direction character varying(6) NOT NULL,
        ledger_entry_created_at TIMESTAMPTZ NOT NULL,
        ledger_entry_updated_at TIMESTAMPTZ NOT NULL,
        ledger_entry_deleted_at TIMESTAMPTZ,
        ledger_entry_metadata JSONB,

        -- ledger_transactions field
        ledger_transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
        ledger_transaction_external_id VARCHAR(255) NOT NULL,
        ledger_transaction_description VARCHAR(255) NOT NULL,
        ledger_transaction_tiger_beetle_id bytea NOT NULL,
        ledger_transaction_created_at TIMESTAMPTZ NOT NULL,
        ledger_transaction_updated_at TIMESTAMPTZ NOT NULL,
        ledger_transaction_deleted_at TIMESTAMPTZ,
        ledger_transaction_metadata JSONB,

        -- ledger_accounts
        ledger_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
        ledger_account_name character varying(255) NOT NULL,
        ledger_account_description character varying(255),
        ledger_account_external_id character varying(180),
        ledger_account_created_at TIMESTAMPTZ NOT NULL,
        ledger_account_updated_at TIMESTAMPTZ NOT NULL,
        ledger_account_deleted_at TIMESTAMPTZ,
        ledger_account_tiger_beetle_id bytea NOT NULL,
        ledger_account_normal_balance character varying(6) NOT NULL,
        ledger_account_currency_exponent smallint NOT NULL CHECK (ledger_account_currency_exponent >= 0 AND ledger_account_currency_exponent <= 30),
        ledger_account_currency_code character varying(10) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
        ledger_account_metadata JSONB,

        -- ledger
        ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
        ledger_name character varying(255) NOT NULL,
        ledger_description character varying(255),
        ledger_tiger_beetle_id integer  NOT NULL,
        ledger_created_at TIMESTAMPTZ NOT NULL,
        ledger_updated_at TIMESTAMPTZ NOT NULL,
        ledger_deleted_at TIMESTAMPTZ,
        ledger_metadata JSONB
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cdc_normalized_ledger_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS external_transactions`);
    await queryRunner.query(`
      ALTER TABLE idempotency_keys
        ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE USING created_at AT TIME ZONE 'UTC';
    `);
  }
}
