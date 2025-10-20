import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeUniqueToIdempotencyKeys1760978010718 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Drop the existing PRIMARY KEY constraint on external_id
      ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_pkey;

      -- Add a new id column as PRIMARY KEY
      ALTER TABLE idempotency_keys ADD COLUMN id SERIAL PRIMARY KEY;

      -- Create a composite unique constraint on (external_id, endpoint)
      ALTER TABLE idempotency_keys ADD CONSTRAINT uq_idempotency_keys_external_id_endpoint
        UNIQUE (external_id, endpoint);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Drop the composite unique constraint
      ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS uq_idempotency_keys_external_id_endpoint;

      -- Drop the id column
      ALTER TABLE idempotency_keys DROP COLUMN IF EXISTS id;

      -- Restore external_id as PRIMARY KEY (note: this assumes no duplicates exist)
      ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (external_id);
    `);
  }
}
