import { Global, Module } from '@nestjs/common';

import { ConfigModule } from '@libs/config/config.module';
import { TigerBeetleModule } from '@libs/tigerbeetle/tigerbeetle.module';

@Global()
@Module({
  imports: [ConfigModule, TigerBeetleModule],
  providers: [],
  exports: [ConfigModule, TigerBeetleModule],
})
export class BootstrapModule {}
