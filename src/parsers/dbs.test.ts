import { describe, it, expect } from 'vitest'
import { dbsParser } from './dbs'
import type { PageContent, TextItem } from './types'

function item(str: string, x: number, y: number): TextItem {
  return { str, x, y, width: str.length * 6, height: 10, fontName: 'Arial' }
}

function makePage(pageNumber: number, items: TextItem[]): PageContent {
  return { pageNumber, width: 595, height: 842, items }
}

describe('dbsParser.detect', () => {
  it('detects DBS Bank text', () => {
    const page = makePage(1, [item('DBS Bank eStatement', 50, 50)])
    expect(dbsParser.detect([page])).toBe(true)
  })

  it('detects POSB text', () => {
    const page = makePage(1, [item('POSB Savings', 50, 50)])
    expect(dbsParser.detect([page])).toBe(true)
  })

  it('returns false for non-DBS text', () => {
    const page = makePage(1, [item('UOB Statement', 50, 50)])
    expect(dbsParser.detect([page])).toBe(false)
  })
})

describe('dbsParser.parse — savings', () => {
  function buildSavingsStatement(): PageContent[] {
    return [makePage(1, [
      // Statement period for year detection
      item('Statement Period', 50, 30),
      item(':', 150, 30),
      item('01 Jan 2024 to 31 Jan 2024', 160, 30),

      // Section header
      item('POSB', 50, 80),
      item('Savings', 110, 80),
      item('Account', 170, 80),
      item('123-45678-9', 240, 80),

      // Table header (should be skipped)
      item('Date', 50, 120),
      item('Description', 150, 120),

      // Transaction with 3 amounts (withdrawal, deposit, balance)
      item('15 Jan', 50, 160),
      item('NETS DEBIT COFFEE SHOP', 150, 160),
      item('5.50', 350, 160),   // withdrawal
      item('0.00', 420, 160),   // deposit (placeholder, same row)
      item('1,000.00', 480, 160), // balance

      // Transaction with 2 amounts
      item('20 Jan', 50, 200),
      item('SALARY CREDIT', 150, 200),
      item('3,000.00', 420, 200), // deposit
      item('4,000.00', 480, 200), // balance

      // Multi-line transaction
      item('25 Jan', 50, 240),
      item('GIRO PAYMENT', 150, 240),
      item('100.00', 350, 240),
      item('3,900.00', 480, 240),
      // Continuation line
      item('INSURANCE PREMIUM', 150, 255),
    ])]
  }

  it('parses savings transactions', () => {
    const sections = dbsParser.parse(buildSavingsStatement())
    expect(sections).toHaveLength(1)
    expect(sections[0].bankId).toBe('dbs')
    expect(sections[0].accountType).toBe('savings')
    expect(sections[0].accountNumber).toBe('123-45678-9')
    expect(sections[0].currency).toBe('SGD')
    expect(sections[0].transactions.length).toBeGreaterThanOrEqual(2)
  })

  it('detects year from statement period', () => {
    const sections = dbsParser.parse(buildSavingsStatement())
    expect(sections[0].transactions[0].date).toMatch(/^2024-/)
  })

  it('cleans payee name by stripping NETS DEBIT prefix', () => {
    const sections = dbsParser.parse(buildSavingsStatement())
    const netsTxn = sections[0].transactions.find(t => t.memo === 'NETS DEBIT')
    expect(netsTxn).toBeDefined()
    expect(netsTxn!.payeeName).toBe('COFFEE SHOP')
  })

  it('handles multi-line descriptions', () => {
    const sections = dbsParser.parse(buildSavingsStatement())
    const giroTxn = sections[0].transactions.find(t => t.description.includes('INSURANCE PREMIUM'))
    expect(giroTxn).toBeDefined()
  })
})

describe('dbsParser.parse — credit card', () => {
  function buildCCStatement(): PageContent[] {
    return [makePage(1, [
      item('Statement Period', 50, 30),
      item(':', 150, 30),
      item('01 Jan 2024 to 31 Jan 2024', 160, 30),

      // CC section header
      item('DBS', 50, 80),
      item('Credit Card', 90, 80),
      item('No.', 160, 80),
      item('1234-****-5678', 190, 80),

      // Header row (skipped)
      item('Date', 50, 120),
      item('Description', 150, 120),

      // Charge
      item('10 Jan', 50, 160),
      item('GRAB RIDE', 150, 160),
      item('25.00', 400, 160),

      // Credit/refund (CR suffix)
      item('15 Jan', 50, 200),
      item('REFUND GRAB CR', 150, 200),
      item('10.00', 400, 200),

      // Multi-line CC transaction
      item('20 Jan', 50, 240),
      item('AMAZON PURCHASE', 150, 240),
      item('150.00', 400, 240),
      item('ORDER 12345', 150, 255),
    ])]
  }

  it('parses credit card section', () => {
    const sections = dbsParser.parse(buildCCStatement())
    expect(sections).toHaveLength(1)
    expect(sections[0].accountType).toBe('credit_card')
  })

  it('treats charges as negative (outflow)', () => {
    const sections = dbsParser.parse(buildCCStatement())
    const charge = sections[0].transactions.find(t => t.description.includes('GRAB RIDE'))
    expect(charge).toBeDefined()
    expect(charge!.amount).toBeLessThan(0)
  })

  it('treats CR as positive (inflow)', () => {
    const sections = dbsParser.parse(buildCCStatement())
    const credit = sections[0].transactions.find(t => t.description.includes('REFUND'))
    expect(credit).toBeDefined()
    expect(credit!.amount).toBeGreaterThan(0)
  })

  it('handles multi-line CC descriptions', () => {
    const sections = dbsParser.parse(buildCCStatement())
    const amazon = sections[0].transactions.find(t => t.description.includes('ORDER 12345'))
    expect(amazon).toBeDefined()
  })
})

describe('dbsParser.parse — consolidated', () => {
  it('parses multiple sections from one statement', () => {
    // Use a single page with well-separated sections
    // and add many filler items between them to ensure sliding window doesn't overlap
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),

      // Savings section - all on one page with many items before CC
      item('POSB Savings Account 111-222', 50, 80),
      item('Date', 50, 100),
      item('Description', 150, 100),
      item('15 Jan', 50, 120),
      item('PURCHASE', 150, 120),
      item('50.00', 350, 120),
      item('950.00', 450, 120),
      // filler items for spacing
      item('', 50, 140),
      item('', 50, 160),
      item('', 50, 180),
      item('', 50, 200),
      item('', 50, 220),
      item('', 50, 240),
      item('', 50, 260),
      item('', 50, 280),

      // CC section - far from savings header
      item('DBS Credit Card No. 9999-****-0000', 50, 400),
      item('Date', 50, 420),
      item('Description', 150, 420),
      item('20 Jan', 50, 440),
      item('SHOP', 150, 440),
      item('30.00', 400, 440),
    ])]

    const sections = dbsParser.parse(pages)
    const types = sections.map(s => s.accountType)
    expect(types).toContain('savings')
    expect(types).toContain('credit_card')
  })
})

describe('dbsParser.parse — edge cases', () => {
  it('returns empty sections when no headers found', () => {
    const pages = [makePage(1, [item('Random text', 50, 50)])]
    expect(dbsParser.parse(pages)).toEqual([])
  })

  it('flushes current transaction when hitting header line', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('POSB Savings Account 123-456', 50, 80),
      // Transaction
      item('15 Jan', 50, 120),
      item('PURCHASE', 150, 120),
      item('50.00', 350, 120),
      item('950.00', 450, 120),
      // Header line should flush the transaction
      item('BALANCE CARRIED FORWARD', 50, 160),
      item('900.00', 400, 160),
    ])]
    const sections = dbsParser.parse(pages)
    expect(sections[0].transactions).toHaveLength(1)
    expect(sections[0].transactions[0].payeeName).toBe('PURCHASE')
  })

  it('handles 2-amount default (no keyword match)', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('POSB Savings Account 123-456', 50, 80),
      item('15 Jan', 50, 120),
      item('SOME TRANSFER', 150, 120),
      item('75.00', 350, 120),
      item('925.00', 450, 120),
    ])]
    const sections = dbsParser.parse(pages)
    // Default is outflow when no keyword match
    expect(sections[0].transactions[0].amount).toBe(-75)
  })

  it('skips BALANCE BROUGHT FORWARD lines', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('POSB', 50, 80),
      item('Savings', 110, 80),
      item('Account', 170, 80),
      item('123-456', 240, 80),
      item('BALANCE BROUGHT FORWARD', 50, 120),
      item('1,000.00', 400, 120),
      item('15 Jan', 50, 160),
      item('PURCHASE', 150, 160),
      item('50.00', 350, 160),
      item('950.00', 450, 160),
    ])]
    const sections = dbsParser.parse(pages)
    // Only the real transaction, not the balance forward
    expect(sections[0].transactions).toHaveLength(1)
  })

  it('detects current account type', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('DBS', 50, 80),
      item('Current', 90, 80),
      item('Account', 150, 80),
      item('999-888', 220, 80),
      item('15 Jan', 50, 120),
      item('TXN', 150, 120),
      item('10.00', 350, 120),
      item('100.00', 450, 120),
    ])]
    const sections = dbsParser.parse(pages)
    expect(sections[0].accountType).toBe('current')
  })

  it('uses fallback year when no period found', () => {
    const pages = [makePage(1, [
      item('POSB', 50, 80),
      item('Savings', 110, 80),
      item('Account', 170, 80),
      item('123-456', 240, 80),
      item('15 Jan', 50, 120),
      item('TXN', 150, 120),
      item('10.00', 350, 120),
      item('100.00', 450, 120),
    ])]
    const sections = dbsParser.parse(pages)
    const currentYear = new Date().getFullYear()
    expect(sections[0].transactions[0].date).toContain(String(currentYear))
  })

  it('handles single amount transaction (defaults to outflow)', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('POSB', 50, 80),
      item('Savings', 110, 80),
      item('Account', 170, 80),
      item('123-456', 240, 80),
      item('15 Jan', 50, 120),
      item('ATM WITHDRAWAL', 150, 120),
      item('200.00', 350, 120),
    ])]
    const sections = dbsParser.parse(pages)
    expect(sections[0].transactions[0].amount).toBe(-200)
  })

  it('uses description keywords to determine deposit', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('POSB', 50, 80),
      item('Savings', 110, 80),
      item('Account', 170, 80),
      item('123-456', 240, 80),
      item('15 Jan', 50, 120),
      item('SALARY DEPOSIT', 150, 120),
      item('3000.00', 350, 120),
      item('5000.00', 450, 120),
    ])]
    const sections = dbsParser.parse(pages)
    expect(sections[0].transactions[0].amount).toBe(3000)
  })

  it('skips header rows like "Total"', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('DBS', 50, 80),
      item('Credit Card', 90, 80),
      item('No.', 160, 80),
      item('1234-****-5678', 190, 80),
      item('NEW TRANSACTIONS', 50, 110),
      item('10 Jan', 50, 140),
      item('SHOP', 150, 140),
      item('50.00', 400, 140),
      item('TOTAL', 50, 180),
      item('50.00', 400, 180),
    ])]
    const sections = dbsParser.parse(pages)
    expect(sections[0].transactions).toHaveLength(1)
  })

  it('skips Page header continuation lines', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024 to 31 Jan 2024', 50, 30),
      item('POSB', 50, 80),
      item('Savings', 110, 80),
      item('Account', 170, 80),
      item('123-456', 240, 80),
      item('15 Jan', 50, 120),
      item('PURCHASE', 150, 120),
      item('50.00', 350, 120),
      item('950.00', 450, 120),
      item('Page 2', 50, 135),
    ])]
    const sections = dbsParser.parse(pages)
    expect(sections[0].transactions[0].description).not.toContain('Page 2')
  })
})
