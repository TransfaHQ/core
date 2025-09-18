import z from 'zod';

import { DBConfigSchema } from '@src/database/config';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  STAGING = 'staging',
  TEST = 'test',
}

export const ConfigSchema = DBConfigSchema.extend({
  NODE_ENV: z.enum(Environment),
  PORT: z.string().transform(Number).default(3000),
  ADMIN_SECRET: z.string(),
  AUTH_SALT_ROUNDS: z.string().transform(Number).default(12),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  TIGER_BEETLE_CLUSTER_ID: z.string().transform(BigInt),
  TIGER_BEETLE_REPLICAS_ADDRESSES: z
    .string()
    .transform((v) => v.split(',').map((s) => s.trim()))
    .refine((arr) => arr.length > 0, { message: 'Must have at least one item' }),
});

export type EnvConfig = z.infer<typeof ConfigSchema>;
