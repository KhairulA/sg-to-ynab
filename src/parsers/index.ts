import type { BankParser, PageContent, AccountSection } from './types'
import { dbsParser } from './dbs'
import { uobParser } from './uob'
import { detectBank } from './bankDetector'

export type { PageContent, AccountSection, ParsedTransaction, BankId, AccountType, TextItem } from './types'

/** Registry of all available bank parsers */
const parsers: BankParser[] = [
  dbsParser,
  uobParser,
]

/**
 * Auto-detect the bank and parse the PDF pages.
 * Returns null if the bank cannot be detected.
 */
export function parseStatement(pages: PageContent[]): {
  bankId: string
  bankName: string
  sections: AccountSection[]
} | null {
  const detected = detectBank(pages)
  if (!detected) return null

  const parser = parsers.find(p => p.bankId === detected.bankId)
  if (!parser) return null

  const sections = parser.parse(pages)
  return {
    bankId: detected.bankId,
    bankName: detected.bankName,
    sections,
  }
}

/** Get list of supported bank names */
export function getSupportedBanks(): { bankId: string; bankName: string }[] {
  return parsers.map(p => ({ bankId: p.bankId, bankName: p.bankName }))
}
