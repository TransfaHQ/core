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
    .optional(),
  DB_MIGRATIONS_TABLE: z.string().default('migrations'),
  DB_LOGGING_LEVEL: z.string().default('query'),
});
