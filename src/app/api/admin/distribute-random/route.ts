import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import type { JobRole } from '@/types'

const ROLES_TO_DISTRIBUTE: JobRole[] = [
  'MODERATION', 'PREDIGT', 'KINDERGESCHICHTE', 'GESANG_LEITER', 'TECHNIK_LEITER',
]

function isGottesdienst(startDate: string): boolean {
  const d = new Date(startDate)
  return (d.getDay() === 0 && d.getHours() === 10) || (d.getDay() === 5 && d.getHours() === 18)
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const now = new Date().toISOString()
  const ahead = new Date()
  ahead.setMonth(ahead.getMonth() + 3)

  const events = await db.all<{ id: string; start_date: string }>(
    'SELECT id, start_date FROM calendar_events WHERE start_date >= ? AND start_date < ? ORDER BY start_date',
    [now, ahead.toISOString()],
  )

  const eligible = events.filter((e) => isGottesdienst(e.start_date))
  if (eligible.length === 0) return NextResponse.json({ assigned: 0, events: 0 })

  const ids = eligible.map((e) => e.id)
  const placeholders = ids.map(() => '?').join(',')

  const existingJobs = await db.all<{ event_id: string; role: string }>(
    `SELECT event_id, role FROM service_jobs WHERE event_id IN (${placeholders})`,
    ids,
  )
  const filled = new Set(existingJobs.map((j) => `${j.event_id}|${j.role}`))

  const personRoles = await db.all<{ person_id: string; role: string }>(
    'SELECT person_id, role FROM person_roles',
  )
  const personsByRole = new Map<string, string[]>()
  for (const pr of personRoles) {
    const arr = personsByRole.get(pr.role) ?? []
    arr.push(pr.person_id)
    personsByRole.set(pr.role, arr)
  }

  let assignedCount = 0
  const statements: Array<{ sql: string; params: unknown[] }> = []

  for (const event of eligible) {
    for (const role of ROLES_TO_DISTRIBUTE) {
      if (filled.has(`${event.id}|${role}`)) continue
      const candidates = personsByRole.get(role) ?? []
      if (candidates.length === 0) continue
      const personId = candidates[Math.floor(Math.random() * candidates.length)]
      statements.push({
        sql: 'INSERT INTO service_jobs (id, event_id, role, person_id) VALUES (?, ?, ?, ?)',
        params: [crypto.randomUUID(), event.id, role, personId],
      })
      assignedCount++
    }
  }

  if (statements.length > 0) await db.batch(statements)

  return NextResponse.json({ assigned: assignedCount, events: eligible.length })
}
