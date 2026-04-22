import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb, jobsDb, agendaDb } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { title?: string; startDate?: string; endDate?: string; isPublic?: boolean; needsPlanning?: boolean; vermeldungen?: string | null; thema?: string | null; gebetsanliegen?: string | null; isBold?: boolean; isItalic?: boolean }
  const updated = await eventsDb.update(id, body)
  if (!updated) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await eventsDb.delete(id)
  return new NextResponse(null, { status: 204 })
}


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const event = await eventsDb.getById(id)
  if (!event) return NextResponse.json({ error: 'Service nicht gefunden' }, { status: 404 })

  const [jobs, agendaItems] = await Promise.all([
    jobsDb.getForEvent(id),
    agendaDb.getForEvent(id),
  ])

  return NextResponse.json({ ...event, jobs, agendaItems })
}
