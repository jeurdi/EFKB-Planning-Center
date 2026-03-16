import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { personsDb } from '@/lib/db'


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { firstName, lastName, email } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Vor- und Nachname sind erforderlich' }, { status: 400 })
  }

  const person = await personsDb.update(id, {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email?.trim() || null,
  })

  if (!person) return NextResponse.json({ error: 'Person nicht gefunden' }, { status: 404 })
  return NextResponse.json(person)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await personsDb.delete(id)
  return new NextResponse(null, { status: 204 })
}
