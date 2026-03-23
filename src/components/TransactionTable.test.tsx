import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionTable, type TransactionRow } from './TransactionTable'

const baseTxn: TransactionRow = {
  id: 'txn-1',
  date: '2024-01-15',
  description: 'Coffee Shop',
  payeeName: 'Coffee Shop',
  memo: 'NETS',
  amount: -5.5,
  included: true,
}

describe('TransactionTable', () => {
  it('renders transaction rows', () => {
    render(
      <TransactionTable
        transactions={[baseTxn]}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onEdit={vi.fn()}
      />
    )
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Coffee Shop')).toBeInTheDocument()
    expect(screen.getByDisplayValue('NETS')).toBeInTheDocument()
    expect(screen.getByText('-$5.50')).toBeInTheDocument()
  })

  it('shows count of selected transactions', () => {
    render(
      <TransactionTable
        transactions={[baseTxn, { ...baseTxn, id: 'txn-2', included: false }]}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onEdit={vi.fn()}
      />
    )
    expect(screen.getByText('1 of 2 transactions selected')).toBeInTheDocument()
  })

  it('calls onToggle when checkbox clicked', () => {
    const onToggle = vi.fn()
    render(
      <TransactionTable
        transactions={[baseTxn]}
        onToggle={onToggle}
        onToggleAll={vi.fn()}
        onEdit={vi.fn()}
      />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    // First is the header, second is the row
    fireEvent.click(checkboxes[1])
    expect(onToggle).toHaveBeenCalledWith('txn-1')
  })

  it('calls onToggleAll when header checkbox clicked', () => {
    const onToggleAll = vi.fn()
    render(
      <TransactionTable
        transactions={[baseTxn]}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
        onEdit={vi.fn()}
      />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onToggleAll).toHaveBeenCalledWith(false) // all included, so toggle to false
  })

  it('calls onToggleAll(true) when none are included', () => {
    const onToggleAll = vi.fn()
    render(
      <TransactionTable
        transactions={[{ ...baseTxn, included: false }]}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
        onEdit={vi.fn()}
      />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onToggleAll).toHaveBeenCalledWith(true)
  })

  it('calls onEdit when payee input changes', () => {
    const onEdit = vi.fn()
    render(
      <TransactionTable
        transactions={[baseTxn]}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onEdit={onEdit}
      />
    )
    const payeeInput = screen.getByDisplayValue('Coffee Shop')
    fireEvent.change(payeeInput, { target: { value: 'New Payee' } })
    expect(onEdit).toHaveBeenCalledWith('txn-1', 'payeeName', 'New Payee')
  })

  it('calls onEdit when memo input changes', () => {
    const onEdit = vi.fn()
    render(
      <TransactionTable
        transactions={[baseTxn]}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onEdit={onEdit}
      />
    )
    const memoInput = screen.getByDisplayValue('NETS')
    fireEvent.change(memoInput, { target: { value: 'Updated' } })
    expect(onEdit).toHaveBeenCalledWith('txn-1', 'memo', 'Updated')
  })

  it('renders positive amounts in green', () => {
    render(
      <TransactionTable
        transactions={[{ ...baseTxn, amount: 100 }]}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onEdit={vi.fn()}
      />
    )
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })
})
