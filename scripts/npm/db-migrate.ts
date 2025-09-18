#!/usr/bin/env ts-node
import dataSource from '@src/database/config';
import { checkPostgresVersion } from '@src/database/utils';

import { CORE_POSTGRES_SCHEMA } from '@libs/database/constant';

async function runMigrations() {
  try {
    const ds = await dataSource.initialize();

    await checkPostgresVersion(ds);
    if (CORE_POSTGRES_SCHEMA) {
      await ds.query(`CREATE SCHEMA IF NOT EXISTS ${CORE_POSTGRES_SCHEMA}; commit;`);
      await ds.query(`SET search_path TO ${CORE_POSTGRES_SCHEMA};`);
    }

    const migrations = await ds.runMigrations();

    console.log('================== Applied Migrations ==================');
    migrations.forEach((m) => {
      const date = new Date(parseInt(`${m.timestamp}`, 10));
      console.log(`✅ ${m.name} | executed at: ${date.toISOString()}`);
    });
    console.log('========================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to run migrations:', err);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigrations();
