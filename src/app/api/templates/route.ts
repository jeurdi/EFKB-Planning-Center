import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { templatesDb } from '@/lib/db'
import type { AgendaTag } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const templates = await templatesDb.getAll()
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as {
    name: string
    items: Array<{ title: string; tag?: AgendaTag | null; duration?: number | null }>
  }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })
  const template = await templatesDb.create({ name: body.name.trim(), items: body.items ?? [] })
  return NextResponse.json(template, { status: 201 })
}
