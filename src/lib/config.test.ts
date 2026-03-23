import { describe, it, expect } from 'vitest'
import {
  loadMappings, saveMappings, findMapping, upsertMapping,
  loadHistory, addHistoryRecord,
  loadBudgetId, saveBudgetId,
  type AccountMapping, type ImportRecord,
} from './config'

const mapping: AccountMapping = {
  bankId: 'dbs',
  accountNumber: '123-456',
  accountLabel: 'POSB Savings 123-456',
  ynabAccountId: 'ynab-1',
  ynabAccountName: 'Savings',
}

const record: ImportRecord = {
  timestamp: 1000,
  fileName: 'test.pdf',
  bankId: 'dbs',
  transactionsCreated: 5,
  transactionsSkipped: 1,
  errors: 0,
}

describe('loadMappings / saveMappings', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadMappings()).toEqual([])
  })

  it('roundtrips mappings', () => {
    saveMappings([mapping])
    expect(loadMappings()).toEqual([mapping])
  })

  it('returns empty array on corrupt JSON', () => {
    localStorage.setItem('sg-to-ynab:account-mappings', '{bad')
    expect(loadMappings()).toEqual([])
  })
})

describe('findMapping', () => {
  it('returns undefined when no match', () => {
    expect(findMapping('dbs', '999')).toBeUndefined()
  })

  it('finds matching mapping', () => {
    saveMappings([mapping])
    expect(findMapping('dbs', '123-456')).toEqual(mapping)
  })
})

describe('upsertMapping', () => {
  it('inserts new mapping', () => {
    upsertMapping(mapping)
    expect(loadMappings()).toEqual([mapping])
  })

  it('updates existing mapping', () => {
    upsertMapping(mapping)
    const updated = { ...mapping, ynabAccountName: 'Updated' }
    upsertMapping(updated)
    const result = loadMappings()
    expect(result).toHaveLength(1)
    expect(result[0].ynabAccountName).toBe('Updated')
  })
})

describe('loadHistory / addHistoryRecord', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadHistory()).toEqual([])
  })

  it('adds record to front', () => {
    addHistoryRecord(record)
    addHistoryRecord({ ...record, timestamp: 2000 })
    const history = loadHistory()
    expect(history).toHaveLength(2)
    expect(history[0].timestamp).toBe(2000)
  })

  it('caps at 100 records', () => {
    for (let i = 0; i < 105; i++) {
      addHistoryRecord({ ...record, timestamp: i })
    }
    expect(loadHistory()).toHaveLength(100)
  })

  it('returns empty array on corrupt JSON', () => {
    localStorage.setItem('sg-to-ynab:import-history', 'bad')
    expect(loadHistory()).toEqual([])
  })
})

describe('loadBudgetId / saveBudgetId', () => {
  it('returns null when not set', () => {
    expect(loadBudgetId()).toBeNull()
  })

  it('roundtrips budget ID', () => {
    saveBudgetId('budget-1')
    expect(loadBudgetId()).toBe('budget-1')
  })
})
