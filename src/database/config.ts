import { config as loadConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import z from 'zod';

import { checkPostgresVersion } from '@src/database/utils';

loadConfig();

export const DBConfigSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number).default(5432),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  CORE_POSTGRES_SCHEMA: z
    .string()
    .regex(/^[A-Za-z_]+$/, {
      message: 'Only letters and underscores are allowed',
    })
    .optional(),
  DB_MIGRATIONS_TABLE: z.string().default('migrations'),
});

const dbConfig = DBConfigSchema.parse(process.env);

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
  };
  return dataSourceOptions;
};

const dataSource = new DataSource(dataSourceOptions());
dataSource
  .initialize()
  .then(async (dataSource) => {
    await checkPostgresVersion(dataSource);
  })
  .catch((e) => {
    throw e;
  });
export default dataSource;
