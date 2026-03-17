import type { JobRole } from '@/types'
import type { jobsDb } from './db'

const ROLE_LABELS: Record<JobRole, string> = {
  PREDIGT: 'Predigt',
  MODERATION: 'Moderation',
  KINDERGESCHICHTE: 'Kindergeschichte',
  GESANG_LEITER: 'Gesang Leiter',
  GESANG_MITARBEITER: 'Gesang Mitarbeiter',
  TECHNIK_LEITER: 'Technik Leiter',
  TECHNIK_MITARBEITER: 'Technik Mitarbeiter',
  PROGRAMM_GEMEINDECHOR: 'Gemeindechor',
  PROGRAMM_JUGENDCHOR: 'Jugendchor',
  PROGRAMM_KINDERCHOR: 'Kinderchor',
  PROGRAMM_ORCHESTER: 'Orchester',
  PROGRAMM_STREICHENSEMBLE: 'Streichensemble',
  PROGRAMM_SONSTIGES: 'Programmbeitrag Sonstiges',
}

const ROLE_ORDER: JobRole[] = [
  'PREDIGT', 'MODERATION', 'KINDERGESCHICHTE',
  'GESANG_LEITER', 'GESANG_MITARBEITER',
  'TECHNIK_LEITER', 'TECHNIK_MITARBEITER',
]

export function buildBodyText(jobs: Awaited<ReturnType<typeof jobsDb.getForEvent>>): string {
  const byRole = new Map<JobRole, string[]>()
  for (const job of jobs) {
    if (!job.person) continue
    const name = `${job.person.firstName} ${job.person.lastName}`
    const arr = byRole.get(job.role) ?? []
    arr.push(name)
    byRole.set(job.role, arr)
  }

  const lines: string[] = ['Dienste:', '']
  for (const role of ROLE_ORDER) {
    const persons = byRole.get(role)
    if (persons && persons.length > 0) {
      lines.push(`${ROLE_LABELS[role]}: ${persons.join(', ')}`)
    }
  }

  return lines.join('\n')
}
