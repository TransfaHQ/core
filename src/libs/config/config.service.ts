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
}
