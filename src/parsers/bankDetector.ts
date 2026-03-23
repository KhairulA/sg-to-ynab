import type { PageContent, BankId } from './types'

interface BankPattern {
  bankId: BankId
  bankName: string
  patterns: RegExp[]
}

const BANK_PATTERNS: BankPattern[] = [
  {
    bankId: 'dbs',
    bankName: 'DBS / POSB',
    patterns: [
      /DBS\s+Bank/i,
      /POSB/i,
      /Development Bank of Singapore/i,
      /DBS.*eStatement/i,
    ],
  },
  {
    bankId: 'uob',
    bankName: 'UOB',
    patterns: [
      /United Overseas Bank/i,
      /UOB\s/i,
      /UOB.*Statement/i,
    ],
  },
  {
    bankId: 'ocbc',
    bankName: 'OCBC',
    patterns: [
      /Oversea-Chinese Banking/i,
      /OCBC\s/i,
      /OCBC.*Statement/i,
    ],
  },
  {
    bankId: 'scb',
    bankName: 'Standard Chartered',
    patterns: [
      /Standard Chartered/i,
      /StanChart/i,
    ],
  },
  {
    bankId: 'hsbc',
    bankName: 'HSBC',
    patterns: [
      /HSBC/i,
      /Hongkong and Shanghai Banking/i,
    ],
  },
  {
    bankId: 'maybank',
    bankName: 'Maybank',
    patterns: [
      /Maybank/i,
      /Malayan Banking/i,
    ],
  },
  {
    bankId: 'citibank',
    bankName: 'Citibank',
    patterns: [
      /Citibank/i,
      /Citi\s/i,
    ],
  },
]

/**
 * Detect which bank issued a PDF statement by scanning the first 2 pages
 * for bank-identifying text patterns.
 */
export function detectBank(pages: PageContent[]): { bankId: BankId; bankName: string } | null {
  // Combine text from first 2 pages
  const scanPages = pages.slice(0, 2)
  const allText = scanPages
    .flatMap(p => p.items.map(item => item.str))
    .join(' ')

  for (const bank of BANK_PATTERNS) {
    for (const pattern of bank.patterns) {
      if (pattern.test(allText)) {
        return { bankId: bank.bankId, bankName: bank.bankName }
      }
    }
  }

  return null
}
