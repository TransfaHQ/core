import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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

    if (process.env.NODE_ENV === Environment.TEST) {
      const config = dotenv.parse(fs.readFileSync('.env.test'));
      this.envConfig = ConfigSchema.parse({ NODE_ENV: process.env.NODE_ENV, ...config });
      return;
    }

    this.envConfig = ConfigSchema.parse(process.env);
  }

  get appEnv(): Environment {
    return this.envConfig.NODE_ENV;
  }

  get tigerBeetleClusterId(): bigint {
    return this.envConfig.TIGER_BEETLE_CLUSTER_ID;
  }

  get tiggerBeetleReplicasAddresses(): string[] {
    return this.envConfig.TIGER_BEETLE_REPLICAS_ADDRESSES;
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

  get typeOrmConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.envConfig.DB_HOST,
      port: this.envConfig.DB_PORT,
      username: this.envConfig.DB_USERNAME,
      password: this.envConfig.DB_PASSWORD,
      database: this.envConfig.DB_NAME,
      entities: [__dirname + '/../../modules/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
      migrationsTableName: this.envConfig.DB_MIGRATIONS_TABLE,
      schema: this.envConfig.CORE_POSTGRES_SCHEMA,
    };
  }
}
