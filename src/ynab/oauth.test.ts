import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to test with dynamic env var, so we reimport per test
describe('oauth', () => {
  let originalLocation: Location
  let originalHistory: History

  beforeEach(() => {
    originalLocation = window.location
    originalHistory = window.history

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        href: 'http://localhost:3000/sg-to-ynab/',
        hash: '',
        origin: 'http://localhost:3000',
        pathname: '/sg-to-ynab/',
        search: '',
      },
    })

    Object.defineProperty(window, 'history', {
      writable: true,
      value: {
        replaceState: vi.fn(),
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
    Object.defineProperty(window, 'history', { writable: true, value: originalHistory })
    vi.resetModules()
  })

  describe('extractTokenFromHash', () => {
    it('returns null when no hash', async () => {
      const { extractTokenFromHash } = await import('./oauth')
      expect(extractTokenFromHash()).toBeNull()
    })

    it('returns null when hash has no access_token', async () => {
      window.location.hash = '#foo=bar'
      const { extractTokenFromHash } = await import('./oauth')
      expect(extractTokenFromHash()).toBeNull()
    })

    it('extracts token from hash', async () => {
      window.location.hash = '#access_token=my-token&expires_in=3600'
      const { extractTokenFromHash } = await import('./oauth')
      const result = extractTokenFromHash()
      expect(result).toEqual({ accessToken: 'my-token', expiresIn: 3600 })
      expect(window.history.replaceState).toHaveBeenCalled()
    })

    it('defaults expires_in to 7200', async () => {
      window.location.hash = '#access_token=tok'
      const { extractTokenFromHash } = await import('./oauth')
      const result = extractTokenFromHash()
      expect(result!.expiresIn).toBe(7200)
    })
  })

  describe('startOAuthFlow', () => {
    it('redirects to YNAB authorize URL', async () => {
      const { startOAuthFlow } = await import('./oauth')
      startOAuthFlow()
      expect(window.location.href).toContain('https://app.ynab.com/oauth/authorize')
      expect(window.location.href).toContain('response_type=token')
    })
  })

  describe('isOAuthConfigured', () => {
    it('returns false when no client ID', async () => {
      const { isOAuthConfigured } = await import('./oauth')
      expect(isOAuthConfigured()).toBe(false)
    })
  })
})
