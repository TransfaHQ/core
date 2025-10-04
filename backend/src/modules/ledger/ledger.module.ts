import { Module } from '@nestjs/common';

import { CurrencyController } from '@modules/ledger/controllers/currency.controller';
import { LedgerAccountController } from '@modules/ledger/controllers/ledger-account.controller';
import { LedgerTransactionController } from '@modules/ledger/controllers/ledger-transaction.controller';
import {
  LedgerController,
  MTLedgerController,
} from '@modules/ledger/controllers/ledger.controller';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerTransactionService } from '@modules/ledger/services/ledger-transaction.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  imports: [],
  providers: [LedgerService, LedgerAccountService, CurrencyService, LedgerTransactionService],
  controllers: [
    LedgerController,
    MTLedgerController,
    LedgerAccountController,
    CurrencyController,
    LedgerTransactionController,
  ],
  exports: [LedgerService, LedgerAccountService, CurrencyService, LedgerTransactionService],
})
export class LedgerModule {}
