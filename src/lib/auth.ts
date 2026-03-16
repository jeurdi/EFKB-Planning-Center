// ─── DEV MODE: Auth bypassed ──────────────────────────────────────────────────
// Set DEV_SKIP_AUTH=false and configure Azure credentials to enable real auth.
const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH !== 'false'

import type { Session } from 'next-auth'

// Mock session returned when auth is skipped
const DEV_SESSION: Session = {
  user: { name: 'Dev User', email: 'dev@localhost' },
  accessToken: '',
  expires: '2099-01-01',
}

// Stub `auth()` — always returns the mock session in dev mode
export async function auth(): Promise<Session | null> {
  if (DEV_SKIP_AUTH) return DEV_SESSION

  // Real auth (only used when DEV_SKIP_AUTH=false)
  const { auth: realAuth } = await import('./auth.real')
  return realAuth()
}

// Stub signIn/signOut/handlers for imports that need them
export async function signIn(_provider?: string, _options?: object) {
  if (DEV_SKIP_AUTH) return
  const { signIn: realSignIn } = await import('./auth.real')
  return realSignIn(_provider, _options)
}

export async function signOut(_options?: object) {
  if (DEV_SKIP_AUTH) return
  const { signOut: realSignOut } = await import('./auth.real')
  return realSignOut(_options)
}

export const handlers = {
  GET: async () => new Response('Auth disabled in dev mode', { status: 200 }),
  POST: async () => new Response('Auth disabled in dev mode', { status: 200 }),
}
