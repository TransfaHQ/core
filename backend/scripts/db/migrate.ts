#!/usr/bin/env ts-node
import { MikroORM } from '@mikro-orm/core';

import { checkPostgresVersion } from '@src/database/utils';
import mikroOrmConfig, { dbConfig } from '@src/mikro-orm.config';

async function runMigrations() {
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
    const migrations = await migrator.up();

    console.log('================== Applied Migrations ==================');
    migrations.forEach((m) => {
      console.log(`✅ ${m.name}`);
    });
    console.log('========================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to run migrations:', err);
    process.exit(1);
  } finally {
    if (orm) {
      await orm.close();
    }
  }
}

runMigrations();
