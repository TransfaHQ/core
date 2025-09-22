import { INestApplication } from '@nestjs/common';

import { NormalBalanceEnum } from '@libs/enums';
import { getCurrency } from '@libs/utils/currency';

import { AuthService } from '@modules/auth/auth.service';
import { KeyResponseDto } from '@modules/auth/dto';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

export async function loadLedgerModuleFixtures(app: INestApplication): Promise<{
  creditLedgerAccount: LedgerAccountEntity;
  debitLedgerAccount: LedgerAccountEntity;
  ledger: LedgerEntity;
  authKey: KeyResponseDto;
}> {
  // Setup key
  const authService = app.get(AuthService);
  const key = await authService.createKey({});

  // Setup test ledger
  const legerService = app.get(LedgerService);
  const ledger = await legerService.createLedger({
    name: 'Test Ledger',
    description: 'Test',
    metadata: {},
  });

  // Setup test ledger account
  const currency = getCurrency('USD');
  const ledgerAccountService = app.get(LedgerAccountService);
  const creditLedgerAccount = await ledgerAccountService.createLedgerAccount({
    ledgerId: ledger.id,
    name: 'credit account',
    description: 'test',
    normalBalance: NormalBalanceEnum.CREDIT,
    currency: currency!.code,
    currencyExponent: currency!.digits,
  });

  const debitLedgerAccount = await ledgerAccountService.createLedgerAccount({
    ledgerId: ledger.id,
    name: 'debit account',
    description: 'test',
    normalBalance: NormalBalanceEnum.CREDIT,
    currency: currency!.code,
    currencyExponent: currency!.digits,
  });

  return {
    creditLedgerAccount,
    debitLedgerAccount,
    ledger,
    authKey: key,
  };
}
