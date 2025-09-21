import BigNumber from 'bignumber.js';

/**
 * Convert BigNumber to bigint safely.
 * If decimals > 0, scales the number before converting.
 *
 * Example:
 *   bigNumberToBigInt(new BigNumber("123.45"), 2) => 12345n
 *
 * @param value - BigNumber input
 * @param decimals - number of decimal places to preserve (default 0)
 * @returns bigint
 */
export function bigNumberToBigInt(value: BigNumber, decimals = 0): bigint {
  const scaled = value.times(new BigNumber(10).exponentiatedBy(decimals));
  return BigInt(scaled.integerValue(BigNumber.ROUND_FLOOR).toFixed(0));
}
