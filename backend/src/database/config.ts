import { config as loadConfig } from 'dotenv';
import { DataSource, DataSourceOptions, LoggerOptions } from 'typeorm';

import { DBConfigSchema } from './config.schema';

loadConfig({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

export const dbConfig = DBConfigSchema.parse(process.env);

const dataSourceOptions = (): DataSourceOptions => {
  const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: dbConfig.DB_HOST,
    port: dbConfig.DB_PORT,
    username: dbConfig.DB_USERNAME,
    password: dbConfig.DB_PASSWORD,
    database: dbConfig.DB_NAME,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsTableName: dbConfig.DB_MIGRATIONS_TABLE,
    migrationsRun: false,
    schema: dbConfig.CORE_POSTGRES_SCHEMA ?? undefined,
    logging: dbConfig.DB_LOGGING_LEVEL as LoggerOptions,
  };
  return dataSourceOptions;
};

const dataSource = new DataSource(dataSourceOptions());

export default dataSource;
