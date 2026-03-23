import { describe, it, expect } from 'vitest'
import { detectBank } from './bankDetector'
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

describe('detectBank', () => {
  it('detects DBS', () => {
    const result = detectBank([makePage(['DBS Bank Statement'])])
    expect(result).toEqual({ bankId: 'dbs', bankName: 'DBS / POSB' })
  })

  it('detects POSB', () => {
    const result = detectBank([makePage(['POSB eStatement'])])
    expect(result).toEqual({ bankId: 'dbs', bankName: 'DBS / POSB' })
  })

  it('detects Development Bank of Singapore', () => {
    const result = detectBank([makePage(['Development Bank of Singapore'])])
    expect(result).toEqual({ bankId: 'dbs', bankName: 'DBS / POSB' })
  })

  it('detects UOB', () => {
    const result = detectBank([makePage(['United Overseas Bank Statement'])])
    expect(result).toEqual({ bankId: 'uob', bankName: 'UOB' })
  })

  it('detects UOB with space', () => {
    const result = detectBank([makePage(['UOB Statement'])])
    expect(result).toEqual({ bankId: 'uob', bankName: 'UOB' })
  })

  it('detects OCBC', () => {
    const result = detectBank([makePage(['Oversea-Chinese Banking Corp'])])
    expect(result).toEqual({ bankId: 'ocbc', bankName: 'OCBC' })
  })

  it('detects OCBC with space', () => {
    const result = detectBank([makePage(['OCBC Statement'])])
    expect(result).toEqual({ bankId: 'ocbc', bankName: 'OCBC' })
  })

  it('detects Standard Chartered', () => {
    const result = detectBank([makePage(['Standard Chartered Bank'])])
    expect(result).toEqual({ bankId: 'scb', bankName: 'Standard Chartered' })
  })

  it('detects StanChart', () => {
    const result = detectBank([makePage(['StanChart Statement'])])
    expect(result).toEqual({ bankId: 'scb', bankName: 'Standard Chartered' })
  })

  it('detects HSBC', () => {
    const result = detectBank([makePage(['HSBC Statement'])])
    expect(result).toEqual({ bankId: 'hsbc', bankName: 'HSBC' })
  })

  it('detects Hongkong and Shanghai Banking', () => {
    const result = detectBank([makePage(['Hongkong and Shanghai Banking Corp'])])
    expect(result).toEqual({ bankId: 'hsbc', bankName: 'HSBC' })
  })

  it('detects Maybank', () => {
    const result = detectBank([makePage(['Maybank Statement'])])
    expect(result).toEqual({ bankId: 'maybank', bankName: 'Maybank' })
  })

  it('detects Malayan Banking', () => {
    const result = detectBank([makePage(['Malayan Banking Berhad'])])
    expect(result).toEqual({ bankId: 'maybank', bankName: 'Maybank' })
  })

  it('detects Citibank', () => {
    const result = detectBank([makePage(['Citibank Statement'])])
    expect(result).toEqual({ bankId: 'citibank', bankName: 'Citibank' })
  })

  it('detects Citi with space', () => {
    const result = detectBank([makePage(['Citi Statement'])])
    expect(result).toEqual({ bankId: 'citibank', bankName: 'Citibank' })
  })

  it('returns null for unknown bank', () => {
    expect(detectBank([makePage(['Random PDF content'])])).toBeNull()
  })

  it('returns null for empty pages', () => {
    expect(detectBank([])).toBeNull()
  })

  it('scans only first 2 pages', () => {
    const page1 = makePage(['Some content'])
    const page2 = makePage(['More content'])
    const page3 = makePage(['DBS Bank Statement']) // Page 3 should not be scanned
    expect(detectBank([page1, page2, page3])).toBeNull()
  })
})
