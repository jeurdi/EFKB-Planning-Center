import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb } from '@/lib/db'
import { EVENT_TYPE_DEFAULTS } from '@/types'
import type { EventType } from '@/types'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = req.nextUrl.searchParams.get('all') === 'true'
  const events = all ? await eventsDb.getAll() : await eventsDb.getUpcoming(30)
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, date, startTime, endTime, eventType } = await req.json() as {
    title: string; date: string; startTime: string; endTime: string; eventType?: EventType
  }

  if (!title || !date || !startTime || !endTime) {
    return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 })
  }

  const type: EventType = eventType ?? 'SONSTIGE'
  const defaults = EVENT_TYPE_DEFAULTS[type]

  const startDate = new Date(`${date}T${startTime}:00`).toISOString()
  const endDate = new Date(`${date}T${endTime}:00`).toISOString()

  await eventsDb.upsert({
    microsoftId: `manual-${crypto.randomUUID()}`,
    title,
    startDate,
    endDate,
    eventType: type,
    isPublic: defaults.isPublic,
    needsPlanning: defaults.needsPlanning,
  })

  const created = (await eventsDb.getAll()).find((e) => e.startDate === startDate && e.title === title)
  return NextResponse.json(created, { status: 201 })
}
