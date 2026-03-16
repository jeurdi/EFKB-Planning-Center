import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCalendarEvents, normalizeEvent } from '@/lib/graph'
import { eventsDb } from '@/lib/db'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'

// In dev mode (no real Microsoft token), insert placeholder events
async function seedDevEvents() {
  const now = new Date()
  const sundays = [0, 7, 14, 21, 28, 35].map((offset) => {
    const d = new Date(now)
    const daysUntilSunday = (7 - d.getDay()) % 7 || 7
    d.setDate(d.getDate() + daysUntilSunday + offset)
    d.setHours(10, 0, 0, 0)
    return d
  })

  for (const sunday of sundays) {
    const end = new Date(sunday)
    end.setHours(11, 30)
    await eventsDb.upsert({
      microsoftId: `dev-${sunday.toISOString().slice(0, 10)}`,
      title: 'Gottesdienst',
      startDate: sunday.toISOString(),
      endDate: end.toISOString(),
    })
  }
  return sundays.length
}

export async function POST() {
  const session = await auth()

  if (DEV_SKIP_AUTH || !session?.accessToken) {
    if (!DEV_SKIP_AUTH) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const synced = await seedDevEvents()
    return NextResponse.json({ synced, dev: true })
  }

  try {
    const graphEvents = await fetchCalendarEvents(session.accessToken, 8)
    let synced = 0
    for (const event of graphEvents) {
      await eventsDb.upsert(normalizeEvent(event))
      synced++
    }
    return NextResponse.json({ synced })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
