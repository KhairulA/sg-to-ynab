import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportResult } from './ImportResult'

describe('ImportResult', () => {
  it('shows success with created count', () => {
    render(<ImportResult created={5} duplicates={0} errors={[]} onDone={vi.fn()} />)
    expect(screen.getByText('Import Complete')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/transactions created/)).toBeInTheDocument()
  })

  it('shows duplicates count', () => {
    render(<ImportResult created={3} duplicates={2} errors={[]} onDone={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/duplicates skipped/)).toBeInTheDocument()
  })

  it('shows errors', () => {
    render(<ImportResult created={0} duplicates={0} errors={['Account: Rate limit']} onDone={vi.fn()} />)
    expect(screen.getByText(/1 error/)).toBeInTheDocument()
    expect(screen.getByText('Account: Rate limit')).toBeInTheDocument()
  })

  it('calls onDone when button clicked', () => {
    const onDone = vi.fn()
    render(<ImportResult created={5} duplicates={0} errors={[]} onDone={onDone} />)
    fireEvent.click(screen.getByText('Import Another Statement'))
    expect(onDone).toHaveBeenCalled()
  })

  it('does not show created section when count is 0', () => {
    render(<ImportResult created={0} duplicates={1} errors={[]} onDone={vi.fn()} />)
    expect(screen.queryByText(/transactions created/)).not.toBeInTheDocument()
  })

  it('does not show duplicates section when count is 0', () => {
    render(<ImportResult created={1} duplicates={0} errors={[]} onDone={vi.fn()} />)
    expect(screen.queryByText(/duplicates skipped/)).not.toBeInTheDocument()
  })
})
