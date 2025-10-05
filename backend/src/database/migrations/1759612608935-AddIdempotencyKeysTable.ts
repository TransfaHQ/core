import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyKeysTable1759612608935 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        create table idempotency_keys (
            external_id VARCHAR(255) UNIQUE NOT NULL PRIMARY KEY,
            endpoint VARCHAR(512) NOT NULL,
            request_payload JSONB NOT NULL,
            response_payload JSONB NOT NULL,
            status_code INT NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
        );

        CREATE INDEX idx_idempotency_keys_endpoint ON idempotency_keys(endpoint);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_idempotency_keys_endpoint`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys;`);
  }
}
