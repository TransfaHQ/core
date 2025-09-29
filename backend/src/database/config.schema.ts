import { config as loadConfig } from 'dotenv';
import z from 'zod';

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
    .optional()
    .default('public'),
  DB_MIGRATIONS_TABLE: z.string().default('migrations'),
  DB_ENABLE_LOGGING: z.string().transform(Boolean).default(false),
});

// Load environment variables first
loadConfig({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

// Parse configuration
export const dbConfig = DBConfigSchema.parse(process.env);

export default {
  host: dbConfig.DB_HOST,
  port: dbConfig.DB_PORT,
  user: dbConfig.DB_USERNAME,
  password: dbConfig.DB_PASSWORD,
  dbName: dbConfig.DB_NAME,
  schema: dbConfig.CORE_POSTGRES_SCHEMA,
  debug: dbConfig.DB_ENABLE_LOGGING,
};
