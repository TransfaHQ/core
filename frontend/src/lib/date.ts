/**
 * Formats a date with timezone information (date only)
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted date string with timezone (e.g., "Jan 15, 2025, PST")
 */
export const formatDate = (
  date: Date | string,
  locale = "en-US"
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZoneName: "short",
  }).format(dateObj);
};

/**
 * Formats a date and time with timezone information
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted date and time string with timezone (e.g., "Jan 15, 2025, 3:45 PM PST")
 */
export const formatDateTime = (
  date: Date | string,
  locale = "en-US"
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(dateObj);
};

/**
 * Formats a date and time in a compact format with timezone abbreviation
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted date and time string (e.g., "1/15/25, 3:45 PM PST")
 */
export const formatDateTimeShort = (
  date: Date | string,
  locale = "en-US"
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(dateObj);
};
