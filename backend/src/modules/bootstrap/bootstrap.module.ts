import { Global, Module } from '@nestjs/common';

import { ConfigModule } from '@libs/config/config.module';
import { DatabaseModule } from '@libs/database/database.module';
import { TigerBeetleModule } from '@libs/tigerbeetle/tigerbeetle.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, TigerBeetleModule],
  providers: [],
  exports: [ConfigModule, DatabaseModule, TigerBeetleModule],
})
export class BootstrapModule {}
