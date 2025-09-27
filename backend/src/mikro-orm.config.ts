import { LoadStrategy, defineConfig } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

import { config as loadConfig } from 'dotenv';

import { DBConfigSchema } from './database/config.schema';

// Load environment variables first
loadConfig({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

// Parse configuration
export const dbConfig = DBConfigSchema.parse(process.env);

export default defineConfig({
  driver: PostgreSqlDriver,
  host: dbConfig.DB_HOST,
  port: dbConfig.DB_PORT,
  user: dbConfig.DB_USERNAME,
  password: dbConfig.DB_PASSWORD,
  dbName: dbConfig.DB_NAME,
  schema: dbConfig.CORE_POSTGRES_SCHEMA,
  entities: ['./dist/modules/**/*.entity.js'],
  entitiesTs: ['./src/modules/**/*.entity.ts'],
  migrations: {
    path: './src/database/migrations',
    tableName: dbConfig.DB_MIGRATIONS_TABLE,
    transactional: true,
    dropTables: process.env.DROP_TABLES === 'true',
  },
  extensions: [Migrator],
  debug: dbConfig.DB_ENABLE_LOGGING,
  allowGlobalContext: process.env.NODE_ENV === 'test',
  loadStrategy: LoadStrategy.JOINED,
});
