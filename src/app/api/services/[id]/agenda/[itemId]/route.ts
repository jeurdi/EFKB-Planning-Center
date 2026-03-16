import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { agendaDb } from '@/lib/db'
import type { AgendaTag } from '@/types'


// PUT — update an agenda item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await params
  const body = await req.json()
  const { title, tag, personId, duration, notes } = body as {
    title?: string
    tag?: AgendaTag | null
    personId?: string | null
    duration?: number | null
    notes?: string | null
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
  }

  const item = await agendaDb.update(itemId, {
    title: title.trim(),
    tag: tag ?? null,
    personId: personId ?? null,
    duration: duration ?? null,
    notes: notes ?? null,
  })

  if (!item) return NextResponse.json({ error: 'Item nicht gefunden' }, { status: 404 })
  return NextResponse.json(item)
}

// DELETE — remove an agenda item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await params
  await agendaDb.delete(itemId)
  return new NextResponse(null, { status: 204 })
}
