import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCalendarEvents, normalizeEvent } from '@/lib/graph'
import { eventsDb, getDb } from '@/lib/db'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'

export async function POST() {
  const session = await auth()

  if (DEV_SKIP_AUTH || !session?.accessToken) {
    if (!DEV_SKIP_AUTH) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Clean up old-format dev entries (microsoftId = "dev-YYYY-MM-DD", length 14)
    getDb().run(`DELETE FROM calendar_events WHERE microsoft_id LIKE 'dev-%' AND length(microsoft_id) = 14`)
    return NextResponse.json({ synced: 0, dev: true })
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
