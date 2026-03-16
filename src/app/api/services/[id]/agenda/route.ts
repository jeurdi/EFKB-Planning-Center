import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { agendaDb } from '@/lib/db'
import type { AgendaTag } from '@/types'


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const items = await agendaDb.getForEvent(id)
  return NextResponse.json(items)
}

// POST — create a new agenda item
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: eventId } = await params
  const body = await req.json()
  const { title, tag, personId, duration, notes } = body as {
    title: string
    tag?: AgendaTag | null
    personId?: string | null
    duration?: number | null
    notes?: string | null
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
  }

  // Append at the end
  const existing = await agendaDb.getForEvent(eventId)
  const order = existing.length

  const item = await agendaDb.create({
    eventId,
    order,
    title: title.trim(),
    tag: tag ?? null,
    personId: personId ?? null,
    duration: duration ?? null,
    notes: notes ?? null,
  })

  return NextResponse.json(item, { status: 201 })
}

// PATCH — reorder items  Body: { orderedIds: string[] }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: eventId } = await params
  const body = await req.json()
  const { orderedIds } = body as { orderedIds: string[] }

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: 'orderedIds muss ein Array sein' }, { status: 400 })
  }

  await agendaDb.reorder(eventId, orderedIds)
  const items = await agendaDb.getForEvent(eventId)
  return NextResponse.json(items)
}
