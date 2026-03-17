import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { templatesDb } from '@/lib/db'
import type { AgendaTag } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const template = await templatesDb.getById(id)
  if (!template) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() as {
    name: string
    items: Array<{ title: string; tag?: AgendaTag | null; duration?: number | null }>
  }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })
  const template = await templatesDb.update(id, { name: body.name.trim(), items: body.items ?? [] })
  if (!template) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(template)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await templatesDb.delete(id)
  return NextResponse.json({ ok: true })
}
