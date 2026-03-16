import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb } from '@/lib/db'
import type { JobRole } from '@/types'

const SCHEDULE_ROLES: JobRole[] = [
  'PREDIGT', 'MODERATION', 'KINDERGESCHICHTE',
  'GESANG_LEITER', 'GESANG_MITARBEITER',
  'TECHNIK_LEITER', 'TECHNIK_MITARBEITER',
]

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await eventsDb.getAllWithJobs(SCHEDULE_ROLES)
  return NextResponse.json(events)
}
