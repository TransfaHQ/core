import { Global, Module } from '@nestjs/common';

import { ConfigModule } from '@libs/config/config.module';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [],
  exports: [ConfigModule],
})
export class BootstrapModule {}
