import type { YnabBudget, YnabAccount, YnabTransactionCreate, YnabTransactionResult } from './types'

const BASE_URL = 'https://api.ynab.com/v1'

class YnabApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(`YNAB API error (${status}): ${detail}`)
    this.name = 'YnabApiError'
    this.status = status
    this.detail = detail
  }
}

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new YnabApiError(429, 'Rate limit exceeded. Please wait a moment and try again.')
    }
    if (response.status === 401) {
      throw new YnabApiError(401, 'Access token expired. Please reconnect to YNAB.')
    }
    const body = await response.json().catch(() => ({ error: { detail: response.statusText } }))
    throw new YnabApiError(response.status, body?.error?.detail || response.statusText)
  }

  const json = await response.json()
  return json.data
}

/**
 * List all budgets for the authenticated user.
 */
export async function listBudgets(token: string): Promise<YnabBudget[]> {
  const data = await apiRequest<{ budgets: YnabBudget[] }>('/budgets', token)
  return data.budgets
}

/**
 * List all accounts for a budget.
 */
export async function listAccounts(token: string, budgetId: string): Promise<YnabAccount[]> {
  const data = await apiRequest<{ accounts: YnabAccount[] }>(
    `/budgets/${budgetId}/accounts`,
    token,
  )
  return data.accounts.filter(a => !a.closed)
}

/**
 * Create transactions in batch.
 * Returns created IDs and duplicate import IDs.
 */
export async function createTransactions(
  token: string,
  budgetId: string,
  transactions: YnabTransactionCreate[],
): Promise<YnabTransactionResult> {
  // Batch in groups of 100
  const allCreated: string[] = []
  const allDuplicates: string[] = []

  for (let i = 0; i < transactions.length; i += 100) {
    const batch = transactions.slice(i, i + 100)
    const data = await apiRequest<{
      transaction_ids: string[]
      duplicate_import_ids: string[]
    }>(
      `/budgets/${budgetId}/transactions`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ transactions: batch }),
      },
    )
    allCreated.push(...data.transaction_ids)
    allDuplicates.push(...data.duplicate_import_ids)
  }

  return {
    transaction_ids: allCreated,
    duplicate_import_ids: allDuplicates,
  }
}

export { YnabApiError }
