/** A single text item extracted from a PDF page with positional data */
export interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
}

/** All text items from a single PDF page */
export interface PageContent {
  pageNumber: number
  items: TextItem[]
  width: number
  height: number
}

/** Supported bank identifiers */
export type BankId = 'dbs' | 'uob' | 'ocbc' | 'scb' | 'hsbc' | 'maybank' | 'citibank'

/** Account type within a consolidated statement */
export type AccountType = 'savings' | 'current' | 'credit_card'

/** A parsed transaction from the statement */
export interface ParsedTransaction {
  date: string // ISO format YYYY-MM-DD
  description: string
  payeeName: string // cleaned description
  memo: string // original prefix / reference info
  amount: number // positive = inflow, negative = outflow (in currency units, not milliunits)
  balance?: number // running balance if available
}

/** A section within a consolidated statement (one per account) */
export interface AccountSection {
  bankId: BankId
  bankName: string
  accountType: AccountType
  accountNumber: string // masked account number from statement
  accountLabel: string // e.g. "POSB Savings Account 123-45678-9"
  currency: string // e.g. "SGD"
  transactions: ParsedTransaction[]
}

/** Bank parser interface — each bank implements this */
export interface BankParser {
  bankId: BankId
  bankName: string
  detect(pages: PageContent[]): boolean
  parse(pages: PageContent[]): AccountSection[]
}

/** Detected column positions for table parsing */
export interface ColumnLayout {
  date?: { min: number; max: number }
  description?: { min: number; max: number }
  withdrawal?: { min: number; max: number }
  deposit?: { min: number; max: number }
  amount?: { min: number; max: number }
  balance?: { min: number; max: number }
}
