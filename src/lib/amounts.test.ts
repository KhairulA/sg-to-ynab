import { describe, it, expect } from 'vitest'
import { parseCurrencyAmount, toMilliunits, formatSGD } from './amounts'

describe('parseCurrencyAmount', () => {
  it('parses a simple number', () => {
    expect(parseCurrencyAmount('1234.56')).toBe(1234.56)
  })

  it('parses a number with commas', () => {
    expect(parseCurrencyAmount('1,234.56')).toBe(1234.56)
  })

  it('parses a number with dollar sign', () => {
    expect(parseCurrencyAmount('$1,234.56')).toBe(1234.56)
  })

  it('parses a number with spaces', () => {
    expect(parseCurrencyAmount(' 1 234.56 ')).toBe(1234.56)
  })

  it('returns NaN for empty string', () => {
    expect(parseCurrencyAmount('')).toBeNaN()
  })

  it('returns NaN for non-numeric string', () => {
    expect(parseCurrencyAmount('abc')).toBeNaN()
  })

  it('parses zero', () => {
    expect(parseCurrencyAmount('0.00')).toBe(0)
  })
})

describe('toMilliunits', () => {
  it('converts positive amount', () => {
    expect(toMilliunits(12.5)).toBe(12500)
  })

  it('converts negative amount', () => {
    expect(toMilliunits(-12.5)).toBe(-12500)
  })

  it('rounds fractional milliunits', () => {
    expect(toMilliunits(12.5555)).toBe(12556)
  })

  it('converts zero', () => {
    expect(toMilliunits(0)).toBe(0)
  })
})

describe('formatSGD', () => {
  it('formats positive amount', () => {
    expect(formatSGD(1234.5)).toBe('$1,234.50')
  })

  it('formats negative amount', () => {
    expect(formatSGD(-1234.5)).toBe('-$1,234.50')
  })

  it('formats zero', () => {
    expect(formatSGD(0)).toBe('$0.00')
  })

  it('formats large number with commas', () => {
    expect(formatSGD(1000000)).toBe('$1,000,000.00')
  })
})
