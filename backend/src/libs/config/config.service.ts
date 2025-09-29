import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { Injectable } from '@nestjs/common';

import { ConfigSchema, EnvConfig, Environment } from './config.schema';

@Injectable()
export class ConfigService {
  private envConfig: EnvConfig;

  constructor() {}

  loadConfig(): void {
    if (process.env.NODE_ENV === Environment.DEVELOPMENT) {
      const config = dotenv.parse(fs.readFileSync('.env'));
      this.envConfig = ConfigSchema.parse({ NODE_ENV: process.env.NODE_ENV, ...config });
      return;
    }

    if (process.env.NODE_ENV === Environment.TEST && fs.existsSync('.env.test')) {
      const config = dotenv.parse(fs.readFileSync('.env.test'));
      this.envConfig = ConfigSchema.parse({ NODE_ENV: process.env.NODE_ENV, ...config });
      return;
    }

    this.envConfig = ConfigSchema.parse(process.env);
  }

  get appEnv(): Environment {
    return this.envConfig.NODE_ENV;
  }

  get tigerBeetleConfigs(): { cluster_id: bigint; replica_addresses: string[] } {
    return {
      cluster_id: this.envConfig.TIGER_BEETLE_CLUSTER_ID,
      replica_addresses: this.envConfig.TIGER_BEETLE_REPLICAS_ADDRESSES,
    };
  }

  get adminSecret(): string {
    return this.envConfig.ADMIN_SECRET;
  }

  get authSaltRounds(): number {
    return this.envConfig.AUTH_SALT_ROUNDS;
  }

  get jwtSecret(): string {
    return this.envConfig.JWT_SECRET;
  }

  get jwtExpiresIn(): string {
    return this.envConfig.JWT_EXPIRES_IN;
  }

  get logLevel(): string {
    return this.envConfig.LOG_LEVEL;
  }

  get dbConfig() {
    return {
      host: this.envConfig.DB_HOST,
      port: this.envConfig.DB_PORT,
      user: this.envConfig.DB_USERNAME,
      password: this.envConfig.DB_PASSWORD,
      database: this.envConfig.DB_NAME,
      schema: this.envConfig.CORE_POSTGRES_SCHEMA,
    };
  }
}
