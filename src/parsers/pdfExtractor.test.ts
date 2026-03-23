import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdfjs-dist before importing anything
const mockGetDocument = vi.fn()

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  version: '0.0.0',
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}))

import { extractPdfText, isPasswordError, isIncorrectPassword } from './pdfExtractor'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isPasswordError', () => {
  it('returns true for "No password given"', () => {
    expect(isPasswordError(new Error('No password given'))).toBe(true)
  })

  it('returns true for "Incorrect Password"', () => {
    expect(isPasswordError(new Error('Incorrect Password'))).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isPasswordError(new Error('Something else'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isPasswordError('string error')).toBe(false)
    expect(isPasswordError(null)).toBe(false)
    expect(isPasswordError(undefined)).toBe(false)
    expect(isPasswordError(42)).toBe(false)
  })
})

describe('isIncorrectPassword', () => {
  it('returns true for "Incorrect Password"', () => {
    expect(isIncorrectPassword(new Error('Incorrect Password'))).toBe(true)
  })

  it('returns false for "No password given"', () => {
    expect(isIncorrectPassword(new Error('No password given'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isIncorrectPassword('string')).toBe(false)
    expect(isIncorrectPassword(null)).toBe(false)
  })
})

describe('extractPdfText', () => {
  function mockPdf(numPages: number, pageItems: Record<string, unknown>[][] = []) {
    const pages: Record<string, unknown>[] = []
    for (let i = 0; i < numPages; i++) {
      const items = pageItems[i] || []
      pages.push({
        getViewport: () => ({ width: 595, height: 842 }),
        getTextContent: () => Promise.resolve({ items }),
      })
    }

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages,
        getPage: (n: number) => Promise.resolve(pages[n - 1]),
      }),
    })
  }

  it('extracts text from a single page', async () => {
    mockPdf(1, [[
      { str: 'Hello', transform: [1, 0, 0, 1, 50, 700], width: 30, height: 12, fontName: 'Arial' },
      { str: 'World', transform: [1, 0, 0, 1, 100, 700], width: 30, height: 12, fontName: 'Arial' },
    ]])

    const result = await extractPdfText(new ArrayBuffer(10))
    expect(result).toHaveLength(1)
    expect(result[0].pageNumber).toBe(1)
    expect(result[0].width).toBe(595)
    expect(result[0].height).toBe(842)
    expect(result[0].items).toHaveLength(2)
    expect(result[0].items[0].str).toBe('Hello')
    expect(result[0].items[0].x).toBe(50)
    // y = viewport.height - transform[5] = 842 - 700 = 142
    expect(result[0].items[0].y).toBe(142)
  })

  it('skips empty text items', async () => {
    mockPdf(1, [[
      { str: 'Hello', transform: [1, 0, 0, 1, 50, 700], width: 30, height: 12, fontName: 'Arial' },
      { str: '  ', transform: [1, 0, 0, 1, 100, 700], width: 0, height: 12, fontName: 'Arial' },
      { str: '', transform: [1, 0, 0, 1, 150, 700], width: 0, height: 12, fontName: 'Arial' },
    ]])

    const result = await extractPdfText(new ArrayBuffer(10))
    expect(result[0].items).toHaveLength(1)
  })

  it('extracts from multiple pages', async () => {
    mockPdf(2, [
      [{ str: 'Page1', transform: [1, 0, 0, 1, 50, 700], width: 30, height: 12, fontName: 'Arial' }],
      [{ str: 'Page2', transform: [1, 0, 0, 1, 50, 700], width: 30, height: 12, fontName: 'Arial' }],
    ])

    const result = await extractPdfText(new ArrayBuffer(10))
    expect(result).toHaveLength(2)
    expect(result[0].items[0].str).toBe('Page1')
    expect(result[1].items[0].str).toBe('Page2')
  })

  it('passes password to getDocument', async () => {
    mockPdf(1, [[]])
    await extractPdfText(new ArrayBuffer(10), 'secret')
    expect(mockGetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'secret' }),
    )
  })

  it('passes undefined password when not provided', async () => {
    mockPdf(1, [[]])
    await extractPdfText(new ArrayBuffer(10))
    expect(mockGetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ password: undefined }),
    )
  })

  it('passes undefined password for empty string', async () => {
    mockPdf(1, [[]])
    await extractPdfText(new ArrayBuffer(10), '')
    expect(mockGetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ password: undefined }),
    )
  })

  it('handles page with no text items', async () => {
    mockPdf(1, [[]])
    const result = await extractPdfText(new ArrayBuffer(10))
    expect(result[0].items).toHaveLength(0)
  })
})
