import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { personsDb, personRolesDb } from '@/lib/db'
import type { JobRole } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const persons = await personsDb.getAll()
  return NextResponse.json(persons)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { firstName, lastName, email, roles } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Vor- und Nachname sind erforderlich' }, { status: 400 })
  }

  const person = await personsDb.create({ firstName: firstName.trim(), lastName: lastName.trim(), email: email?.trim() || undefined })
  if (Array.isArray(roles) && roles.length > 0) {
    await personRolesDb.setForPerson(person.id, roles as JobRole[])
  }
  return NextResponse.json(await personsDb.getById(person.id), { status: 201 })
}
