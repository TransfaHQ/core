import { DataSource } from 'typeorm';

import { dbConfig } from '@src/database/config.schema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.DB_HOST,
  port: dbConfig.DB_PORT,
  username: dbConfig.DB_USERNAME,
  password: dbConfig.DB_PASSWORD,
  database: dbConfig.DB_NAME,
  schema: dbConfig.CORE_POSTGRES_SCHEMA,
  migrations: ['src/database/migrations/*{.ts,.js}'],
  migrationsTableName: dbConfig.DB_MIGRATIONS_TABLE,
  logging: dbConfig.DB_ENABLE_LOGGING,
  synchronize: false,
  dropSchema: false,
});
