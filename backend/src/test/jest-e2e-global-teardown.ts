import { config as loadConfig } from 'dotenv';
import { Client } from 'pg';

loadConfig({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

export default async function globalTeardown() {
  const schemaName = process.env.CORE_POSTGRES_SCHEMA || 'e2e_test';

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'localhost',
    password: process.env.DB_PASSWORD || 'localhost',
    database: process.env.DB_NAME || 'localhost',
  });

  try {
    await client.connect();
    console.log(`Dropping schema "${schemaName}" and all its objects...`);
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
    console.log(`Schema "${schemaName}" dropped successfully.`);
  } catch (err) {
    console.error('Error dropping schema:', err);
  } finally {
    await client.end();
  }
}
