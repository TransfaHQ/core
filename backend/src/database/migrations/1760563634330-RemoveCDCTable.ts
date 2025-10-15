import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCDCTable1760563634330 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cdc_normalized_ledger_entries`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
