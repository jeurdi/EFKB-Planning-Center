import { NextRequest, NextResponse } from 'next/server'
import { invitationsDb } from '@/lib/db'

// Public endpoint — no auth required (linked from email)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const response = req.nextUrl.searchParams.get('response') as 'accepted' | 'declined' | null

  if (!token || !response || !['accepted', 'declined'].includes(response)) {
    return NextResponse.json({ error: 'Ungültiger Link.' }, { status: 400 })
  }

  const invitation = await invitationsDb.getByToken(token)
  if (!invitation) {
    return NextResponse.json({ error: 'Einladung nicht gefunden.' }, { status: 404 })
  }

  await invitationsDb.respond(token, response)

  // Redirect to the confirmation page
  const base = req.nextUrl.origin
  return NextResponse.redirect(`${base}/confirm?response=${response}&name=${encodeURIComponent(invitation.person?.firstName ?? '')}`)
}
