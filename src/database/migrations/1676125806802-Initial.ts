import { MigrationInterface, QueryRunner } from 'typeorm';

import { CORE_POSTGRES_SCHEMA } from '@libs/database/constant';

export class Initial1676125806802 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS snowflake_seq
        START 0
        INCREMENT 1
        MINVALUE 0
        MAXVALUE 4095;  -- 12 bits
    `);

    await queryRunner.query(
      `
      CREATE OR REPLACE FUNCTION generate_snowflake_id()
      RETURNS BIGINT AS $$
      DECLARE
          epoch BIGINT;
          timestamp_ms BIGINT;
          machine_id BIGINT := 1; -- change if multiple nodes
          sequence_id BIGINT;
          snowflake_id BIGINT;
      BEGIN
          -- Fixed epoch: 2025-09-19 midnight UTC in milliseconds
          epoch := 1758153600000*1000::BIGINT;

          -- Current timestamp in milliseconds
          timestamp_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

          -- Get next sequence number
          sequence_id := nextval('snowflake_seq');

          -- Compose Snowflake ID:
          -- 41 bits timestamp | 10 bits machine_id | 12 bits sequence
          snowflake_id := (((timestamp_ms - epoch) << 22) | (machine_id << 12) | sequence_id) & 0x7FFFFFFFFFFFFFFF;

          RETURN snowflake_id;
      END;
      $$ LANGUAGE plpgsql;
      `,
    );

    if (CORE_POSTGRES_SCHEMA) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${CORE_POSTGRES_SCHEMA}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP FUNCTION IF EXISTS generate_snowflake_id();
        DROP SEQUENCE IF EXISTS snowflake_seq;
    `);

    if (CORE_POSTGRES_SCHEMA) {
      await queryRunner.query(`DROP SCHEMA IF EXISTS ${CORE_POSTGRES_SCHEMA} CASCADE`);
    }
  }
}
