import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountMapper } from './AccountMapper'
import type { YnabAccount } from '../ynab/types'

const accounts: YnabAccount[] = [
  { id: 'a1', name: 'Checking', type: 'checking', on_budget: true, closed: false, balance: 100000 },
  { id: 'a2', name: 'Savings', type: 'savings', on_budget: true, closed: false, balance: 500000 },
]

describe('AccountMapper', () => {
  it('renders account label', () => {
    render(
      <AccountMapper
        accountLabel="POSB Savings 123-456"
        accountNumber="123-456"
        ynabAccounts={accounts}
        selectedAccountId={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('POSB Savings 123-456')).toBeInTheDocument()
  })

  it('renders YNAB account options', () => {
    render(
      <AccountMapper
        accountLabel="POSB"
        accountNumber="123"
        ynabAccounts={accounts}
        selectedAccountId={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Select YNAB account...')).toBeInTheDocument()
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('Savings')).toBeInTheDocument()
  })

  it('calls onSelect when account chosen', () => {
    const onSelect = vi.fn()
    render(
      <AccountMapper
        accountLabel="POSB"
        accountNumber="123"
        ynabAccounts={accounts}
        selectedAccountId={null}
        onSelect={onSelect}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a1' } })
    expect(onSelect).toHaveBeenCalledWith('a1')
  })

  it('shows selected account', () => {
    render(
      <AccountMapper
        accountLabel="POSB"
        accountNumber="123"
        ynabAccounts={accounts}
        selectedAccountId="a2"
        onSelect={vi.fn()}
      />
    )
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('a2')
  })

  it('has yellow highlight when unmapped', () => {
    const { container } = render(
      <AccountMapper
        accountLabel="POSB"
        accountNumber="123"
        ynabAccounts={accounts}
        selectedAccountId={null}
        onSelect={vi.fn()}
      />
    )
    expect(container.querySelector('.bg-yellow-50')).toBeTruthy()
  })

  it('has gray background when mapped', () => {
    const { container } = render(
      <AccountMapper
        accountLabel="POSB"
        accountNumber="123"
        ynabAccounts={accounts}
        selectedAccountId="a1"
        onSelect={vi.fn()}
      />
    )
    expect(container.querySelector('.bg-gray-50')).toBeTruthy()
  })
})
