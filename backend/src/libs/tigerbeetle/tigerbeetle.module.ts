import { Module } from '@nestjs/common';

import { TigerbeetleAccountRepository, TigerbeetleTransferRepository } from './repositories';
import { TigerBeetleService } from './tigerbeetle.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    TigerBeetleService,
    TigerbeetleAccountRepository,
    TigerbeetleTransferRepository,
  ],
  exports: [TigerBeetleService],
})
export class TigerBeetleModule {}
