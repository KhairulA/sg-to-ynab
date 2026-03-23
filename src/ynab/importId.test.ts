import { describe, it, expect } from 'vitest'
import { assignImportIds } from './importId'

describe('assignImportIds', () => {
  it('returns empty array for empty input', () => {
    expect(assignImportIds([])).toEqual([])
  })

  it('assigns import ID to a single transaction', () => {
    const result = assignImportIds([{
      account_id: 'acc-1',
      date: '2024-01-15',
      amount: -5000,
      payee_name: 'Coffee',
      memo: '',
      cleared: 'cleared',
      approved: false,
    }])
    expect(result).toHaveLength(1)
    expect(result[0].import_id).toBe('YNAB:-5000:2024-01-15:1')
  })

  it('increments occurrence for same date and amount', () => {
    const txn = {
      account_id: 'acc-1',
      date: '2024-01-15',
      amount: -5000,
      payee_name: 'Coffee',
      memo: '',
      cleared: 'cleared' as const,
      approved: false,
    }
    const result = assignImportIds([txn, { ...txn, payee_name: 'Tea' }])
    expect(result[0].import_id).toBe('YNAB:-5000:2024-01-15:1')
    expect(result[1].import_id).toBe('YNAB:-5000:2024-01-15:2')
  })

  it('sorts by date then amount', () => {
    const result = assignImportIds([
      { account_id: 'a', date: '2024-01-20', amount: -1000, payee_name: '', memo: '', cleared: 'cleared', approved: false },
      { account_id: 'a', date: '2024-01-15', amount: -2000, payee_name: '', memo: '', cleared: 'cleared', approved: false },
      { account_id: 'a', date: '2024-01-15', amount: -1000, payee_name: '', memo: '', cleared: 'cleared', approved: false },
    ])
    expect(result[0].date).toBe('2024-01-15')
    expect(result[0].amount).toBe(-2000)
    expect(result[1].date).toBe('2024-01-15')
    expect(result[1].amount).toBe(-1000)
    expect(result[2].date).toBe('2024-01-20')
  })
})
