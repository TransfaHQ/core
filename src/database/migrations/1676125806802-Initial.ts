import { MigrationInterface, QueryRunner } from 'typeorm';

import { CORE_POSTGRES_SCHEMA } from '@libs/database/constant';

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

            rand_bytes := gen_random_bytes(10);

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

    if (CORE_POSTGRES_SCHEMA) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${CORE_POSTGRES_SCHEMA}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP FUNCTION IF EXISTS uuid_generate_v7();
    `);

    if (CORE_POSTGRES_SCHEMA) {
      await queryRunner.query(`DROP SCHEMA IF EXISTS ${CORE_POSTGRES_SCHEMA} CASCADE`);
    }
  }
}
