import { Module } from '@nestjs/common';

import { LedgerController } from '@modules/ledger/controllers/ledger.controller';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  providers: [LedgerService],
  controllers: [LedgerController],
})
export class LedgerModule {}
