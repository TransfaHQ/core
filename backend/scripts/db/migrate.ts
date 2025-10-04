#!/usr/bin/env ts-node
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { generateKyselyTypes } from 'scripts/db/utils';

import { dbConfig } from '@src/database/config.schema';
import { checkPostgresVersion } from '@src/database/utils';

import { DB } from '@libs/database/types';

import { AppDataSource } from './typeorm.config';

async function runTypeORMMigrations() {
  try {
    console.log('Initializing TypeORM DataSource...');
    const ds = await AppDataSource.initialize();

    console.log('Creating schema if not exists...');
    await ds.query(`CREATE SCHEMA IF NOT EXISTS ${dbConfig.CORE_POSTGRES_SCHEMA}`);
    await ds.query(`SET search_path TO ${dbConfig.CORE_POSTGRES_SCHEMA}`);

    console.log('Running TypeORM migrations...');
    const migrations = await ds.runMigrations();

    console.log('================== Applied TypeORM Migrations ==================');
    if (migrations.length === 0) {
      console.log('✅ No pending migrations');
    } else {
      migrations.forEach((migration) => {
        console.log(`✅ ${migration.name} | applied`);
      });
    }
    console.log('==============================================================');

    return migrations;
  } catch (error) {
    console.error('❌ Failed to run TypeORM migrations:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function runMigrations() {
  let kyselyDb: Kysely<DB> | undefined = undefined;

  try {
    // Run TypeORM migrations first
    await runTypeORMMigrations();

    // Create Kysely instance for type generation and version check
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

    await sql.raw(`SET search_path TO ${dbConfig.CORE_POSTGRES_SCHEMA}`).execute(kyselyDb);
    await checkPostgresVersion(kyselyDb);

    if (process.env.NODE_ENV !== 'test') {
      console.log('Generating Kysely types...');
      await generateKyselyTypes();
    }

    console.log('✅ Migration process completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to run migration process:', err);
    process.exit(1);
  } finally {
    if (kyselyDb) {
      await kyselyDb.destroy();
    }
  }
}

runMigrations();
