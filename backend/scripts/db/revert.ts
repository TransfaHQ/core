import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { generateKyselyTypes } from 'scripts/db/utils';

import { dbConfig } from '@src/database/config.schema';
import { checkPostgresVersion } from '@src/database/utils';

import { DB } from '@libs/database/types';

import { AppDataSource } from './typeorm.config';

async function revertTypeORMMigration() {
  try {
    console.log('Initializing TypeORM DataSource...');
    const ds = await AppDataSource.initialize();

    console.log('Setting search path...');
    await ds.query(`SET search_path TO ${dbConfig.CORE_POSTGRES_SCHEMA}`);

    console.log('Getting executed migrations...');

    console.log('Reverting latest TypeORM migration...');
    await ds.undoLastMigration();

    console.log(`✅ Migration reverted.`);
  } catch (error) {
    console.error('❌ Failed to revert TypeORM migration:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function revertLastMigrationWithLog() {
  let kyselyDb: Kysely<DB> | undefined = undefined;

  try {
    // Create Kysely instance for version check
    const dialect = new PostgresDialect({
      pool: new Pool({
        database: dbConfig.DB_NAME,
        host: dbConfig.DB_HOST,
        user: dbConfig.DB_USERNAME,
        port: dbConfig.DB_PORT,
        password: dbConfig.DB_PASSWORD,
      }),
    });
    kyselyDb = new Kysely<DB>({
      dialect,
      log: dbConfig.DB_ENABLE_LOGGING ? ['query', 'error'] : [],
    });

    await checkPostgresVersion(kyselyDb);

    // Revert TypeORM migration
    await revertTypeORMMigration();

    if (process.env.NODE_ENV !== 'test') {
      console.log('Generating Kysely types...');
      await generateKyselyTypes();
    }

    console.log('✅ Migration revert completed successfully');
  } catch (err) {
    console.error('❌ Failed to revert migration:', err);
    process.exit(1);
  } finally {
    if (kyselyDb) {
      await kyselyDb.destroy();
    }
  }
}

revertLastMigrationWithLog();
