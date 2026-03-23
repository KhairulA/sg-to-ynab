import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordPrompt } from './PasswordPrompt'

describe('PasswordPrompt', () => {
  it('renders file name', () => {
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={false} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
    expect(screen.getByText('Password Required')).toBeInTheDocument()
  })

  it('shows incorrect password message when isIncorrect=true', () => {
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={true} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument()
  })

  it('does not show incorrect message when isIncorrect=false', () => {
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={false} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Incorrect password. Please try again.')).not.toBeInTheDocument()
  })

  it('calls onSubmit with password on form submit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={false} onSubmit={onSubmit} onCancel={vi.fn()} />)
    const input = screen.getByPlaceholderText('Enter password')
    await user.type(input, 'secret123')
    fireEvent.submit(input.closest('form')!)
    expect(onSubmit).toHaveBeenCalledWith('secret123')
  })

  it('does not call onSubmit when password is empty', () => {
    const onSubmit = vi.fn()
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={false} onSubmit={onSubmit} onCancel={vi.fn()} />)
    const form = screen.getByPlaceholderText('Enter password').closest('form')!
    fireEvent.submit(form)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={false} onSubmit={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('disables Unlock button when password is empty', () => {
    render(<PasswordPrompt fileName="test.pdf" isIncorrect={false} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Unlock')).toBeDisabled()
  })
})
