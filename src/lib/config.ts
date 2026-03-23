const STORAGE_KEY_MAPPINGS = 'sg-to-ynab:account-mappings'
const STORAGE_KEY_HISTORY = 'sg-to-ynab:import-history'
const STORAGE_KEY_BUDGET = 'sg-to-ynab:budget-id'

/** Mapping from bank account identifier to YNAB account ID */
export interface AccountMapping {
  bankId: string
  accountNumber: string
  accountLabel: string
  ynabAccountId: string
  ynabAccountName: string
}

/** Record of a completed import */
export interface ImportRecord {
  timestamp: number
  fileName: string
  bankId: string
  transactionsCreated: number
  transactionsSkipped: number
  errors: number
}

export function loadMappings(): AccountMapping[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MAPPINGS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMappings(mappings: AccountMapping[]): void {
  localStorage.setItem(STORAGE_KEY_MAPPINGS, JSON.stringify(mappings))
}

export function findMapping(bankId: string, accountNumber: string): AccountMapping | undefined {
  const mappings = loadMappings()
  return mappings.find(m => m.bankId === bankId && m.accountNumber === accountNumber)
}

export function upsertMapping(mapping: AccountMapping): void {
  const mappings = loadMappings()
  const idx = mappings.findIndex(
    m => m.bankId === mapping.bankId && m.accountNumber === mapping.accountNumber
  )
  if (idx >= 0) {
    mappings[idx] = mapping
  } else {
    mappings.push(mapping)
  }
  saveMappings(mappings)
}

export function loadHistory(): ImportRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addHistoryRecord(record: ImportRecord): void {
  const history = loadHistory()
  history.unshift(record)
  // Keep last 100 records
  if (history.length > 100) history.length = 100
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
}

export function loadBudgetId(): string | null {
  return localStorage.getItem(STORAGE_KEY_BUDGET)
}

export function saveBudgetId(id: string): void {
  localStorage.setItem(STORAGE_KEY_BUDGET, id)
}
