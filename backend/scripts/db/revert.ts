import { MikroORM } from '@mikro-orm/core';

import { checkPostgresVersion } from '@src/database/utils';
import mikroOrmConfig, { dbConfig } from '@src/mikro-orm.config';

async function revertLastMigrationWithLog() {
  let orm: MikroORM | undefined;

  try {
    orm = await MikroORM.init(mikroOrmConfig);
    const em = orm.em;

    await checkPostgresVersion(em);

    if (dbConfig.CORE_POSTGRES_SCHEMA) {
      const connection = em.getConnection();
      await connection.execute(`CREATE SCHEMA IF NOT EXISTS ${dbConfig.CORE_POSTGRES_SCHEMA}`);
      await connection.execute(`SET search_path TO ${dbConfig.CORE_POSTGRES_SCHEMA}`);
    }

    const migrator = orm.getMigrator();

    // Get the list of executed migrations to show which one will be reverted
    const executedMigrations = await migrator.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('No migrations to revert.');
      return;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    console.log(`⏪ Reverting migration: ${lastMigration.name}`);

    const revertedMigrations = await migrator.down();

    if (revertedMigrations.length > 0) {
      console.log(`✅ Migration reverted: ${revertedMigrations[0].name}`);
    } else {
      console.log('No migrations were reverted.');
    }
  } catch (err) {
    console.error('❌ Failed to revert migration:', err);
    process.exit(1);
  } finally {
    if (orm) {
      await orm.close();
    }
  }
}

revertLastMigrationWithLog();
