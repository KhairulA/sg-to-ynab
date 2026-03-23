/** YNAB Budget (Plan) */
export interface YnabBudget {
  id: string
  name: string
  currency_format?: {
    iso_code: string
  }
}

/** YNAB Account */
export interface YnabAccount {
  id: string
  name: string
  type: string
  on_budget: boolean
  closed: boolean
  balance: number
}

/** Transaction to create via YNAB API */
export interface YnabTransactionCreate {
  account_id: string
  date: string
  amount: number // milliunits
  payee_name: string
  memo: string
  cleared: 'cleared' | 'uncleared'
  approved: boolean
  import_id: string
}

/** YNAB API error response */
export interface YnabApiError {
  error: {
    id: string
    name: string
    detail: string
  }
}

/** Result of a batch transaction create */
export interface YnabTransactionResult {
  transaction_ids: string[]
  duplicate_import_ids: string[]
}
