import type { YnabTransactionCreate } from './types'

/**
 * Generate YNAB import_ids for a set of transactions.
 * Format: YNAB:[milliunit_amount]:[iso_date]:[occurrence]
 *
 * The occurrence counter handles same-date, same-amount transactions
 * to prevent false deduplication.
 */
export function assignImportIds(
  transactions: Omit<YnabTransactionCreate, 'import_id'>[]
): YnabTransactionCreate[] {
  // Sort by date, then amount for consistent ordering
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.amount - b.amount
  })

  // Count occurrences of each (date, amount) pair
  const occurrences = new Map<string, number>()

  return sorted.map(txn => {
    const key = `${txn.amount}:${txn.date}`
    const count = (occurrences.get(key) || 0) + 1
    occurrences.set(key, count)

    return {
      ...txn,
      import_id: `YNAB:${txn.amount}:${txn.date}:${count}`,
    }
  })
}
