import z from 'zod';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  STAGING = 'staging',
  TEST = 'test',
}

export const ConfigSchema = z.object({
  NODE_ENV: z.enum(Environment),
  PORT: z.string().transform(Number).default(3000),
});

export type EnvConfig = z.infer<typeof ConfigSchema>;
