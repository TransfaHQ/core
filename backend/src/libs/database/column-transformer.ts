import BigNumber from 'bignumber.js';

export class ColumnNumericTransformer {
  to(data: number): number {
    return new BigNumber(data).toNumber();
  }

  from(data: string): number {
    return new BigNumber(data).toNumber();
  }
}
