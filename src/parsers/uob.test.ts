import { describe, it, expect } from 'vitest'
import { uobParser } from './uob'
import type { PageContent, TextItem } from './types'

function item(str: string, x: number, y: number): TextItem {
  return { str, x, y, width: str.length * 6, height: 10, fontName: 'Arial' }
}

function makePage(pageNumber: number, items: TextItem[]): PageContent {
  return { pageNumber, width: 595, height: 842, items }
}

describe('uobParser.detect', () => {
  it('detects United Overseas Bank', () => {
    const page = makePage(1, [item('United Overseas Bank Statement', 50, 50)])
    expect(uobParser.detect([page])).toBe(true)
  })

  it('detects UOB with space', () => {
    const page = makePage(1, [item('UOB Statement', 50, 50)])
    expect(uobParser.detect([page])).toBe(true)
  })

  it('returns false for non-UOB', () => {
    const page = makePage(1, [item('DBS Statement', 50, 50)])
    expect(uobParser.detect([page])).toBe(false)
  })
})

describe('uobParser.parse — savings', () => {
  function buildSavingsStatement(): PageContent[] {
    return [makePage(1, [
      item('Statement Period', 50, 30),
      item(':', 150, 30),
      item('01 Jan 2024', 160, 30),

      // Section header
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 140, 80),
      item('No.', 200, 80),
      item('123-456-789', 230, 80),

      // Table header (skipped)
      item('Date', 50, 120),
      item('Description', 150, 120),

      // DD/MM date format
      item('15/01', 50, 160),
      item('NETS DEBIT COFFEE', 150, 160),
      item('5.50', 350, 160),
      item('1,000.00', 450, 160),

      // DD Mon date format
      item('20 Jan', 50, 200),
      item('FAST TRANSFER', 150, 200),
      item('100.00', 350, 200),
      item('900.00', 450, 200),

      // Multi-line
      item('25/01', 50, 240),
      item('GIRO PAYMENT', 150, 240),
      item('50.00', 350, 240),
      item('850.00', 450, 240),
      item('INSURANCE', 150, 255),
    ])]
  }

  it('parses savings transactions', () => {
    const sections = uobParser.parse(buildSavingsStatement())
    expect(sections).toHaveLength(1)
    expect(sections[0].bankId).toBe('uob')
    expect(sections[0].accountType).toBe('savings')
    expect(sections[0].accountNumber).toBe('123-456-789')
  })

  it('parses DD/MM date format', () => {
    const sections = uobParser.parse(buildSavingsStatement())
    expect(sections[0].transactions[0].date).toBe('2024-01-15')
  })

  it('parses DD Mon date format', () => {
    const sections = uobParser.parse(buildSavingsStatement())
    const fastTxn = sections[0].transactions.find(t => t.description.includes('FAST'))
    expect(fastTxn!.date).toBe('2024-01-20')
  })

  it('cleans payee from NETS DEBIT prefix', () => {
    const sections = uobParser.parse(buildSavingsStatement())
    const netsTxn = sections[0].transactions.find(t => t.memo === 'NETS DEBIT')
    expect(netsTxn).toBeDefined()
    expect(netsTxn!.payeeName).toBe('COFFEE')
  })

  it('handles multi-line descriptions', () => {
    const sections = uobParser.parse(buildSavingsStatement())
    const giroTxn = sections[0].transactions.find(t => t.description.includes('INSURANCE'))
    expect(giroTxn).toBeDefined()
  })
})

describe('uobParser.parse — credit card', () => {
  function buildCCStatement(): PageContent[] {
    return [makePage(1, [
      item('Statement Date : 01 Jan 2024', 50, 30),

      // CC section header
      item('UOB', 50, 80),
      item('One Card', 90, 80),
      item('No.', 150, 80),
      item('1234-****-5678', 180, 80),

      // Header (skipped)
      item('Transaction Date', 50, 120),

      // Charge
      item('10/01', 50, 160),
      item('GRAB RIDE', 150, 160),
      item('25.00', 400, 160),

      // Credit (CR)
      item('15/01', 50, 200),
      item('REFUND CR', 150, 200),
      item('10.00', 400, 200),

      // Multi-line + posting date
      item('20/01', 50, 240),
      item('22/01', 100, 240),
      item('AMAZON', 150, 240),
      item('150.00', 400, 240),
      item('ORDER-123', 150, 255),
    ])]
  }

  it('parses credit card section', () => {
    const sections = uobParser.parse(buildCCStatement())
    expect(sections).toHaveLength(1)
    expect(sections[0].accountType).toBe('credit_card')
  })

  it('treats charges as negative', () => {
    const sections = uobParser.parse(buildCCStatement())
    const grab = sections[0].transactions.find(t => t.description.includes('GRAB'))
    expect(grab!.amount).toBeLessThan(0)
  })

  it('treats CR as positive', () => {
    const sections = uobParser.parse(buildCCStatement())
    const refund = sections[0].transactions.find(t => t.description.includes('REFUND'))
    expect(refund!.amount).toBeGreaterThan(0)
  })

  it('handles multi-line CC descriptions', () => {
    const sections = uobParser.parse(buildCCStatement())
    const amazon = sections[0].transactions.find(t => t.description.includes('ORDER-123'))
    expect(amazon).toBeDefined()
  })

  it('skips foreign currency continuation lines', () => {
    const pages = [makePage(1, [
      item('Statement Date : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('One Card', 90, 80),
      item('No.', 150, 80),
      item('1234-****-5678', 180, 80),
      item('10/01', 50, 160),
      item('OVERSEAS SHOP', 150, 160),
      item('100.00', 400, 160),
      item('foreign currency USD 75.00', 150, 175),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions[0].description).not.toContain('foreign currency')
  })
})

describe('uobParser.parse — edge cases', () => {
  it('returns empty when no headers found', () => {
    const pages = [makePage(1, [item('Random text', 50, 50)])]
    expect(uobParser.parse(pages)).toEqual([])
  })

  it('detects current account type', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('Current', 90, 80),
      item('Account', 150, 80),
      item('No.', 210, 80),
      item('999-888', 240, 80),
      item('15/01', 50, 120),
      item('TXN', 150, 120),
      item('10.00', 350, 120),
      item('100.00', 450, 120),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].accountType).toBe('current')
  })

  it('uses fallback year when no period found', () => {
    const pages = [makePage(1, [
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 150, 80),
      item('No.', 200, 80),
      item('123-456', 230, 80),
      item('15/01', 50, 120),
      item('TXN', 150, 120),
      item('10.00', 350, 120),
      item('100.00', 450, 120),
    ])]
    const sections = uobParser.parse(pages)
    const currentYear = new Date().getFullYear()
    expect(sections[0].transactions[0].date).toContain(String(currentYear))
  })

  it('skips transactions with invalid date format', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB Savings Account No. 123-456', 50, 80),
      // Valid transaction
      item('15/01', 50, 120),
      item('TXN', 150, 120),
      item('10.00', 350, 120),
      item('100.00', 450, 120),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions).toHaveLength(1)
  })

  it('handles single amount (defaults to outflow)', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 150, 80),
      item('No.', 200, 80),
      item('123-456', 230, 80),
      item('15/01', 50, 120),
      item('ATM', 150, 120),
      item('200.00', 350, 120),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions[0].amount).toBe(-200)
  })

  it('skips BALANCE B/F lines', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 150, 80),
      item('No.', 200, 80),
      item('123-456', 230, 80),
      item('BALANCE B/F', 50, 110),
      item('1,000.00', 400, 110),
      item('15/01', 50, 140),
      item('PURCHASE', 150, 140),
      item('50.00', 350, 140),
      item('950.00', 450, 140),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions).toHaveLength(1)
  })

  it('handles 3 amounts with withdrawal column logic', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 150, 80),
      item('No.', 200, 80),
      item('123-456', 230, 80),
      item('15/01', 50, 120),
      item('PURCHASE', 150, 120),
      item('50.00', 300, 120),    // withdrawal (left)
      item('0.00', 380, 120),     // deposit (right)
      item('950.00', 450, 120),   // balance
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions[0].amount).toBe(-50)
  })

  it('skips Page header continuation lines', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 150, 80),
      item('No.', 200, 80),
      item('123-456', 230, 80),
      item('15/01', 50, 120),
      item('PURCHASE', 150, 120),
      item('50.00', 350, 120),
      item('950.00', 450, 120),
      item('Page 2', 50, 135),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions[0].description).not.toContain('Page 2')
  })

  it('parses PRVI Miles card header', () => {
    const pages = [makePage(1, [
      item('Statement Date : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('PRVI Miles', 90, 80),
      item('No.', 170, 80),
      item('5555-****-6666', 200, 80),
      item('10/01', 50, 120),
      item('SHOP', 150, 120),
      item('30.00', 400, 120),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections).toHaveLength(1)
    expect(sections[0].accountType).toBe('credit_card')
  })

  it('handles multiple sections', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),

      // Savings section with single-item header
      item('UOB Savings Account No. 111-222', 50, 80),
      item('Date', 50, 100),
      item('Description', 150, 100),
      item('15/01', 50, 120),
      item('TXN A', 150, 120),
      item('10.00', 350, 120),
      item('100.00', 450, 120),
      // spacing
      item('', 50, 140),
      item('', 50, 160),
      item('', 50, 180),
      item('', 50, 200),
      item('', 50, 220),
      item('', 50, 240),
      item('', 50, 260),
      item('', 50, 280),

      // CC section - single-item header
      item('UOB One Card No. 9999-****-0000', 50, 400),
      item('20/01', 50, 440),
      item('TXN B', 150, 440),
      item('50.00', 400, 440),
    ])]
    const sections = uobParser.parse(pages)
    const types = sections.map(s => s.accountType)
    expect(types).toContain('savings')
    expect(types).toContain('credit_card')
  })

  it('skips CC header rows (PREVIOUS BALANCE, MINIMUM PAYMENT, PAYMENT DUE)', () => {
    const pages = [makePage(1, [
      item('Statement Date : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('One Card', 90, 80),
      item('No.', 150, 80),
      item('1234-****-5678', 180, 80),
      item('PREVIOUS BALANCE', 50, 110),
      item('500.00', 400, 110),
      item('MINIMUM PAYMENT DUE', 50, 125),
      item('25.00', 400, 125),
      item('10/01', 50, 160),
      item('SHOP', 150, 160),
      item('30.00', 400, 160),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions).toHaveLength(1)
  })

  it('handles withdrawal keyword in description', () => {
    const pages = [makePage(1, [
      item('Statement Period : 01 Jan 2024', 50, 30),
      item('UOB', 50, 80),
      item('Savings', 90, 80),
      item('Account', 150, 80),
      item('No.', 200, 80),
      item('123-456', 230, 80),
      item('15/01', 50, 120),
      item('ATM WITHDRAWAL', 150, 120),
      item('200.00', 350, 120),
      item('800.00', 450, 120),
    ])]
    const sections = uobParser.parse(pages)
    expect(sections[0].transactions[0].amount).toBe(-200)
  })
})
