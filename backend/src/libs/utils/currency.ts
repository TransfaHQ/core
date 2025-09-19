import currencyCodes, { CurrencyCodeRecord } from 'currency-codes';

type ExtendedCurrency = CurrencyCodeRecord & { isCustom?: boolean };

const customCurrencies: ExtendedCurrency[] = [
  {
    code: 'USDC',
    number: '1000',
    digits: 8,
    currency: 'USD Coin',
    countries: ['GLOBAL'],
    isCustom: true,
  },
];

const allCurrencies: ExtendedCurrency[] = [
  ...currencyCodes.codes().map((code) => ({
    ...currencyCodes.code(code)!,
    isCustom: false,
  })),

  ...customCurrencies,
];

export function getCurrency(code: string): ExtendedCurrency | undefined {
  return allCurrencies.find((c) => c.code === code);
}
