import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb, jobsDb } from '@/lib/db'
import { updateCalendarEventBody } from '@/lib/graph'
import { buildBodyText } from '@/lib/exportBody'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await eventsDb.getUpcoming(200)

  if (DEV_SKIP_AUTH || !session.accessToken) {
    return NextResponse.json({ dev: true, count: events.length })
  }

  let exported = 0
  let skipped = 0
  for (const event of events) {
    const jobs = await jobsDb.getForEvent(event.id)
    try {
      await updateCalendarEventBody(session.accessToken, event.microsoftId, buildBodyText(jobs))
      exported++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ exported, skipped })
}
