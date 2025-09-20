import { Module } from '@nestjs/common';

import {
  LedgerController,
  MTLedgerController,
} from '@modules/ledger/controllers/ledger.controller';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  providers: [LedgerService],
  controllers: [LedgerController, MTLedgerController],
})
export class LedgerModule {}
