import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { personsDb } from '@/lib/db'


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
  const { firstName, lastName, email } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Vor- und Nachname sind erforderlich' }, { status: 400 })
  }

  const person = await personsDb.create({ firstName: firstName.trim(), lastName: lastName.trim(), email: email?.trim() || undefined })
  return NextResponse.json(person, { status: 201 })
}
