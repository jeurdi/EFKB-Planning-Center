import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb } from '@/lib/db'


export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await eventsDb.getUpcoming(30)
  return NextResponse.json(events)
}
