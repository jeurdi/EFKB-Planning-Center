import type { AppRole, JobRole } from '@/types'

// Job roles each app role may edit in the JobsPanel
const EDITABLE_JOB_ROLES: Partial<Record<AppRole, JobRole[]>> = {
  ADMIN:                  ['MODERATION', 'PREDIGT', 'KINDERGESCHICHTE', 'GESANG_LEITER', 'GESANG_MITARBEITER', 'TECHNIK_LEITER', 'TECHNIK_MITARBEITER',
                           'PROGRAMM_GEMEINDECHOR', 'PROGRAMM_JUGENDCHOR', 'PROGRAMM_KINDERCHOR', 'PROGRAMM_ORCHESTER', 'PROGRAMM_STREICHENSEMBLE', 'PROGRAMM_SONSTIGES'],
  KINDERGESCHICHTE_ADMIN: ['KINDERGESCHICHTE'],
  TECHNIK_LEITER:         ['TECHNIK_LEITER', 'TECHNIK_MITARBEITER'],
  GESANG_LEITER:          ['GESANG_LEITER', 'GESANG_MITARBEITER'],
}

export function canEditJobRole(appRole: AppRole | null, jobRole: JobRole): boolean {
  if (!appRole) return false
  return EDITABLE_JOB_ROLES[appRole]?.includes(jobRole) ?? false
}

export function canEditProgrammbeitrag(appRole: AppRole | null): boolean {
  return appRole === 'ADMIN'
}

// Agenda editing: all roles
export function canEditAgenda(appRole: AppRole | null): boolean {
  return !!appRole
}

// Vermeldungen + Gebetsanliegen
export function canEditVermeldungen(appRole: AppRole | null): boolean {
  return appRole === 'ADMIN' || appRole === 'MODERATOR'
}

// Event title/date/status/delete — admin only
export function canEditEvent(appRole: AppRole | null): boolean {
  return appRole === 'ADMIN'
}

// Nav pages
export function canSeeSchedule(appRole: AppRole | null): boolean {
  if (!appRole) return false
  return !['MITARBEITER', 'MODERATOR'].includes(appRole)
}

export function canSeeExport(appRole: AppRole | null): boolean {
  if (!appRole) return false
  return !['MITARBEITER', 'MODERATOR'].includes(appRole)
}

export function canSeePersons(appRole: AppRole | null): boolean {
  return appRole === 'ADMIN'
}

export function canSeeSettings(appRole: AppRole | null): boolean {
  return appRole === 'ADMIN'
}

// Which schedule print exports a role may access
export function allowedExports(appRole: AppRole | null): string[] {
  if (!appRole) return []
  if (appRole === 'ADMIN') return ['PREDIGT', 'MODERATION', 'KINDERGESCHICHTE', 'GESANG_LEITER', 'TECHNIK_LEITER', 'GESAMT']
  if (appRole === 'KINDERGESCHICHTE_ADMIN') return ['KINDERGESCHICHTE']
  if (appRole === 'TECHNIK_LEITER') return ['TECHNIK_LEITER']
  if (appRole === 'GESANG_LEITER') return ['GESANG_LEITER']
  return []
}

export function canSeeVermeldungen(appRole: AppRole | null): boolean {
  return !!appRole  // all roles can read; edit restricted separately
}
