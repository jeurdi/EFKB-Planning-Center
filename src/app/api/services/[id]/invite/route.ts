import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eventsDb, jobsDb, invitationsDb } from '@/lib/db'
import { sendEmail } from '@/lib/graph'
import { JOB_ROLE_LABELS, JOB_ROLE_GROUPS } from '@/types'
import type { JobRole, Person, CalendarEvent } from '@/types'

const DEV_SKIP_AUTH = process.env.DEV_SKIP_AUTH === 'true'
const SHARED_MAILBOX = process.env.SHARED_MAILBOX ?? ''
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function roleLabel(role: JobRole): string {
  const group = JOB_ROLE_GROUPS.find((g) => g.roles.includes(role))
  return group ? `${group.label} · ${JOB_ROLE_LABELS[role]}` : JOB_ROLE_LABELS[role]
}

function buildEmailHtml(
  person: Person,
  roles: JobRole[],
  event: CalendarEvent,
  token: string,
): string {
  const date = formatDate(event.startDate)
  const time = formatTime(event.startDate)
  const rolesText = roles.map(roleLabel).join(', ')
  const acceptUrl = `${APP_URL}/api/confirm?token=${token}&response=accepted`
  const declineUrl = `${APP_URL}/api/confirm?token=${token}&response=declined`

  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1d4ed8;">${event.title}</h2>
  <p>Hallo ${person.firstName},</p>
  <p>
    du bist beim <strong>${event.title}</strong> am
    <strong>${date} um ${time} Uhr</strong>
    als <strong>${rolesText}</strong> eingeteilt.
  </p>
  <p>Bitte bestätige deine Teilnahme:</p>

  <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td style="padding-right: 12px;">
        <a href="${acceptUrl}"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          ✓ Ich bin dabei
        </a>
      </td>
      <td>
        <a href="${declineUrl}"
           style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          ✗ Ich bin verhindert
        </a>
      </td>
    </tr>
  </table>

  <p style="color: #6b7280; font-size: 0.9em;">
    Viele Grüße<br>
    EFKB Planungsteam
  </p>
</body>
</html>`
}

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

  // Collect unique persons with their roles
  const personRoles = new Map<string, { person: Person; roles: JobRole[] }>()
  for (const job of jobs) {
    if (!job.person?.email) continue
    const pid = job.person.id!
    if (!personRoles.has(pid)) {
      personRoles.set(pid, { person: job.person as Person, roles: [] })
    }
    personRoles.get(pid)!.roles.push(job.role)
  }

  if (personRoles.size === 0) {
    return NextResponse.json({ error: 'Keine Personen mit E-Mail-Adresse gefunden.' }, { status: 400 })
  }

  // Separate already-invited from new
  const toInvite: Array<{ person: Person; roles: JobRole[] }> = []
  const alreadyInvited: string[] = []

  for (const [personId, entry] of personRoles) {
    const exists = await invitationsDb.isAlreadyInvited(id, personId)
    if (exists) {
      alreadyInvited.push(`${entry.person.firstName} ${entry.person.lastName}`)
    } else {
      toInvite.push(entry)
    }
  }

  // Dev mode: create invitation records (so status is visible) but skip actual email sending
  if (DEV_SKIP_AUTH || !session.accessToken) {
    for (const { person } of toInvite) {
      await invitationsDb.create({ eventId: id, personId: person.id! })
    }
    const preview = toInvite.map(({ person, roles }) => ({
      to: person.email,
      name: `${person.firstName} ${person.lastName}`,
      roles: roles.map(roleLabel),
    }))
    return NextResponse.json({ dev: true, preview, skipped: alreadyInvited, count: preview.length })
  }

  if (!SHARED_MAILBOX) {
    return NextResponse.json({ error: 'SHARED_MAILBOX ist nicht konfiguriert.' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const { person, roles } of toInvite) {
    try {
      // Create invitation record first to get the token
      const invitation = await invitationsDb.create({ eventId: id, personId: person.id! })
      await sendEmail(session.accessToken, {
        sharedMailbox: SHARED_MAILBOX,
        to: person.email!,
        subject: `Diensteinteilung: ${event.title} am ${formatDate(event.startDate)}`,
        bodyHtml: buildEmailHtml(person, roles, event, invitation.token),
      })
      sent++
    } catch (err) {
      failed++
      errors.push(`${person.firstName} ${person.lastName}: ${err instanceof Error ? err.message : 'Fehler'}`)
    }
  }

  return NextResponse.json({ sent, failed, skipped: alreadyInvited, errors })
}
