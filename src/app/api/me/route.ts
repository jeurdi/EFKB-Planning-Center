import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { appUsersDb } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await appUsersDb.findOrCreate(session.user.email, session.user.name ?? null)
  return NextResponse.json({ id: user.id, role: user.role, email: user.email, name: user.name })
}
