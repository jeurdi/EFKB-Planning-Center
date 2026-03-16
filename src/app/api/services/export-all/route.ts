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
  let exported = 0
  let skipped = 0
  const previews: string[] = []

  for (const event of events) {
    const jobs = await jobsDb.getForEvent(event.id)
    const bodyText = buildBodyText(jobs)

    if (DEV_SKIP_AUTH || !session.accessToken) {
      previews.push(`[${event.title} ${event.startDate.slice(0, 10)}]\n${bodyText}`)
      exported++
      continue
    }

    try {
      await updateCalendarEventBody(session.accessToken, event.microsoftId, bodyText)
      exported++
    } catch {
      skipped++
    }
  }

  if (DEV_SKIP_AUTH) {
    return NextResponse.json({ dev: true, exported, preview: previews.slice(0, 3).join('\n\n---\n\n') + (previews.length > 3 ? `\n\n… +${previews.length - 3} weitere` : '') })
  }

  return NextResponse.json({ exported, skipped })
}
