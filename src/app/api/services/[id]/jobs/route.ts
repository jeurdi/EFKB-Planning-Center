import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { jobsDb } from '@/lib/db'
import type { JobRole } from '@/types'
import { JOB_ROLES, MULTI_PERSON_ROLES } from '@/types'


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const jobs = await jobsDb.getForEvent(id)
  return NextResponse.json(jobs)
}

// PUT /api/services/[id]/jobs
// Single:  { role: JobRole, personId: string | null }
// Multi:   { role: JobRole, personIds: string[] }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: eventId } = await params
  const body = await req.json() as { role: JobRole; personId?: string | null; personIds?: string[] }
  const { role } = body

  if (!JOB_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 })
  }

  if (MULTI_PERSON_ROLES.includes(role)) {
    const personIds = (body.personIds ?? []).filter(Boolean) as string[]
    await jobsDb.setMultiple({ eventId, role, personIds })
  } else {
    await jobsDb.upsert({ eventId, role, personId: body.personId ?? null })
  }

  const jobs = await jobsDb.getForEvent(eventId)
  return NextResponse.json(jobs)
}
