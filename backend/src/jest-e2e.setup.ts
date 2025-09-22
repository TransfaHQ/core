import { DataSource } from 'typeorm';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/setup';

import { NormalBalanceEnum } from '@libs/enums';
import { getCurrency } from '@libs/utils/currency';

import { AuthService } from '@modules/auth/auth.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

let app: INestApplication;

beforeAll(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await setupApp(app);
  const schemaName = process.env.CORE_POSTGRES_SCHEMA || 'e2e_test';

  await app.init();
  global.__TEST_APP__ = app;

  if (schemaName) {
    const ds = app.get(DataSource);
    await ds.query(`SET search_path TO ${schemaName};`);
  }

  // Setup key
  const authService = app.get(AuthService);
  const key = await authService.createKey({});

  global.__TEST_CORE_API_KEY__ = key.id;
  global.__TEST_CORE_API_SECRET__ = key.secret;

  // Setup test ledger
  const legerService = app.get(LedgerService);
  const ledger = await legerService.createLedger({
    name: 'Test Ledger',
    description: 'Test',
    metadata: {},
  });

  global.__TEST_LEDGER_ID__ = ledger.id;

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

  global.__TEST_CREDIT_LEDGER_ACCOUNT_ID__ = creditLedgerAccount.id;

  const debitLedgerAccount = await ledgerAccountService.createLedgerAccount({
    ledgerId: ledger.id,
    name: 'debit account',
    description: 'test',
    normalBalance: NormalBalanceEnum.CREDIT,
    currency: currency!.code,
    currencyExponent: currency!.digits,
  });

  global.__TEST_DEBIT_LEDGER_ACCOUNT_ID__ = debitLedgerAccount.id;
});

afterAll(async () => {
  if (app) await app.close();
  global.__TEST_APP__ = undefined;
  global.__TEST_CORE_API_KEY__ = undefined;
  global.__TEST_CORE_API_SECRET__ = undefined;
  global.__TEST_LEDGER_ID__ = undefined;
  global.__TEST_LEDGER_ACCOUNT_ID__ = undefined;
  global.__TEST_DEBIT_LEDGER_ACCOUNT_ID__ = undefined;
  global.__TEST_CREDIT_LEDGER_ACCOUNT_ID__ = undefined;
});
