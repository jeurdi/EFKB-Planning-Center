import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
// getDb is used directly for a cross-table query not covered by the domain helpers
import type { JobRole } from '@/types'

type Row = {
  id: string; microsoft_id: string; title: string; start_date: string; end_date: string
  role: JobRole
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = session.user?.email
  if (!email) return NextResponse.json([])

  const db = getDb()
  const rows = db.all<Row>(
    `SELECT ce.id, ce.microsoft_id, ce.title, ce.start_date, ce.end_date, sj.role
     FROM calendar_events ce
     JOIN service_jobs sj ON sj.event_id = ce.id
     JOIN persons p ON p.id = sj.person_id
     WHERE p.email = ? AND ce.start_date >= ?
     ORDER BY ce.start_date`,
    [email, new Date().toISOString()],
  )

  // Group roles by event
  const map = new Map<string, { id: string; title: string; startDate: string; endDate: string; roles: JobRole[] }>()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, { id: row.id, title: row.title, startDate: row.start_date, endDate: row.end_date, roles: [] })
    }
    map.get(row.id)!.roles.push(row.role)
  }

  return NextResponse.json(Array.from(map.values()))
}
