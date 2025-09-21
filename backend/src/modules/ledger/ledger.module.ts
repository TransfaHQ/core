import { Module } from '@nestjs/common';

import { LedgerAccountController } from '@modules/ledger/controllers/ledger-account.controller';
import {
  LedgerController,
  MTLedgerController,
} from '@modules/ledger/controllers/ledger.controller';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  providers: [LedgerService, LedgerAccountService, LedgerAccountService],
  controllers: [LedgerController, MTLedgerController, LedgerAccountController],
})
export class LedgerModule {}
