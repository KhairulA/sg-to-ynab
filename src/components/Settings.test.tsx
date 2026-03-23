import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Settings } from './Settings'
import { saveMappings, addHistoryRecord } from '../lib/config'

describe('Settings', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Settings isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders panel when open', () => {
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows empty mappings message', () => {
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('No mappings saved yet.')).toBeInTheDocument()
  })

  it('shows empty history message', () => {
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('No imports yet.')).toBeInTheDocument()
  })

  it('shows saved mappings', () => {
    saveMappings([{
      bankId: 'dbs',
      accountNumber: '123-456',
      accountLabel: 'POSB Savings 123-456',
      ynabAccountId: 'y1',
      ynabAccountName: 'My Checking',
    }])
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('POSB Savings 123-456')).toBeInTheDocument()
    expect(screen.getByText(/My Checking/)).toBeInTheDocument()
  })

  it('shows import history', () => {
    addHistoryRecord({
      timestamp: Date.now(),
      fileName: 'statement.pdf',
      bankId: 'dbs',
      transactionsCreated: 10,
      transactionsSkipped: 2,
      errors: 1,
    })
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('statement.pdf')).toBeInTheDocument()
    expect(screen.getByText(/10 created, 2 skipped/)).toBeInTheDocument()
    expect(screen.getByText(/1 errors/)).toBeInTheDocument()
  })

  it('shows history without errors when errors=0', () => {
    addHistoryRecord({
      timestamp: Date.now(),
      fileName: 'clean.pdf',
      bankId: 'uob',
      transactionsCreated: 5,
      transactionsSkipped: 0,
      errors: 0,
    })
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('clean.pdf')).toBeInTheDocument()
    expect(screen.getByText(/5 created, 0 skipped/)).toBeInTheDocument()
  })

  it('shows privacy section with link', () => {
    render(<Settings isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Privacy')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<Settings isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('\u00D7'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    render(<Settings isOpen={true} onClose={onClose} />)
    // Backdrop is the div with bg-black/30
    const backdrop = document.querySelector('.bg-black\\/30')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
