import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCalendarEvents, normalizeEvent } from '@/lib/graph'
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { eventsDb, getDb } from '@/lib/db'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'

const GOOGLE_PUBLIC_URL = process.env.GOOGLE_CALENDAR_PUBLIC_URL
const GOOGLE_INTERN_URL = process.env.GOOGLE_CALENDAR_INTERN_URL

type DbRow = { id: string; microsoft_id: string; stable_key: string | null }

const INSERT_SQL = `
  INSERT INTO calendar_events
    (id, microsoft_id, stable_key, title, start_date, end_date, type, is_public, needs_planning, cal_created_at, cal_modified_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!DEV_SKIP_AUTH && !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const force = req.nextUrl.searchParams.get('force') === 'true'

  try {
    const db = getDb()
    let synced = 0
    let deleted = 0
    let rescued = 0

    if (GOOGLE_PUBLIC_URL || GOOGLE_INTERN_URL) {
      const all = [
        ...(GOOGLE_PUBLIC_URL ? await fetchGoogleCalendarEvents(GOOGLE_PUBLIC_URL, false) : []),
        ...(GOOGLE_INTERN_URL ? await fetchGoogleCalendarEvents(GOOGLE_INTERN_URL, true) : []),
      ]

      if (force) {
        await db.run(`DELETE FROM calendar_events WHERE microsoft_id NOT LIKE 'manual-%'`)
        for (const e of all) {
          await db.run(INSERT_SQL, [
            crypto.randomUUID(), e.uid, e.stableKey, e.title, e.startDate, e.endDate,
            e.eventType, e.isPublic ? 1 : 0, e.needsPlanning ? 1 : 0,
            e.calCreatedAt, e.calModifiedAt,
          ])
          synced++
        }
      } else {
        const dbEvents = await db.all<DbRow>(
          `SELECT id, microsoft_id, stable_key FROM calendar_events WHERE microsoft_id NOT LIKE 'manual-%'`,
        )
        const byMicrosoftId = new Map(dbEvents.map(r => [r.microsoft_id, r]))
        const byStableKey = new Map(
          dbEvents.filter(r => r.stable_key).map(r => [r.stable_key as string, r]),
        )
        const matchedIds = new Set<string>()

        for (const e of all) {
          const exact = byMicrosoftId.get(e.uid)
          if (exact) {
            matchedIds.add(exact.id)
            await db.run(
              `UPDATE calendar_events
               SET title=?, start_date=?, end_date=?, stable_key=?, cal_created_at=?, cal_modified_at=?
               WHERE id=?`,
              [e.title, e.startDate, e.endDate, e.stableKey, e.calCreatedAt, e.calModifiedAt, exact.id],
            )
            synced++
            continue
          }

          const byKey = byStableKey.get(e.stableKey)
          if (byKey) {
            // Rescheduled occurrence: keep planning data, update time + identity
            matchedIds.add(byKey.id)
            await db.run(
              `UPDATE calendar_events
               SET microsoft_id=?, stable_key=?, title=?, start_date=?, end_date=?, cal_created_at=?, cal_modified_at=?
               WHERE id=?`,
              [e.uid, e.stableKey, e.title, e.startDate, e.endDate, e.calCreatedAt, e.calModifiedAt, byKey.id],
            )
            rescued++
            synced++
            continue
          }

          // New event
          await db.run(INSERT_SQL, [
            crypto.randomUUID(), e.uid, e.stableKey, e.title, e.startDate, e.endDate,
            e.eventType, e.isPublic ? 1 : 0, e.needsPlanning ? 1 : 0,
            e.calCreatedAt, e.calModifiedAt,
          ])
          synced++
        }

        // Delete unmatched events that have no planning data
        for (const row of dbEvents) {
          if (matchedIds.has(row.id)) continue
          const hasJobs = await db.first(`SELECT id FROM service_jobs WHERE event_id = ? LIMIT 1`, [row.id])
          const hasAgenda = await db.first(`SELECT id FROM agenda_items WHERE event_id = ? LIMIT 1`, [row.id])
          if (!hasJobs && !hasAgenda) {
            await db.run(`DELETE FROM calendar_events WHERE id = ?`, [row.id])
            deleted++
          }
        }
      }
    }

    // Microsoft Graph sync (production only)
    if (!DEV_SKIP_AUTH && session?.accessToken) {
      const graphEvents = await fetchCalendarEvents(session.accessToken, 8)
      for (const event of graphEvents) {
        await eventsDb.upsert(normalizeEvent(event))
        synced++
      }
    }

    return NextResponse.json({ synced, deleted, rescued })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
