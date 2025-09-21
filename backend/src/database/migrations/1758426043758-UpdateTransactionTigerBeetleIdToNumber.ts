import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTransactionTigerBeetleIdToNumber1758426043758 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ledger_account DROP COLUMN  IF EXISTS tiger_beetle_id;
        `);

    await queryRunner.query(`
            ALTER TABLE ledger_account ADD COLUMN tiger_beetle_id NUMERIC;
            ALTER TABLE ledger_account ALTER COLUMN external_id DROP NOT NULL;
            
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
