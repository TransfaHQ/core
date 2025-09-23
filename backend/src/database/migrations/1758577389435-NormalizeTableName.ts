import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeTableName1758577389435 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" RENAME TO "users";`);
    await queryRunner.query(`ALTER TABLE "ledger" RENAME TO "ledgers";`);
    await queryRunner.query(`ALTER TABLE "ledger_account" RENAME TO "ledger_accounts";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME TO "user"`);
    await queryRunner.query(`ALTER TABLE "ledgers" RENAME TO ledger`);
    await queryRunner.query(`ALTER TABLE "ledger_accounts" RENAME TO ledger_account`);
  }
}
