import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { appUsersDb } from '@/lib/db'
import type { AppRole } from '@/types'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email) return null
  const user = await appUsersDb.getByEmail(session.user.email)
  return user?.role === 'ADMIN' ? user : null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { role } = await req.json() as { role: AppRole }
  await appUsersDb.setRole(id, role)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  // Prevent deleting yourself
  const all = await appUsersDb.getAll()
  const target = all.find((u) => u.id === id)
  if (target?.email === admin.email) return NextResponse.json({ error: 'Eigenen Account nicht löschbar' }, { status: 400 })

  await appUsersDb.delete(id)
  return NextResponse.json({ ok: true })
}
