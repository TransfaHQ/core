import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLedgerTable1758237952957 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE ledger (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
            name VARCHAR(255) NOT NULL,
            description VARCHAR(255),
            tiger_beetle_id INT GENERATED ALWAYS AS IDENTITY,
            CONSTRAINT ledger_tiger_beetle_id_unique UNIQUE (tiger_beetle_id),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            deleted_at TIMESTAMPTZ
        );        

        CREATE TABLE ledger_account (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
            name VARCHAR(255) NOT NULL,
            description VARCHAR(255),
            ledger_id UUID NOT NULL REFERENCES ledger(id),
            external_id varchar(180) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            deleted_at TIMESTAMPTZ,
            tiger_beetle_id BIGINT NOT NULL,
            currency VARCHAR(5) NOT NULL,
            currency_exponent SMALLINT CHECK (currency_exponent BETWEEN 0 AND 30) NOT NULL,
            CONSTRAINT ledger_account_external_id_unique UNIQUE (external_id),
            CONSTRAINT ledger_account_tiger_beetle_id_unique UNIQUE (tiger_beetle_id)
        );

        CREATE INDEX idx_ledger_name ON ledger(name);
        CREATE INDEX idx_ledger_deleted_at ON ledger(deleted_at);
        CREATE INDEX idx_ledger_tigerbeetle_id ON ledger(tiger_beetle_id);

        CREATE INDEX idx_ledger_account_external_id ON ledger_account(external_id);
        CREATE INDEX idx_ledger_account_tiger_beetle_id ON ledger_account(tiger_beetle_id);
        CREATE INDEX idx_ledger_account_deleted_at ON ledger_account(deleted_at);
        CREATE INDEX idx_ledger_account_currency ON ledger_account(currency);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      drop table ledger_account;
      drop table ledger;
      DROP INDEX IF EXISTS 
        idx_ledger_name,
        idx_ledger_deleted_at,
        idx_ledger_account_external_id, 
        idx_ledger_account_tiger_beetle_id,
        idx_ledger_tigerbeetle_id,
        idx_ledger_account_deleted_at,
        idx_ledger_account_currency;
    `);
  }
}
