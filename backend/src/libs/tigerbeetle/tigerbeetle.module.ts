import { Module } from '@nestjs/common';

import { TigerbeetleAccountRepository, TigerbeetleTransferRepository } from './repositories';
import { TigerBeetleMigrationService } from './tigerbeetle-migration.service';
import { TigerBeetleService } from './tigerbeetle.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    TigerBeetleService,
    TigerBeetleMigrationService,
    TigerbeetleAccountRepository,
    TigerbeetleTransferRepository,
  ],
  exports: [TigerBeetleService, TigerBeetleMigrationService],
})
export class TigerBeetleModule {}
