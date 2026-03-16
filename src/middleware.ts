// Auth is disabled for local testing — all routes are accessible without login.
// To re-enable, replace this file with:
//   export { auth as middleware } from '@/lib/auth'
//   export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|login).*)'] }

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
