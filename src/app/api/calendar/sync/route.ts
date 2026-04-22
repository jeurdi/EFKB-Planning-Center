import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCalendarEvents, normalizeEvent } from '@/lib/graph'
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { eventsDb, getDb } from '@/lib/db'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'

const GOOGLE_PUBLIC_URL = process.env.GOOGLE_CALENDAR_PUBLIC_URL
const GOOGLE_INTERN_URL = process.env.GOOGLE_CALENDAR_INTERN_URL

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!DEV_SKIP_AUTH && !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const force = req.nextUrl.searchParams.get('force') === 'true'

  try {
    let synced = 0

    // Google Calendar sync
    if (GOOGLE_PUBLIC_URL || GOOGLE_INTERN_URL) {
      if (force) {
        // Remove all non-manual events so stale entries are cleaned up
        await getDb().run(`DELETE FROM calendar_events WHERE microsoft_id NOT LIKE 'manual-%'`)
      }

      const all: Awaited<ReturnType<typeof fetchGoogleCalendarEvents>> = []
      if (GOOGLE_PUBLIC_URL) all.push(...await fetchGoogleCalendarEvents(GOOGLE_PUBLIC_URL, false))
      if (GOOGLE_INTERN_URL) all.push(...await fetchGoogleCalendarEvents(GOOGLE_INTERN_URL, true))

      for (const e of all) {
        await eventsDb.upsert({
          microsoftId: e.uid,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          eventType: e.eventType,
          isPublic: e.isPublic,
          needsPlanning: e.needsPlanning,
        })
        synced++
      }
    }

    // Microsoft Graph sync (production only, when access token available)
    if (!DEV_SKIP_AUTH && session?.accessToken) {
      const graphEvents = await fetchCalendarEvents(session.accessToken, 8)
      for (const event of graphEvents) {
        await eventsDb.upsert(normalizeEvent(event))
        synced++
      }
    }

    return NextResponse.json({ synced })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
