import type { PageContent, AccountSection, AccountType, ParsedTransaction, TextItem } from './types'
import type { BankParser } from './types'
import { groupByRow } from './columnDetector'
import { parseCurrencyAmount } from '../lib/amounts'

// Date pattern: "DD Mon" (e.g. "15 Jan", "01 Feb")
const DATE_PATTERN = /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i

// Account section headers
const SAVINGS_HEADER = /(?:POSB|DBS)\s+(?:Savings|Current)\s+Account\s+([\d-]+)/i
const CREDIT_CARD_HEADER = /(?:DBS|POSB)\s+(?:Credit\s+Card|Visa|MasterCard|Card)\s+(?:No\.?\s*)?([\d*\s-]+)/i

// Statement period pattern to determine year
const PERIOD_PATTERN = /(?:Statement\s+Period|Period)\s*:?\s*\d{1,2}\s+\w+\s+(\d{4})\s+to\s+\d{1,2}\s+\w+\s+(\d{4})/i
const SINGLE_PERIOD = /(?:Statement\s+Date|As\s+at)\s*:?\s*\d{1,2}\s+\w+\s+(\d{4})/i

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function parseDate(dateStr: string, year: number): string {
  const parts = dateStr.trim().split(/\s+/)
  if (parts.length !== 2) return ''
  const day = parts[0].padStart(2, '0')
  const month = MONTH_MAP[parts[1].toLowerCase()]
  if (!month) return ''
  return `${year}-${month}-${day}`
}

function detectYear(pages: PageContent[]): number {
  const allText = pages.flatMap(p => p.items.map(i => i.str)).join(' ')
  const periodMatch = allText.match(PERIOD_PATTERN)
  if (periodMatch) return parseInt(periodMatch[2], 10)
  const singleMatch = allText.match(SINGLE_PERIOD)
  if (singleMatch) return parseInt(singleMatch[1], 10)
  return new Date().getFullYear()
}

function isAmountStr(str: string): boolean {
  return /^[\d,]+\.\d{2}$/.test(str.trim())
}

/** Clean payee name by stripping common DBS prefixes */
function cleanPayee(description: string): { payeeName: string; memo: string } {
  const prefixes = [
    'NETS DEBIT', 'NETS', 'GIRO', 'IBG', 'FAST', 'FUND TRANSFER',
    'BILL PAYMENT', 'CASHCARD', 'POS', 'ATM', 'INTEREST CREDIT',
    'INTEREST CHARGED', 'ANNUAL FEE', 'PAYMENT RECEIVED',
  ]
  const upper = description.toUpperCase()
  for (const prefix of prefixes) {
    if (upper.startsWith(prefix)) {
      const rest = description.slice(prefix.length).replace(/^[\s-]+/, '').trim()
      return {
        payeeName: rest || description,
        memo: prefix,
      }
    }
  }
  return { payeeName: description, memo: '' }
}

/**
 * Parse DBS/POSB consolidated eStatements.
 */
export const dbsParser: BankParser = {
  bankId: 'dbs',
  bankName: 'DBS / POSB',

  detect(pages: PageContent[]): boolean {
    const text = pages.slice(0, 2).flatMap(p => p.items.map(i => i.str)).join(' ')
    return /DBS\s+Bank|POSB|Development Bank of Singapore/i.test(text)
  },

  parse(pages: PageContent[]): AccountSection[] {
    const year = detectYear(pages)
    const sections: AccountSection[] = []

    // Collect all items across all pages with page info
    const allItems: (TextItem & { pageNum: number })[] = []
    for (const page of pages) {
      for (const item of page.items) {
        allItems.push({ ...item, pageNum: page.pageNumber })
      }
    }

    // Find account section boundaries
    const sectionBoundaries: {
      type: AccountType
      accountNumber: string
      label: string
      startIdx: number
    }[] = []

    const allText = allItems.map(i => i.str)

    for (let i = 0; i < allItems.length; i++) {
      // Build a window of text to match section headers
      const windowText = allText.slice(i, i + 8).join(' ')

      const savingsMatch = windowText.match(SAVINGS_HEADER)
      if (savingsMatch) {
        const acctType: AccountType = /Current/i.test(windowText) ? 'current' : 'savings'
        sectionBoundaries.push({
          type: acctType,
          accountNumber: savingsMatch[1].trim(),
          label: savingsMatch[0].trim(),
          startIdx: i,
        })
        continue
      }

      const ccMatch = windowText.match(CREDIT_CARD_HEADER)
      if (ccMatch) {
        sectionBoundaries.push({
          type: 'credit_card',
          accountNumber: ccMatch[1].replace(/\s/g, '').trim(),
          label: ccMatch[0].trim(),
          startIdx: i,
        })
      }
    }

    // Parse each section
    for (let s = 0; s < sectionBoundaries.length; s++) {
      const boundary = sectionBoundaries[s]
      const startIdx = boundary.startIdx
      const endIdx = s + 1 < sectionBoundaries.length
        ? sectionBoundaries[s + 1].startIdx
        : allItems.length

      const sectionItems = allItems.slice(startIdx, endIdx)
      const transactions = boundary.type === 'credit_card'
        ? parseCreditCardSection(sectionItems, year)
        : parseSavingsSection(sectionItems, year)

      if (transactions.length > 0) {
        sections.push({
          bankId: 'dbs',
          bankName: 'DBS / POSB',
          accountType: boundary.type,
          accountNumber: boundary.accountNumber,
          accountLabel: boundary.label,
          currency: 'SGD',
          transactions,
        })
      }
    }

    return sections
  },
}

function parseSavingsSection(items: (TextItem & { pageNum: number })[], year: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const rows = groupByRow(items, 3)

  let currentTxn: ParsedTransaction | null = null

  for (const row of rows) {
    const rowText = row.map(i => i.str.trim()).join(' ')

    // Skip headers and summary lines
    if (/^Date\s+Description|^Total|BALANCE BROUGHT FORWARD|BALANCE CARRIED FORWARD/i.test(rowText)) {
      if (currentTxn) {
        transactions.push(currentTxn)
        currentTxn = null
      }
      continue
    }

    // Check if this row starts with a date
    const firstItemText = row[0]?.str?.trim() || ''
    const hasDate = DATE_PATTERN.test(firstItemText)

    if (hasDate) {
      // Save previous transaction
      if (currentTxn) {
        transactions.push(currentTxn)
      }

      const date = parseDate(firstItemText, year)
      if (!date) continue

      // Find amounts — look for numeric items (withdrawal, deposit, balance)
      const amounts = row.filter(i => isAmountStr(i.str.trim()))

      // Description is non-date, non-amount text
      const descParts = row
        .filter(i => !DATE_PATTERN.test(i.str.trim()) && !isAmountStr(i.str.trim()))
        .map(i => i.str.trim())
        .filter(Boolean)

      const description = descParts.join(' ')

      // Determine amount: typically the rightmost amounts are balance,
      // and the one(s) before are withdrawal/deposit
      let amount = 0
      let balance: number | undefined

      if (amounts.length >= 2) {
        // Last is balance, second-to-last is withdrawal or deposit
        balance = parseCurrencyAmount(amounts[amounts.length - 1].str)
        const txnAmount = parseCurrencyAmount(amounts[amounts.length - 2].str)
        // Determine if withdrawal or deposit by x-position
        // Withdrawal columns tend to be further left than deposit
        // If only one amount column found, check context
        // Simple heuristic: if there are 3 amounts, middle = withdrawal/deposit
        // For DBS, withdrawal column x < deposit column x typically
        // We'll use the number of amount columns and position
        if (amounts.length >= 3) {
          // Likely: withdrawal, deposit, balance (one of withdrawal/deposit is the txn)
          const w = parseCurrencyAmount(amounts[0].str)
          const d = parseCurrencyAmount(amounts[1].str)
          if (amounts[0].x < amounts[1].x) {
            // amounts[0] = withdrawal, amounts[1] = deposit
            amount = w > 0 ? -w : d
          } else {
            amount = d > 0 ? -d : w
          }
        } else {
          // 2 amounts: one is the txn, one is balance
          // Check description for clues
          if (/withdraw|debit|payment|purchase/i.test(description)) {
            amount = -txnAmount
          } else if (/deposit|credit|salary|interest|refund/i.test(description)) {
            amount = txnAmount
          } else {
            // Default: try by column position
            // If amount x < balance x, could be either
            // Heuristic: assume withdrawal (outflow) as more common
            amount = -txnAmount
          }
        }
      } else if (amounts.length === 1) {
        const txnAmount = parseCurrencyAmount(amounts[0].str)
        amount = -txnAmount // Default to outflow
      }

      const { payeeName, memo } = cleanPayee(description)

      currentTxn = {
        date,
        description,
        payeeName,
        memo,
        amount,
        balance,
      }
    } else if (currentTxn) {
      // Continuation line — append to description
      const text = row.map(i => i.str.trim()).filter(s => !isAmountStr(s)).join(' ').trim()
      if (text && !/^Page\s+\d|^Date\s+Description/i.test(text)) {
        currentTxn.description += ' ' + text
        const { payeeName, memo } = cleanPayee(currentTxn.description)
        currentTxn.payeeName = payeeName
        if (memo) currentTxn.memo = memo
      }
    }
  }

  if (currentTxn) {
    transactions.push(currentTxn)
  }

  return transactions
}

function parseCreditCardSection(items: (TextItem & { pageNum: number })[], year: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const rows = groupByRow(items, 3)

  let currentTxn: ParsedTransaction | null = null

  for (const row of rows) {
    const rowText = row.map(i => i.str.trim()).join(' ')

    // Skip headers
    if (/^Date\s+Description|^Transaction|NEW TRANSACTIONS|PREVIOUS BALANCE|TOTAL|MINIMUM PAYMENT|PAYMENT DUE/i.test(rowText)) {
      if (currentTxn) {
        transactions.push(currentTxn)
        currentTxn = null
      }
      continue
    }

    const firstItemText = row[0]?.str?.trim() || ''
    const hasDate = DATE_PATTERN.test(firstItemText)

    if (hasDate) {
      if (currentTxn) {
        transactions.push(currentTxn)
      }

      const date = parseDate(firstItemText, year)
      if (!date) continue

      const amounts = row.filter(i => isAmountStr(i.str.trim()))
      const descParts = row
        .filter(i => !DATE_PATTERN.test(i.str.trim()) && !isAmountStr(i.str.trim()))
        .map(i => i.str.trim())
        .filter(Boolean)

      let description = descParts.join(' ')

      // Credit card: single amount column, CR suffix means credit/payment
      let amount = 0
      if (amounts.length > 0) {
        const amountStr = amounts[amounts.length - 1].str.trim()
        amount = parseCurrencyAmount(amountStr)
        // Check if CR (credit) follows
        if (/CR/i.test(rowText) || /CR$/i.test(description)) {
          amount = Math.abs(amount) // inflow (payment/refund)
          description = description.replace(/\s*CR\s*$/i, '').trim()
        } else {
          amount = -Math.abs(amount) // outflow (charge)
        }
      }

      const { payeeName, memo } = cleanPayee(description)

      currentTxn = {
        date,
        description,
        payeeName,
        memo,
        amount,
      }
    } else if (currentTxn) {
      const text = row.map(i => i.str.trim()).filter(s => !isAmountStr(s)).join(' ').trim()
      if (text && !/^Page\s+\d/i.test(text)) {
        currentTxn.description += ' ' + text
        const { payeeName, memo } = cleanPayee(currentTxn.description)
        currentTxn.payeeName = payeeName
        if (memo) currentTxn.memo = memo
      }
    }
  }

  if (currentTxn) {
    transactions.push(currentTxn)
  }

  return transactions
}
