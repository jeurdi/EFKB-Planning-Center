import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { appUsersDb } from '@/lib/db'
import type { AppRole } from '@/types'

export async function PUT(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH !== 'true') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await req.json() as { role: AppRole }
  const user = await appUsersDb.getByEmail(session.user.email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await appUsersDb.setRole(user.id, role)
  return NextResponse.json({ ok: true })
}
