/**
 * tokenStore.ts
 * 
 * Abstraction layer for JWT token storage.
 * - On native (Capacitor): uses localStorage (WebView persists it)
 * - Cookies from cross-origin API requests are unreliable in WebView,
 *   so we store the token returned in the response body and send it
 *   as a Bearer token on subsequent requests.
 * 
 * SECURITY NOTE:
 * - localStorage is acceptable for this personal-use MVP.
 * - The token itself is a signed JWT validated server-side per request.
 * - For production SaaS, prefer HttpOnly cookies (requires same-origin or HTTPS proxy).
 */

const TOKEN_KEY = 'forge_token'

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },

  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      console.warn('[tokenStore] Failed to persist token')
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // no-op
    }
  },
}
