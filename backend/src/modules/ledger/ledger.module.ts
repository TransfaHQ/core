import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { CurrencyController } from '@modules/ledger/controllers/currency.controller';
import { LedgerAccountController } from '@modules/ledger/controllers/ledger-account.controller';
import {
  LedgerController,
  MTLedgerController,
} from '@modules/ledger/controllers/ledger.controller';
import { CurrencyEntity } from '@modules/ledger/entities/currency.entity';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      LedgerEntity,
      LedgerAccountEntity,
      LedgerAccountMetadataEntity,
      CurrencyEntity,
    ]),
  ],
  providers: [LedgerService, LedgerAccountService, CurrencyService],
  controllers: [LedgerController, MTLedgerController, LedgerAccountController, CurrencyController],
  exports: [LedgerService, LedgerAccountService, CurrencyService],
})
export class LedgerModule {}
