import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLedgerEntryMetadataTable1760487223664 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ledger_entry_metadata table
    await queryRunner.query(`
      CREATE TABLE ledger_entry_metadata (
          id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
          ledger_entry_id uuid NOT NULL REFERENCES ledger_entries(id),
          key character varying(255) NOT NULL,
          value character varying(255) NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz,
        CONSTRAINT ledger_entry_metadata_ledger_entry_id_key_unique UNIQUE (ledger_entry_id, key)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_entry_metadata`);
  }
}
