import { Module } from '@nestjs/common';

import { CurrencyController } from '@modules/ledger/controllers/currency.controller';
import { LedgerAccountController } from '@modules/ledger/controllers/ledger-account.controller';
import {
  LedgerController,
  MTLedgerController,
} from '@modules/ledger/controllers/ledger.controller';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  imports: [],
  providers: [LedgerService, LedgerAccountService, CurrencyService],
  controllers: [LedgerController, MTLedgerController, LedgerAccountController, CurrencyController],
  exports: [LedgerService, LedgerAccountService, CurrencyService],
})
export class LedgerModule {}
