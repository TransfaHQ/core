/**
 * Formats a balance amount as currency
 * @param balance - The balance amount in the smallest unit (e.g., cents for USD)
 * @param currency - The currency code (e.g., 'USD', 'EUR', 'BTC')
 * @param exponent - The number of decimal places for the currency
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted currency string
 */
export const formatBalance = (
  balance: number,
  currency: string,
  exponent: number,
  locale = "en-US"
): string => {
  const amount = balance / Math.pow(10, exponent);

  // Try to format as standard currency first
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(amount);
  } catch (error) {
    // Fallback for custom/unsupported currencies
    const formattedAmount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(amount);

    return `${formattedAmount} ${currency}`;
  }
};

/**
 * Formats a currency display name
 * @param code - The currency code
 * @param name - The currency name
 * @returns Formatted display string
 */
export const formatCurrencyDisplay = (code: string, name?: string): string => {
  return name ? `${code} - ${name}` : code;
};