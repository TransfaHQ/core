import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTigerbeetleOperationsTables1760985548446 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tigerbeetle_accounts table to store all Account creation operations
    await queryRunner.query(`
      CREATE TABLE tigerbeetle_accounts (
        id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
        account_id bytea NOT NULL UNIQUE,
        debits_pending bigint NOT NULL DEFAULT 0,
        debits_posted bigint NOT NULL DEFAULT 0,
        credits_pending bigint NOT NULL DEFAULT 0,
        credits_posted bigint NOT NULL DEFAULT 0,
        user_data_128 bytea,
        user_data_64 bigint,
        user_data_32 integer,
        ledger integer NOT NULL,
        code smallint NOT NULL,
        flags integer NOT NULL,
        timestamp bigint,
        ledger_account_id uuid,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT fk_tigerbeetle_accounts_ledger_account_id
          FOREIGN KEY (ledger_account_id)
          REFERENCES ledger_accounts(id)
          ON DELETE SET NULL
      );
    `);

    // Create tigerbeetle_transfers table to store all Transfer operations
    await queryRunner.query(`
      CREATE TABLE tigerbeetle_transfers (
        id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
        transfer_id bytea NOT NULL UNIQUE,
        debit_account_id bytea NOT NULL,
        credit_account_id bytea NOT NULL,
        amount bigint NOT NULL CHECK (amount >= 0),
        pending_id bytea,
        user_data_128 bytea,
        user_data_64 bigint,
        user_data_32 integer,
        timeout bigint,
        ledger integer NOT NULL,
        code smallint NOT NULL,
        flags integer NOT NULL,
        timestamp bigint,
        ledger_entry_id uuid,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT fk_tigerbeetle_transfers_ledger_entry_id
          FOREIGN KEY (ledger_entry_id)
          REFERENCES ledger_entries(id)
          ON DELETE SET NULL
      );
    `);

    // Create indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_accounts_account_id ON tigerbeetle_accounts(account_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_accounts_ledger_account_id ON tigerbeetle_accounts(ledger_account_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_accounts_created_at ON tigerbeetle_accounts(created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_transfers_transfer_id ON tigerbeetle_transfers(transfer_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_transfers_debit_account_id ON tigerbeetle_transfers(debit_account_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_transfers_credit_account_id ON tigerbeetle_transfers(credit_account_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_transfers_ledger_entry_id ON tigerbeetle_transfers(ledger_entry_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tigerbeetle_transfers_created_at ON tigerbeetle_transfers(created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tigerbeetle_transfers`);
    await queryRunner.query(`DROP TABLE IF EXISTS tigerbeetle_accounts`);
  }
}
