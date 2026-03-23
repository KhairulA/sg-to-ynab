import type { PageContent, AccountSection, AccountType, ParsedTransaction, TextItem } from './types'
import type { BankParser } from './types'
import { groupByRow } from './columnDetector'
import { parseCurrencyAmount } from '../lib/amounts'

// Date patterns
const DATE_DD_MM = /^\d{2}\/\d{2}$/ // DD/MM
const DATE_DD_MON = /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i

// Account section headers
const SAVINGS_HEADER = /(?:UOB|United Overseas Bank)\s+(?:Savings|Current|Uniplus)\s+(?:Account)?\s*(?:No\.?\s*)?([\d-]+)/i
const CC_HEADER = /(?:UOB)\s+(?:One\s+Card|PRVI\s+Miles|Lady'?s?\s+Card|Visa|MasterCard|Credit\s+Card)\s*(?:No\.?\s*)?([\d*\s-]+)/i

// Statement period
const PERIOD_PATTERN = /Statement\s+(?:Period|Date)\s*:?\s*\d{1,2}\s+\w+\s+(\d{4})/i

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function parseDateDDMM(str: string, year: number): string {
  const [dd, mm] = str.split('/')
  return `${year}-${mm}-${dd}`
}

function parseDateDDMon(str: string, year: number): string {
  const parts = str.trim().split(/\s+/)
  if (parts.length !== 2) return ''
  const day = parts[0].padStart(2, '0')
  const month = MONTH_MAP[parts[1].toLowerCase()]
  if (!month) return ''
  return `${year}-${month}-${day}`
}

function parseAnyDate(str: string, year: number): string {
  if (DATE_DD_MM.test(str)) return parseDateDDMM(str, year)
  if (DATE_DD_MON.test(str)) return parseDateDDMon(str, year)
  return ''
}

function detectYear(pages: PageContent[]): number {
  const allText = pages.flatMap(p => p.items.map(i => i.str)).join(' ')
  const match = allText.match(PERIOD_PATTERN)
  if (match) return parseInt(match[1], 10)
  return new Date().getFullYear()
}

function isAmountStr(str: string): boolean {
  return /^[\d,]+\.\d{2}$/.test(str.trim())
}

function isDateStr(str: string): boolean {
  return DATE_DD_MM.test(str.trim()) || DATE_DD_MON.test(str.trim())
}

function cleanPayee(description: string): { payeeName: string; memo: string } {
  const prefixes = [
    'NETS DEBIT', 'NETS', 'GIRO', 'IBG', 'FAST', 'FUND TRANSFER',
    'BILL PAYMENT', 'POS', 'ATM', 'INTEREST CREDIT',
    'ANNUAL FEE', 'PAYMENT RECEIVED', 'SI-',
  ]
  const upper = description.toUpperCase()
  for (const prefix of prefixes) {
    if (upper.startsWith(prefix)) {
      const rest = description.slice(prefix.length).replace(/^[\s-]+/, '').trim()
      return { payeeName: rest || description, memo: prefix }
    }
  }
  return { payeeName: description, memo: '' }
}

export const uobParser: BankParser = {
  bankId: 'uob',
  bankName: 'UOB',

  detect(pages: PageContent[]): boolean {
    const text = pages.slice(0, 2).flatMap(p => p.items.map(i => i.str)).join(' ')
    return /United Overseas Bank|UOB\s/i.test(text)
  },

  parse(pages: PageContent[]): AccountSection[] {
    const year = detectYear(pages)
    const sections: AccountSection[] = []

    const allItems: (TextItem & { pageNum: number })[] = []
    for (const page of pages) {
      for (const item of page.items) {
        allItems.push({ ...item, pageNum: page.pageNumber })
      }
    }

    // Find section boundaries
    const sectionBoundaries: {
      type: AccountType
      accountNumber: string
      label: string
      startIdx: number
    }[] = []

    const allText = allItems.map(i => i.str)

    for (let i = 0; i < allItems.length; i++) {
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

      const ccMatch = windowText.match(CC_HEADER)
      if (ccMatch) {
        sectionBoundaries.push({
          type: 'credit_card',
          accountNumber: ccMatch[1].replace(/\s/g, '').trim(),
          label: ccMatch[0].trim(),
          startIdx: i,
        })
      }
    }

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
          bankId: 'uob',
          bankName: 'UOB',
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

    if (/^Date\s+Description|^Total|BALANCE B\/F|BALANCE C\/F/i.test(rowText)) {
      if (currentTxn) { transactions.push(currentTxn); currentTxn = null }
      continue
    }

    const firstItemText = row[0]?.str?.trim() || ''
    const hasDate = isDateStr(firstItemText)

    if (hasDate) {
      if (currentTxn) transactions.push(currentTxn)

      const date = parseAnyDate(firstItemText, year)
      if (!date) continue

      const amounts = row.filter(i => isAmountStr(i.str.trim()))
      const descParts = row
        .filter(i => !isDateStr(i.str.trim()) && !isAmountStr(i.str.trim()))
        .map(i => i.str.trim())
        .filter(Boolean)

      const description = descParts.join(' ')
      let amount = 0
      let balance: number | undefined

      if (amounts.length >= 2) {
        balance = parseCurrencyAmount(amounts[amounts.length - 1].str)
        const txnAmount = parseCurrencyAmount(amounts[amounts.length - 2].str)

        // UOB uses Withdrawal(-) and Deposit(+) columns
        // Check for minus sign or column position
        if (/withdrawal|debit|\(-\)/i.test(rowText)) {
          amount = -txnAmount
        } else {
          // Infer from column position
          if (amounts.length >= 3) {
            const w = parseCurrencyAmount(amounts[0].str)
            const d = parseCurrencyAmount(amounts[1].str)
            amount = amounts[0].x < amounts[1].x ? -w : d
          } else {
            amount = -txnAmount
          }
        }
      } else if (amounts.length === 1) {
        amount = -parseCurrencyAmount(amounts[0].str)
      }

      const { payeeName, memo } = cleanPayee(description)
      currentTxn = { date, description, payeeName, memo, amount, balance }
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

  if (currentTxn) transactions.push(currentTxn)
  return transactions
}

function parseCreditCardSection(items: (TextItem & { pageNum: number })[], year: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const rows = groupByRow(items, 3)
  let currentTxn: ParsedTransaction | null = null

  for (const row of rows) {
    const rowText = row.map(i => i.str.trim()).join(' ')

    if (/^Trans(?:action)?\s+Date|^Total|NEW TRANSACTIONS|PREVIOUS BALANCE|MINIMUM PAYMENT|PAYMENT DUE/i.test(rowText)) {
      if (currentTxn) { transactions.push(currentTxn); currentTxn = null }
      continue
    }

    const firstItemText = row[0]?.str?.trim() || ''
    const hasDate = isDateStr(firstItemText)

    if (hasDate) {
      if (currentTxn) transactions.push(currentTxn)

      // UOB CC may have transaction date + posting date
      const dates = row.filter(i => isDateStr(i.str.trim()))
      const txnDate = parseAnyDate(dates[0]?.str?.trim() || firstItemText, year)
      if (!txnDate) continue

      const amounts = row.filter(i => isAmountStr(i.str.trim()))
      const descParts = row
        .filter(i => !isDateStr(i.str.trim()) && !isAmountStr(i.str.trim()))
        .map(i => i.str.trim())
        .filter(Boolean)

      let description = descParts.join(' ')
      let amount = 0

      if (amounts.length > 0) {
        amount = parseCurrencyAmount(amounts[amounts.length - 1].str)
        if (/CR/i.test(rowText) || /CR$/i.test(description)) {
          amount = Math.abs(amount)
          description = description.replace(/\s*CR\s*$/i, '').trim()
        } else {
          amount = -Math.abs(amount)
        }
      }

      const { payeeName, memo } = cleanPayee(description)
      currentTxn = { date: txnDate, description, payeeName, memo, amount }
    } else if (currentTxn) {
      const text = row.map(i => i.str.trim()).filter(s => !isAmountStr(s) && !isDateStr(s)).join(' ').trim()
      if (text && !/^Page\s+\d|foreign currency/i.test(text)) {
        currentTxn.description += ' ' + text
        const { payeeName, memo } = cleanPayee(currentTxn.description)
        currentTxn.payeeName = payeeName
        if (memo) currentTxn.memo = memo
      }
    }
  }

  if (currentTxn) transactions.push(currentTxn)
  return transactions
}
