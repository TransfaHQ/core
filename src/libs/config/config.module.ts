import { Module } from '@nestjs/common';

import { ConfigService } from './config.service';

const services = [
  {
    provide: ConfigService,
    useFactory: (): ConfigService => {
      const config = new ConfigService();
      config.loadConfig();
      return config;
    },
  },
];

@Module({
  imports: [],
  providers: [...services],
  exports: [ConfigService],
})
export class ConfigModule {}
