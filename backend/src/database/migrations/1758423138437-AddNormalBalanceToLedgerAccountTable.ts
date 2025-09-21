import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNormalBalanceToLedgerAccountTable1758423138437 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ledger_account ADD COLUMN normal_balance VARCHAR(6) NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
