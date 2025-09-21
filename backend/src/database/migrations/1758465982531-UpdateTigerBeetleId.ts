import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTigerBeetleId1758465982531 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ledger_account DROP COLUMN tiger_beetle_id`);
    await queryRunner.query(
      `ALTER TABLE ledger_account ADD COLUMN tiger_beetle_id BYTEA NOT NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
