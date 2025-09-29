import currencyCodes from 'currency-codes';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1759161278526 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create UUID v7 function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
          DECLARE
              ts_millis BIGINT;
              rand_bytes BYTEA;
              uuid_bytes BYTEA := '\\x00000000000000000000000000000000'::bytea;
              val INT;
              i INT;
          BEGIN
              ts_millis := FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000);

              rand_bytes := substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 10);

              FOR i IN 0..5 LOOP
                  val := (ts_millis >> (40 - 8*i)) & 255;
                  uuid_bytes := set_byte(uuid_bytes, i, val);
              END LOOP;

              val := ((get_byte(rand_bytes, 0) & 15) | 112);  -- 112 decimal = 0x70
              uuid_bytes := set_byte(uuid_bytes, 6, val);

              uuid_bytes := set_byte(uuid_bytes, 7, get_byte(rand_bytes, 1));

              val := ((get_byte(rand_bytes, 2) & 63) | 128);  -- 128 decimal = 0x80
              uuid_bytes := set_byte(uuid_bytes, 8, val);

              FOR i IN 9..15 LOOP
                  uuid_bytes := set_byte(uuid_bytes, i, get_byte(rand_bytes, i - 6));
              END LOOP;

              RETURN encode(uuid_bytes, 'hex')::uuid;
          END;
          $$ LANGUAGE plpgsql;
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          email character varying(255) NOT NULL UNIQUE,
          password character varying(255) NOT NULL,
          is_active boolean DEFAULT true,
          created_at timestamp without time zone DEFAULT now(),
          updated_at timestamp without time zone DEFAULT now(),
          deleted_at timestamp without time zone
      )
    `);

    // Create keys table
    await queryRunner.query(`
      CREATE TABLE keys (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          secret character varying(255) NOT NULL,
          created_at timestamp without time zone DEFAULT now(),
          updated_at timestamp without time zone DEFAULT now(),
          deleted_at timestamp without time zone
      )
    `);

    // Create ledgers table
    await queryRunner.query(`
      CREATE TABLE ledgers (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          name character varying(255) NOT NULL,
          description character varying(255),
          tiger_beetle_id integer GENERATED ALWAYS AS IDENTITY UNIQUE,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          deleted_at timestamp with time zone
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX ledger_pkey ON ledgers(id)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX ledger_tiger_beetle_id_unique ON ledgers(tiger_beetle_id)`,
    );
    await queryRunner.query(`CREATE INDEX idx_ledger_name ON ledgers(name)`);
    await queryRunner.query(`CREATE INDEX idx_ledger_deleted_at ON ledgers(deleted_at)`);
    await queryRunner.query(`CREATE INDEX idx_ledger_tigerbeetle_id ON ledgers(tiger_beetle_id)`);

    // Create ledger_metadata table
    await queryRunner.query(`
      CREATE TABLE ledger_metadata (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          ledger_id uuid NOT NULL REFERENCES ledgers(id),
          key character varying(255) NOT NULL,
          value character varying(255) NOT NULL,
          updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          deleted_at timestamp with time zone,
          CONSTRAINT ledger_metadata_ledger_id_key_unique UNIQUE (ledger_id, key)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_ledger_metadata_ledger_id ON ledger_metadata(ledger_id)`,
    );
    await queryRunner.query(`CREATE INDEX idx_ledger_metadata_key ON ledger_metadata(key)`);
    await queryRunner.query(`CREATE INDEX idx_ledger_metadata_value ON ledger_metadata(value)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_ledger_metadata_ledger_key_unique ON ledger_metadata(ledger_id,key)`,
    );

    // Create currencies table
    await queryRunner.query(`
      CREATE TABLE currencies (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) UNIQUE NOT NULL,
          exponent SMALLINT NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Insert currency data
    const currencies = currencyCodes.codes().map((code) => {
      const currency = currencyCodes.code(code)!;
      return {
        code: currency.code,
        exponent: currency.digits,
        name: currency.currency,
      };
    });

    for (const currency of currencies) {
      await queryRunner.query(`INSERT INTO currencies (code, exponent, name) VALUES ($1, $2, $3)`, [
        currency.code,
        currency.exponent,
        currency.name,
      ]);
    }

    // Create ledger_accounts table
    await queryRunner.query(`
      CREATE TABLE ledger_accounts (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          name character varying(255) NOT NULL,
          description character varying(255),
          ledger_id uuid NOT NULL REFERENCES ledgers(id),
          external_id character varying(180) UNIQUE,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          deleted_at timestamp with time zone,
          tiger_beetle_id bytea NOT NULL UNIQUE,
          normal_balance character varying(6) NOT NULL,
          currency_exponent smallint NOT NULL CHECK (currency_exponent >= 0 AND currency_exponent <= 30),
          currency_code character varying(10) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_ledger_account_external_id ON ledger_accounts(external_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ledger_account_tiger_beetle_id ON ledger_accounts(tiger_beetle_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ledger_account_deleted_at ON ledger_accounts(deleted_at)`,
    );

    // Create ledger_account_metadata table
    await queryRunner.query(`
      CREATE TABLE ledger_account_metadata (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          ledger_account_id uuid NOT NULL REFERENCES ledger_accounts(id),
          key character varying(255) NOT NULL,
          value character varying(255) NOT NULL,
          updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          deleted_at timestamp with time zone,
          CONSTRAINT ledger_account_metadata_ledger_account_id_key_unique UNIQUE (ledger_account_id, key)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_ledger_metadata_ledger_account_id ON ledger_account_metadata(ledger_account_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ledger_account_metadata_key ON ledger_account_metadata(key)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ledger_account_metadata_value ON ledger_account_metadata(value)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_ledger_account_metadata_account_key_unique ON ledger_account_metadata(ledger_account_id,key)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_account_metadata CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_accounts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS currencies CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_metadata CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledgers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS keys CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    // Drop custom function
    await queryRunner.query(`DROP FUNCTION IF EXISTS uuid_generate_v7() CASCADE`);
  }
}
