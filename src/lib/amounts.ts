/**
 * Parse a currency string like "1,234.56" or "1234.56" to a number.
 * Returns NaN if parsing fails.
 */
export function parseCurrencyAmount(str: string): number {
  const cleaned = str.replace(/[,\s$]/g, '')
  const num = parseFloat(cleaned)
  return num
}

/**
 * Convert a currency amount (e.g. 12.50) to YNAB milliunits (e.g. 12500).
 * YNAB uses 1000 milliunits = 1 currency unit.
 */
export function toMilliunits(amount: number): number {
  return Math.round(amount * 1000)
}

/**
 * Format a number as SGD currency display string.
 */
export function formatSGD(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return amount < 0 ? `-$${formatted}` : `$${formatted}`
}
