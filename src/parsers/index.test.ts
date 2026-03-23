import { describe, it, expect } from 'vitest'
import { parseStatement, getSupportedBanks } from './index'
import type { PageContent } from './types'

function makePage(texts: string[]): PageContent {
  return {
    pageNumber: 1,
    width: 595,
    height: 842,
    items: texts.map((str, i) => ({
      str,
      x: 50,
      y: 50 + i * 20,
      width: 100,
      height: 12,
      fontName: 'Arial',
    })),
  }
}

describe('parseStatement', () => {
  it('returns null for unrecognised bank', () => {
    expect(parseStatement([makePage(['Random content'])])).toBeNull()
  })

  it('returns null for detected but unimplemented bank', () => {
    // OCBC is detected but has no parser
    expect(parseStatement([makePage(['OCBC Statement'])])).toBeNull()
  })

  it('returns sections for DBS statement', () => {
    const pages = [makePage([
      'DBS Bank eStatement',
      'Statement Period : 01 Jan 2024 to 31 Jan 2024',
      'POSB Savings Account 123-456',
      // Enough for detection, but no transactions = empty sections
    ])]
    const result = parseStatement(pages)
    expect(result).not.toBeNull()
    expect(result!.bankId).toBe('dbs')
    expect(result!.bankName).toBe('DBS / POSB')
  })

  it('returns sections for UOB statement', () => {
    const pages = [makePage([
      'United Overseas Bank',
      'Statement Period : 01 Jan 2024',
    ])]
    const result = parseStatement(pages)
    expect(result).not.toBeNull()
    expect(result!.bankId).toBe('uob')
    expect(result!.bankName).toBe('UOB')
  })
})

describe('getSupportedBanks', () => {
  it('returns DBS and UOB', () => {
    const banks = getSupportedBanks()
    expect(banks).toEqual([
      { bankId: 'dbs', bankName: 'DBS / POSB' },
      { bankId: 'uob', bankName: 'UOB' },
    ])
  })
})
