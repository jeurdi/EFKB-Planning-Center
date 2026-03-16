import { NextResponse } from 'next/server'
import { eventsDb } from '@/lib/db'
import type { JobRole } from '@/types'

const SCHEDULE_ROLES: JobRole[] = [
  'PREDIGT', 'MODERATION', 'KINDERGESCHICHTE',
  'GESANG_LEITER', 'GESANG_MITARBEITER',
  'TECHNIK_LEITER', 'TECHNIK_MITARBEITER',
]

export async function GET() {
  const events = await eventsDb.getAllWithJobs(SCHEDULE_ROLES)
  return NextResponse.json(events)
}
