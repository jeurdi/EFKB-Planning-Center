/**
 * DEV-ONLY seed endpoint.
 * POST /api/dev/seed
 * Creates all persons, generates Friday + Sunday services until 31.12.2026,
 * and distributes role assignments in round-robin.
 */

import { NextResponse } from 'next/server'
import { personsDb, eventsDb, jobsDb } from '@/lib/db'
import type { JobRole } from '@/types'

if (process.env.DEV_SKIP_AUTH !== 'true') {
  // This file should never be deployed — guard at module level
}

// ─── Persons ──────────────────────────────────────────────────────────────────

const SEED_PERSONS = [
  // Prediger
  { firstName: 'Thomas',    lastName: 'Müller',      email: 'thomas.mueller@gemeinde.de' },
  { firstName: 'Michael',   lastName: 'Bauer',       email: 'michael.bauer@gemeinde.de' },
  { firstName: 'Andreas',   lastName: 'Wagner',      email: 'andreas.wagner@gemeinde.de' },
  { firstName: 'Stefan',    lastName: 'Klein',       email: 'stefan.klein@gemeinde.de' },
  { firstName: 'Johannes',  lastName: 'Hoffmann',    email: 'johannes.hoffmann@gemeinde.de' },
  // Moderation
  { firstName: 'Sarah',     lastName: 'Fischer',     email: 'sarah.fischer@gemeinde.de' },
  { firstName: 'Maria',     lastName: 'Schneider',   email: 'maria.schneider@gemeinde.de' },
  { firstName: 'Laura',     lastName: 'Braun',       email: 'laura.braun@gemeinde.de' },
  { firstName: 'Klaus',     lastName: 'Zimmermann',  email: 'klaus.zimmermann@gemeinde.de' },
  // Kindergeschichte
  { firstName: 'Eva',       lastName: 'Richter',     email: 'eva.richter@gemeinde.de' },
  { firstName: 'Sabine',    lastName: 'Koch',        email: 'sabine.koch@gemeinde.de' },
  { firstName: 'Hannah',    lastName: 'Meyer',       email: 'hannah.meyer@gemeinde.de' },
  // Gesang Leiter
  { firstName: 'Christian', lastName: 'Wolf',        email: 'christian.wolf@gemeinde.de' },
  { firstName: 'Daniel',    lastName: 'Huber',       email: 'daniel.huber@gemeinde.de' },
  // Gesang Mitarbeiter
  { firstName: 'Julia',     lastName: 'Kramer',      email: 'julia.kramer@gemeinde.de' },
  { firstName: 'Martin',    lastName: 'Lange',       email: 'martin.lange@gemeinde.de' },
  // Technik
  { firstName: 'Markus',    lastName: 'Schäfer',     email: 'markus.schaefer@gemeinde.de' },
  { firstName: 'Felix',     lastName: 'Becker',      email: 'felix.becker@gemeinde.de' },
]

// ─── Date generation ──────────────────────────────────────────────────────────

function generateServiceDates(): Array<{ date: Date; type: 'friday' | 'sunday' }> {
  const dates: Array<{ date: Date; type: 'friday' | 'sunday' }> = []
  const end = new Date('2026-12-31T23:59:59Z')

  // Start from today
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= end) {
    const dow = cursor.getDay() // 0=Sun, 5=Fri
    if (dow === 5) {
      const d = new Date(cursor)
      d.setHours(18, 0, 0, 0)
      dates.push({ date: d, type: 'friday' })
    } else if (dow === 0) {
      const d = new Date(cursor)
      d.setHours(10, 0, 0, 0)
      dates.push({ date: d, type: 'sunday' })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

// ─── Main seed ────────────────────────────────────────────────────────────────

export async function POST() {
  if (process.env.DEV_SKIP_AUTH !== 'true') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  // 1. Create persons (skip duplicates by email)
  const existingPersons = await personsDb.getAll()
  const existingEmails = new Set(existingPersons.map((p) => p.email).filter(Boolean))

  const created: typeof existingPersons = []
  for (const p of SEED_PERSONS) {
    if (existingEmails.has(p.email)) {
      // Already exists — find and reuse
      const existing = existingPersons.find((e) => e.email === p.email)
      if (existing) created.push(existing)
    } else {
      const person = await personsDb.create(p)
      created.push(person)
    }
  }

  const allPersons = await personsDb.getAll()

  // Group persons by role bucket (by index in SEED_PERSONS list)
  const preachers    = allPersons.filter((p) => ['thomas.mueller','michael.bauer','andreas.wagner','stefan.klein','johannes.hoffmann'].some(n => p.email?.startsWith(n)))
  const moderators   = allPersons.filter((p) => ['sarah.fischer','maria.schneider','laura.braun','klaus.zimmermann'].some(n => p.email?.startsWith(n)))
  const kinder       = allPersons.filter((p) => ['eva.richter','sabine.koch','hannah.meyer'].some(n => p.email?.startsWith(n)))
  const gesangLeiter = allPersons.filter((p) => ['christian.wolf','daniel.huber'].some(n => p.email?.startsWith(n)))
  const gesangMit    = allPersons.filter((p) => ['julia.kramer','martin.lange'].some(n => p.email?.startsWith(n)))
  const technikLeit  = allPersons.filter((p) => ['markus.schaefer'].some(n => p.email?.startsWith(n)))
  const technikMit   = allPersons.filter((p) => ['felix.becker'].some(n => p.email?.startsWith(n)))

  // 2. Generate and upsert all service dates
  const dates = generateServiceDates()
  const eventIds: { id: string; type: 'friday' | 'sunday' }[] = []

  for (const { date, type } of dates) {
    const end = new Date(date)
    end.setHours(type === 'friday' ? 19 : 11, 30, 0, 0)

    const microsoftId = `dev-${type}-${date.toISOString().slice(0, 10)}`
    const title = type === 'friday' ? 'Freitagabend' : 'Gottesdienst'

    await eventsDb.upsert({
      microsoftId,
      title,
      startDate: date.toISOString(),
      endDate: end.toISOString(),
    })

    // Retrieve the event id we just upserted
    const events = await eventsDb.getByMicrosoftId(microsoftId)
    if (events) eventIds.push({ id: events.id, type })
  }

  // 3. Assign roles round-robin
  const round = (arr: typeof allPersons, i: number) =>
    arr.length > 0 ? arr[i % arr.length].id : null

  let fridayIdx = 0
  let sundayIdx = 0

  for (const { id: eventId, type } of eventIds) {
    const i = type === 'friday' ? fridayIdx++ : sundayIdx++

    const assignments: Array<{ role: JobRole; personId: string | null }> = [
      { role: 'PREDIGT',            personId: round(preachers, i) },
      { role: 'MODERATION',         personId: round(moderators, i) },
      { role: 'GESANG_LEITER',      personId: round(gesangLeiter, i) },
      { role: 'GESANG_MITARBEITER', personId: round(gesangMit, i) },
      { role: 'TECHNIK_LEITER',     personId: technikLeit[0]?.id ?? null },
      { role: 'TECHNIK_MITARBEITER',personId: technikMit[0]?.id ?? null },
    ]

    // Kindergeschichte only on Sundays
    if (type === 'sunday') {
      assignments.push({ role: 'KINDERGESCHICHTE', personId: round(kinder, i) })
    }

    for (const { role, personId } of assignments) {
      await jobsDb.upsert({ eventId, role, personId })
    }
  }

  return NextResponse.json({
    persons: allPersons.length,
    events: eventIds.length,
    fridays: eventIds.filter((e) => e.type === 'friday').length,
    sundays: eventIds.filter((e) => e.type === 'sunday').length,
  })
}
