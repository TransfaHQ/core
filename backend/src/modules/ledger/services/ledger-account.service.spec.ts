import { Selectable } from 'kysely';
import { id } from 'tigerbeetle-node';

import { LedgerAccounts } from '@libs/database/types';
import { tbIdToBuffer } from '@libs/database/utils';
import { NormalBalanceEnum } from '@libs/enums';
import { uuidV7 } from '@libs/utils/uuid';

import { computeBalancesAmount } from '@modules/ledger/services/ledger-account.service';

describe('computeBalancesAmount', () => {
  const currencyExponent = 2;
  const currencyCode = 'USD';

  function buildAccount(normalBalance: NormalBalanceEnum): Selectable<LedgerAccounts> {
    return {
      normalBalance,
      currencyExponent,
      currencyCode,
      description: '',
      id: uuidV7(),
      ledgerId: uuidV7(),
      externalId: uuidV7(),
      updatedAt: new Date(),
      createdAt: new Date(),
      name: normalBalance,
      tigerBeetleId: tbIdToBuffer(id()),
      deletedAt: null,
      maxBalanceLimit: null,
      minBalanceLimit: null,
      boundCheckAccountTigerBeetleId: null,
      boundFundingAccountTigerBeetleId: null,
    };
  }

  test('CREDIT-normal account: computes balances correctly', () => {
    const account = buildAccount(NormalBalanceEnum.CREDIT);

    const balances = {
      pendingCredit: 5000, // $50.00
      pendingDebit: 1000, // $10.00
      postedCredit: 20000, // $200.00
      postedDebit: 4000, // $40.00
    };

    const result = computeBalancesAmount(account, balances);

    expect(result).toEqual({
      pendingBalance: {
        credits: 50,
        debits: 10,
        amount: 40,
        currency: 'USD',
        currencyExponent: 2,
      },
      postedBalance: {
        credits: 200,
        debits: 40,
        amount: 160,
        currency: 'USD',
        currencyExponent: 2,
      },
      availableBalance: {
        credits: 200,
        debits: 50, // 40 (posted) + 10 (pending)
        amount: 150,
        currency: 'USD',
        currencyExponent: 2,
      },
    });
  });

  test('DEBIT-normal account: computes balances correctly', () => {
    const account = buildAccount(NormalBalanceEnum.DEBIT);

    const balances = {
      pendingCredit: 2000, // $20.00
      pendingDebit: 6000, // $60.00
      postedCredit: 1000, // $10.00
      postedDebit: 15000, // $150.00
    };

    const result = computeBalancesAmount(account, balances);

    expect(result).toEqual({
      pendingBalance: {
        credits: 20,
        debits: 60,
        amount: 40, // 60 - 20
        currency: 'USD',
        currencyExponent: 2,
      },
      postedBalance: {
        credits: 10,
        debits: 150,
        amount: 140,
        currency: 'USD',
        currencyExponent: 2,
      },
      availableBalance: {
        credits: 30, // 10 + 20
        debits: 150, // only posted debit
        amount: 120, // 150 - 30
        currency: 'USD',
        currencyExponent: 2,
      },
    });
  });

  test('Handles zero balances correctly', () => {
    const account = buildAccount(NormalBalanceEnum.CREDIT);

    const balances = {
      pendingCredit: 0,
      pendingDebit: 0,
      postedCredit: 0,
      postedDebit: 0,
    };

    const result = computeBalancesAmount(account, balances);

    expect(result).toEqual({
      pendingBalance: {
        credits: 0,
        debits: 0,
        amount: 0,
        currency: 'USD',
        currencyExponent: 2,
      },
      postedBalance: {
        credits: 0,
        debits: 0,
        amount: 0,
        currency: 'USD',
        currencyExponent: 2,
      },
      availableBalance: {
        credits: 0,
        debits: 0,
        amount: 0,
        currency: 'USD',
        currencyExponent: 2,
      },
    });
  });
});
