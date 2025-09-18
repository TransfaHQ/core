import dataSource, { dbConfig } from '@src/database/config';
import { checkPostgresVersion } from '@src/database/utils';

import { CORE_POSTGRES_SCHEMA } from '@libs/database/constant';

async function revertLastMigrationWithLog() {
  const ds = await dataSource.initialize();
  await checkPostgresVersion(ds);
  let migrationTable = dbConfig.DB_MIGRATIONS_TABLE;

  if (CORE_POSTGRES_SCHEMA) {
    await ds.query(`CREATE SCHEMA IF NOT EXISTS ${CORE_POSTGRES_SCHEMA}; commit;`);
    await ds.query(`SET search_path TO ${CORE_POSTGRES_SCHEMA};`);
    migrationTable = `${CORE_POSTGRES_SCHEMA}.${migrationTable}`;
  }

  try {
    // Get the last applied migration
    const [lastMigration] = await dataSource.query(
      `SELECT * FROM ${migrationTable} ORDER BY "id" DESC LIMIT 1`,
    );

    if (!lastMigration) {
      console.log('No migrations to revert.');
      return;
    }

    console.log(`⏪ Reverting migration: ${lastMigration.name}`);

    await dataSource.undoLastMigration();

    console.log(`✅ Migration reverted: ${lastMigration.name}`);
  } catch (err) {
    console.error('❌ Failed to revert migration:', err);
    process.exit(-1);
  } finally {
    await dataSource.destroy();
  }
}

revertLastMigrationWithLog();
