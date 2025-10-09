import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToLedgerTransactionTable1759966819821 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ledger_transactions
        ADD COLUMN status varchar(8) NOT NULL
            CHECK (status IN ('pending', 'posted', 'archived'))
            DEFAULT 'pending'
            NOT NULL;

        CREATE INDEX idx_ledger_transactions_status ON ledger_transactions(status);
    `);

    await queryRunner.query(`UPDATE ledger_transactions SET status = 'posted';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        drop index if exists idx_ledger_transactions_status;
        ALTER TABLE ledger_transactions DROP COLUMN IF EXISTS status;
    `);
  }
}
