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
      this.envConfig = ConfigSchema.parse({ ...this.envConfig, ...config });
      return;
    }

    this.envConfig = ConfigSchema.parse(process.env);
  }

  get appEnv(): Environment {
    return this.envConfig.NODE_ENV;
  }
}
