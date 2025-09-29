import { Selectable } from 'kysely';

import { LedgerAccounts, Ledgers } from '@libs/database/types';

export type Balance = {
  credits: number;
  debits: number;
  amount: number;
  currency: string;
  currencyExponent: number;
};

export type Metadata = { key: string; value: string };

export type Ledger = Selectable<Ledgers> & {
  metadata?: Metadata[];
};

export type LedgerAccountBalances = {
  pendingBalance: Balance;
  postedBalance: Balance;
  avalaibleBalance: Balance;
};

export type LedgerAccount = Selectable<LedgerAccounts> & {
  balances: LedgerAccountBalances;
  metadata?: Metadata[];
};
