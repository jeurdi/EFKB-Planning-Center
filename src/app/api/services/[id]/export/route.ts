import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb, jobsDb } from '@/lib/db'
import { updateCalendarEventBody } from '@/lib/graph'
import { buildBodyText } from '@/lib/exportBody'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const event = await eventsDb.getById(id)
  if (!event) return NextResponse.json({ error: 'Service nicht gefunden' }, { status: 404 })

  const jobs = await jobsDb.getForEvent(id)
  const bodyText = buildBodyText(jobs)

  if (DEV_SKIP_AUTH || !session.accessToken) {
    return NextResponse.json({ dev: true, preview: bodyText })
  }

  try {
    await updateCalendarEventBody(session.accessToken, event.microsoftId, bodyText)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export fehlgeschlagen' },
      { status: 500 },
    )
  }
}
