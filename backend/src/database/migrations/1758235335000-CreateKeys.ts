import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKeys1758235335000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "keys" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                "secret" VARCHAR(255) NOT NULL,
                "created_at" TIMESTAMP DEFAULT NOW(),
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "deleted_at" TIMESTAMP DEFAULT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "keys"`);
  }
}