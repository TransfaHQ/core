export type Balance = {
  credits: number;
  debits: number;
  amount: number;
  currency: string;
  currencyExponent: number;
};

export type LedgerAccountBalances = {
  pendingBalance: Balance;
  postedBalance: Balance;
  avalaibleBalance: Balance;
};
