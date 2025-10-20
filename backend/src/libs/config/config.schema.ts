import z from 'zod';

import { DBConfigSchema } from '@src/database/config.schema';

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
  LOG_LEVEL: z.string().default('info'),
  TIGER_BEETLE_CLUSTER_ID: z.string().transform(BigInt),
  CORS_ALLOWED_ORIGINS: z.string(),
  TIGER_BEETLE_REPLICAS_ADDRESSES: z
    .string()
    .transform((v) => v.split(',').map((s) => s.trim()))
    .refine((arr) => arr.length > 0, { message: 'Must have at least one item' }),
  // Secondary TigerBeetle cluster for dual-write (optional)
  TIGER_BEETLE_SECONDARY_CLUSTER_ID: z.string().transform(BigInt).optional(),
  TIGER_BEETLE_SECONDARY_REPLICAS_ADDRESSES: z
    .string()
    .transform((v) => v.split(',').map((s) => s.trim()))
    .refine((arr) => arr.length > 0, { message: 'Must have at least one item' })
    .optional(),
  // Enable dual-write to both primary and secondary clusters
  TIGER_BEETLE_DUAL_WRITE_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

export type EnvConfig = z.infer<typeof ConfigSchema>;
