export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  USDC = 'USDC',
}

export interface Asset {
  code: CurrencyCode;
  name: string;
  scale: number;
}

export const CURRENCIES: Record<CurrencyCode, Asset> = {
  [CurrencyCode.EUR]: {
    name: 'Euro',
    code: CurrencyCode.EUR,
    scale: 2,
  },
  [CurrencyCode.USD]: {
    name: 'dollars',
    code: CurrencyCode.USD,
    scale: 2,
  },
  [CurrencyCode.USDC]: {
    name: 'USD Coin',
    code: CurrencyCode.USDC,
    scale: 6,
  },
};
