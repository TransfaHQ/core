import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransferTables1759225092273 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ledger_transactions (
        id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
        external_id VARCHAR(255) UNIQUE NOT NULL,
        description VARCHAR(255) NOT NULL,
        tiger_beetle_id bytea NOT NULL UNIQUE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );

      CREATE TABLE ledger_entries (
        id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
        ledger_account_id UUID NOT NULL,
        ledger_id UUID NOT NULL,
        ledger_transaction_id UUID NOT NULL,
        amount NUMERIC NOT NULL CHECK (amount >= 0),
        tiger_beetle_id bytea NOT NULL,
        direction character varying(6) NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMP WITHOUT TIME ZONE,
        CONSTRAINT fk_ledger_entries_account_id
            FOREIGN KEY (ledger_account_id)
            REFERENCES ledger_accounts(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_ledger_entries_ledger_id
            FOREIGN KEY (ledger_id)
            REFERENCES ledgers(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_ledger_entries_ledger_transaction_id
            FOREIGN KEY (ledger_transaction_id)
            REFERENCES ledger_transactions(id)
            ON DELETE CASCADE
      );
    `);

    // Create ledger_transfer_metadata table
    await queryRunner.query(`
      CREATE TABLE ledger_transaction_metadata (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          ledger_transaction_id uuid NOT NULL REFERENCES ledger_transactions(id),
          key character varying(255) NOT NULL,
          value character varying(255) NOT NULL,
          updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          deleted_at timestamp with time zone,
          CONSTRAINT ledger_transaction_metadata_ledger_transaction_id_key_unique UNIQUE (ledger_transaction_id, key)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_ledger_entries_tiger_beetle_id ON ledger_entries(tiger_beetle_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_transaction_metadata`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_transactions`);
  }
}
