import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { YnabConnect } from './YnabConnect'

// Mock the oauth module
vi.mock('../ynab/oauth', () => ({
  startOAuthFlow: vi.fn(),
  isOAuthConfigured: vi.fn(() => true),
}))

import { startOAuthFlow, isOAuthConfigured } from '../ynab/oauth'

describe('YnabConnect', () => {
  it('shows connect button when not connected', () => {
    render(<YnabConnect token={null} onDisconnect={vi.fn()} />)
    expect(screen.getByText('Connect to YNAB')).toBeInTheDocument()
  })

  it('calls startOAuthFlow on connect click', () => {
    render(<YnabConnect token={null} onDisconnect={vi.fn()} />)
    fireEvent.click(screen.getByText('Connect to YNAB'))
    expect(startOAuthFlow).toHaveBeenCalled()
  })

  it('shows connected status with disconnect button', () => {
    render(<YnabConnect token="tok-123" onDisconnect={vi.fn()} />)
    expect(screen.getByText('Connected to YNAB')).toBeInTheDocument()
    expect(screen.getByText('Disconnect')).toBeInTheDocument()
  })

  it('calls onDisconnect when disconnect clicked', () => {
    const onDisconnect = vi.fn()
    render(<YnabConnect token="tok-123" onDisconnect={onDisconnect} />)
    fireEvent.click(screen.getByText('Disconnect'))
    expect(onDisconnect).toHaveBeenCalled()
  })

  it('shows configuration warning when not configured', () => {
    vi.mocked(isOAuthConfigured).mockReturnValueOnce(false)
    render(<YnabConnect token={null} onDisconnect={vi.fn()} />)
    expect(screen.getByText('YNAB not configured')).toBeInTheDocument()
    expect(screen.getByText(/VITE_YNAB_CLIENT_ID/)).toBeInTheDocument()
  })
})
