import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUser1758213306156 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
