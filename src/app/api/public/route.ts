import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type PublicEventRow = {
  id: string
  title: string
  start_date: string
  end_date: string
  first_name: string
  last_name: string
}

export async function GET() {
  const db = getDb()
  const now = new Date()
  const ahead = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate())

  const rows = await db.all<PublicEventRow>(`
    SELECT ce.id, ce.title, ce.start_date, ce.end_date,
           p.first_name, p.last_name
    FROM calendar_events ce
    JOIN service_jobs sj ON sj.event_id = ce.id AND sj.role = 'MODERATION'
    JOIN persons p ON p.id = sj.person_id
    WHERE ce.is_public = 1
      AND ce.start_date >= ?
      AND ce.start_date < ?
    ORDER BY ce.start_date
  `, [now.toISOString(), ahead.toISOString()])

  return NextResponse.json(rows.map((r) => ({
    id: r.id,
    title: r.title,
    startDate: r.start_date,
    endDate: r.end_date,
    moderator: `${r.first_name} ${r.last_name}`,
  })))
}
