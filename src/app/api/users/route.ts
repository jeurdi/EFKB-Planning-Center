import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { appUsersDb } from '@/lib/db'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email) return null
  const user = await appUsersDb.getByEmail(session.user.email)
  return user?.role === 'ADMIN' ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await appUsersDb.getAll())
}
