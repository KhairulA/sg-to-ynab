import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listBudgets, listAccounts, createTransactions, YnabApiError } from './client'

const mockFetch = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  })
}

function errorResponse(status: number, detail: string) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ error: { detail } }),
  })
}

describe('YnabApiError', () => {
  it('formats error message', () => {
    const err = new YnabApiError(401, 'Unauthorized')
    expect(err.message).toBe('YNAB API error (401): Unauthorized')
    expect(err.status).toBe(401)
    expect(err.detail).toBe('Unauthorized')
    expect(err.name).toBe('YnabApiError')
  })
})

describe('listBudgets', () => {
  it('returns budgets on success', async () => {
    const budgets = [{ id: 'b1', name: 'My Budget' }]
    mockFetch.mockReturnValue(jsonResponse({ data: { budgets } }))
    const result = await listBudgets('tok')
    expect(result).toEqual(budgets)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.ynab.com/v1/budgets',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    )
  })

  it('throws YnabApiError on 401', async () => {
    mockFetch.mockReturnValue(errorResponse(401, 'expired'))
    await expect(listBudgets('tok')).rejects.toThrow(YnabApiError)
    await expect(listBudgets('tok')).rejects.toThrow('Access token expired')
  })

  it('throws YnabApiError on 429', async () => {
    mockFetch.mockReturnValue(errorResponse(429, 'rate limited'))
    await expect(listBudgets('tok')).rejects.toThrow('Rate limit exceeded')
  })

  it('throws on generic error with JSON body', async () => {
    mockFetch.mockReturnValue(errorResponse(500, 'Internal'))
    await expect(listBudgets('tok')).rejects.toThrow('Internal')
  })

  it('throws on error with non-JSON body', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('not json')),
    }))
    await expect(listBudgets('tok')).rejects.toThrow('Bad Gateway')
  })
})

describe('listAccounts', () => {
  it('returns open accounts only', async () => {
    const accounts = [
      { id: 'a1', name: 'Open', closed: false },
      { id: 'a2', name: 'Closed', closed: true },
    ]
    mockFetch.mockReturnValue(jsonResponse({ data: { accounts } }))
    const result = await listAccounts('tok', 'b1')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Open')
  })
})

describe('createTransactions', () => {
  it('sends transactions in batch', async () => {
    mockFetch.mockReturnValue(jsonResponse({
      data: { transaction_ids: ['t1'], duplicate_import_ids: [] },
    }))
    const txns = [{ account_id: 'a1', date: '2024-01-01', amount: -5000, payee_name: 'X', memo: '', cleared: 'cleared' as const, approved: false, import_id: 'YNAB:-5000:2024-01-01:1' }]
    const result = await createTransactions('tok', 'b1', txns)
    expect(result.transaction_ids).toEqual(['t1'])
    expect(result.duplicate_import_ids).toEqual([])
  })

  it('batches in groups of 100', async () => {
    mockFetch.mockClear()
    mockFetch.mockReturnValue(jsonResponse({
      data: { transaction_ids: ['t1'], duplicate_import_ids: ['d1'] },
    }))
    const txns = Array.from({ length: 150 }, (_, i) => ({
      account_id: 'a1',
      date: '2024-01-01',
      amount: -1000 * i,
      payee_name: `Txn ${i}`,
      memo: '',
      cleared: 'cleared' as const,
      approved: false,
      import_id: `YNAB:${-1000 * i}:2024-01-01:1`,
    }))
    const result = await createTransactions('tok', 'b1', txns)
    // 2 batches: 100 + 50
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.transaction_ids).toEqual(['t1', 't1'])
    expect(result.duplicate_import_ids).toEqual(['d1', 'd1'])
  })
})
