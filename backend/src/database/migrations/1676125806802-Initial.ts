import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1676125806802 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

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

    // Create User table
    await queryRunner.query(`
          CREATE TABLE "user" (
              "id" UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
              "email" VARCHAR(255) NOT NULL UNIQUE,
              "password" VARCHAR(255) NOT NULL,
              "is_active" BOOLEAN DEFAULT true,
              "created_at" TIMESTAMP DEFAULT NOW(),
              "updated_at" TIMESTAMP DEFAULT NOW(),
              "deleted_at" TIMESTAMP DEFAULT NULL
          )
      `);

    // Create keys table
    await queryRunner.query(`
            CREATE TABLE "keys" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                "secret" VARCHAR(255) NOT NULL,
                "created_at" TIMESTAMP DEFAULT NOW(),
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "deleted_at" TIMESTAMP DEFAULT NULL
            )
        `);

    // create ledger & ledger_account table
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
            external_id varchar(180) NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            deleted_at TIMESTAMPTZ,
            tiger_beetle_id BYTEA NOT NULL,
            currency VARCHAR(5) NOT NULL,
            normal_balance VARCHAR(6) NOT NULL,
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

    // Create ledger_metadata
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

    //
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP FUNCTION IF EXISTS uuid_generate_v7();
    `);

    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "keys"`);

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
