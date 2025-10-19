import { Module } from '@nestjs/common';

import { CurrencyController } from '@modules/ledger/controllers/currency.controller';
import { LedgerAccountController } from '@modules/ledger/controllers/ledger-account.controller';
import { LedgerEntryController } from '@modules/ledger/controllers/ledger-entry.controller';
import { LedgerTransactionController } from '@modules/ledger/controllers/ledger-transaction.controller';
import { LedgerController } from '@modules/ledger/controllers/ledger.controller';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerEntryService } from '@modules/ledger/services/ledger-entry.service';
import { LedgerTransactionService } from '@modules/ledger/services/ledger-transaction.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  imports: [],
  providers: [
    LedgerService,
    LedgerAccountService,
    CurrencyService,
    LedgerTransactionService,
    LedgerEntryService,
  ],
  controllers: [
    LedgerController,
    LedgerAccountController,
    CurrencyController,
    LedgerTransactionController,
    LedgerEntryController,
  ],
  exports: [
    LedgerService,
    LedgerAccountService,
    CurrencyService,
    LedgerTransactionService,
    LedgerEntryService,
  ],
})
export class LedgerModule {}
