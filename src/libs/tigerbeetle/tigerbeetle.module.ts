import { Module } from '@nestjs/common';

import { TigerBeetleService } from './tigerbeetle.service';

@Module({
  imports: [],
  controllers: [],
  providers: [TigerBeetleService],
  exports: [TigerBeetleService],
})
export class TigerBeetleModule {}
