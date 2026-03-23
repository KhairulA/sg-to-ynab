// YNAB OAuth Implicit Grant flow

// The client ID is public — safe for Implicit Grant (no secret)
const CLIENT_ID = import.meta.env.VITE_YNAB_CLIENT_ID || ''
const REDIRECT_URI = import.meta.env.VITE_YNAB_REDIRECT_URI ||
  (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '')

const AUTHORIZE_URL = 'https://app.ynab.com/oauth/authorize'

/**
 * Redirect user to YNAB authorization page.
 */
export function startOAuthFlow(): void {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
  })
  window.location.href = `${AUTHORIZE_URL}?${params.toString()}`
}

/**
 * Extract access token from URL hash after OAuth redirect.
 * Returns the token and expiry, or null if not present.
 */
export function extractTokenFromHash(): { accessToken: string; expiresIn: number } | null {
  const hash = window.location.hash
  if (!hash || !hash.includes('access_token')) return null

  const params = new URLSearchParams(hash.substring(1))
  const accessToken = params.get('access_token')
  const expiresIn = parseInt(params.get('expires_in') || '7200', 10)

  if (!accessToken) return null

  // Clean the hash from URL without triggering navigation
  window.history.replaceState(null, '', window.location.pathname + window.location.search)

  return { accessToken, expiresIn }
}

/**
 * Check if a YNAB client ID is configured.
 */
export function isOAuthConfigured(): boolean {
  return CLIENT_ID.length > 0
}
