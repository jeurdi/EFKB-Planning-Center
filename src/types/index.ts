// ─── App User Roles ───────────────────────────────────────────────────────────

export type AppRole =
  | 'ADMIN'
  | 'MITARBEITER'
  | 'MODERATOR'
  | 'KINDERGESCHICHTE_ADMIN'
  | 'TECHNIK_LEITER'
  | 'GESANG_LEITER'

export const APP_ROLES: AppRole[] = [
  'ADMIN', 'MITARBEITER', 'MODERATOR', 'KINDERGESCHICHTE_ADMIN', 'TECHNIK_LEITER', 'GESANG_LEITER',
]

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  ADMIN:                  'Administrator',
  MITARBEITER:            'Mitarbeiter',
  MODERATOR:              'Moderator',
  KINDERGESCHICHTE_ADMIN: 'Kindergeschichte',
  TECHNIK_LEITER:         'Technik Leiter',
  GESANG_LEITER:          'Gesang Leiter',
}

export interface AppUser {
  id: string
  email: string
  name: string | null
  role: AppRole
  createdAt: string
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export type EventType = 'GOTTESDIENST' | 'JUGEND' | 'KINDER' | 'GEBET' | 'MITARBEITER' | 'INTERN' | 'SONSTIGE'

export const EVENT_TYPES: EventType[] = [
  'GOTTESDIENST', 'JUGEND', 'KINDER', 'GEBET', 'MITARBEITER', 'INTERN', 'SONSTIGE',
]

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  GOTTESDIENST: 'Gottesdienst',
  JUGEND:       'Jugendstunde',
  KINDER:       'Kinder- / Jungschar',
  GEBET:        'Gebetsveranstaltung',
  MITARBEITER:  'Mitarbeitertreff',
  INTERN:       'Interner Termin',
  SONSTIGE:     'Sonstiges',
}

export const EVENT_TYPE_DEFAULTS: Record<EventType, {
  needsPlanning: boolean
  isPublic: boolean
  defaultTitle: string
  defaultStartTime: string
  defaultEndTime: string
}> = {
  GOTTESDIENST: { needsPlanning: true,  isPublic: true,  defaultTitle: 'Gottesdienst',    defaultStartTime: '10:00', defaultEndTime: '11:30' },
  JUGEND:       { needsPlanning: false, isPublic: true,  defaultTitle: 'Jugendstunde',     defaultStartTime: '20:00', defaultEndTime: '22:00' },
  KINDER:       { needsPlanning: false, isPublic: true,  defaultTitle: 'Jungschar',        defaultStartTime: '18:00', defaultEndTime: '20:00' },
  GEBET:        { needsPlanning: false, isPublic: true,  defaultTitle: 'Gebetskreis',      defaultStartTime: '19:30', defaultEndTime: '21:00' },
  MITARBEITER:  { needsPlanning: false, isPublic: true,  defaultTitle: 'Mitarbeitertreff', defaultStartTime: '19:00', defaultEndTime: '21:00' },
  INTERN:       { needsPlanning: false, isPublic: false, defaultTitle: 'Interner Termin',  defaultStartTime: '09:00', defaultEndTime: '12:00' },
  SONSTIGE:     { needsPlanning: false, isPublic: true,  defaultTitle: '',                 defaultStartTime: '10:00', defaultEndTime: '12:00' },
}

// ─── Job Roles ────────────────────────────────────────────────────────────────

export type JobRole =
  | 'TECHNIK_LEITER'
  | 'TECHNIK_MITARBEITER'
  | 'MODERATION'
  | 'PREDIGT'
  | 'KINDERGESCHICHTE'
  | 'GESANG_LEITER'
  | 'GESANG_MITARBEITER'
  | 'PROGRAMM_GEMEINDECHOR'
  | 'PROGRAMM_JUGENDCHOR'
  | 'PROGRAMM_KINDERCHOR'
  | 'PROGRAMM_ORCHESTER'
  | 'PROGRAMM_STREICHENSEMBLE'
  | 'PROGRAMM_SONSTIGES'

export const JOB_ROLES: JobRole[] = [
  'TECHNIK_LEITER',
  'TECHNIK_MITARBEITER',
  'MODERATION',
  'PREDIGT',
  'KINDERGESCHICHTE',
  'GESANG_LEITER',
  'GESANG_MITARBEITER',
  'PROGRAMM_GEMEINDECHOR',
  'PROGRAMM_JUGENDCHOR',
  'PROGRAMM_KINDERCHOR',
  'PROGRAMM_ORCHESTER',
  'PROGRAMM_STREICHENSEMBLE',
  'PROGRAMM_SONSTIGES',
]

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  TECHNIK_LEITER:          'Leiter',
  TECHNIK_MITARBEITER:     'Mitarbeiter',
  MODERATION:              'Moderation',
  PREDIGT:                 'Predigt',
  KINDERGESCHICHTE:        'Kindergeschichte',
  GESANG_LEITER:           'Leiter',
  GESANG_MITARBEITER:      'Mitarbeiter',
  PROGRAMM_GEMEINDECHOR:   'Gemeindechor',
  PROGRAMM_JUGENDCHOR:     'Jugendchor',
  PROGRAMM_KINDERCHOR:     'Kinderchor',
  PROGRAMM_ORCHESTER:      'Orchester',
  PROGRAMM_STREICHENSEMBLE:'Streichensemble',
  PROGRAMM_SONSTIGES:      'Sonstiges',
}

// Roles that support multiple persons per service
export const MULTI_PERSON_ROLES: JobRole[] = ['PREDIGT', 'TECHNIK_MITARBEITER', 'GESANG_MITARBEITER']

// Groups for display in JobsPanel (standard roles only)
export const JOB_ROLE_GROUPS: { label: string; roles: JobRole[] }[] = [
  { label: 'Dienst',  roles: ['MODERATION', 'PREDIGT', 'KINDERGESCHICHTE'] },
  { label: 'Gesang',  roles: ['GESANG_LEITER', 'GESANG_MITARBEITER'] },
  { label: 'Technik', roles: ['TECHNIK_LEITER', 'TECHNIK_MITARBEITER'] },
]

// Programmbeitrag — single dropdown slot, one active type at a time
export const PROGRAMM_ROLES: JobRole[] = [
  'PROGRAMM_GEMEINDECHOR', 'PROGRAMM_JUGENDCHOR', 'PROGRAMM_KINDERCHOR',
  'PROGRAMM_ORCHESTER', 'PROGRAMM_STREICHENSEMBLE', 'PROGRAMM_SONSTIGES',
]

export const PROGRAMM_ROLE_LABELS: Record<string, string> = {
  PROGRAMM_GEMEINDECHOR:    'Gemeindechor',
  PROGRAMM_JUGENDCHOR:      'Jugendchor',
  PROGRAMM_KINDERCHOR:      'Kinderchor',
  PROGRAMM_ORCHESTER:       'Orchester',
  PROGRAMM_STREICHENSEMBLE: 'Streichensemble',
  PROGRAMM_SONSTIGES:       'Sonstiges',
}

// ─── Agenda presets ───────────────────────────────────────────────────────────
// (replaces the user-visible "tag" concept — now set automatically via preset buttons)

export type AgendaTag = 'MODERATION' | 'GEMEINSAMER_GESANG' | 'KINDERGESCHICHTE' | 'PREDIGT' | 'BEITRAG'

export const AGENDA_PRESETS: AgendaTag[] = [
  'MODERATION',
  'PREDIGT',
  'KINDERGESCHICHTE',
  'GEMEINSAMER_GESANG',
  'BEITRAG',
]

export const AGENDA_PRESET_LABELS: Record<AgendaTag, string> = {
  MODERATION: 'Moderation',
  PREDIGT: 'Predigt',
  KINDERGESCHICHTE: 'Kindergeschichte',
  GEMEINSAMER_GESANG: 'Gemeinsamer Gesang',
  BEITRAG: 'Beitrag',
}

// Which job role to auto-fill from when an agenda preset is selected
// null = no auto-fill (user picks manually)
export const PRESET_TO_JOB: Record<AgendaTag, JobRole | null> = {
  MODERATION: 'MODERATION',
  PREDIGT: 'PREDIGT',
  KINDERGESCHICHTE: 'KINDERGESCHICHTE',
  GEMEINSAMER_GESANG: 'GESANG_LEITER',
  BEITRAG: null,
}

// Subtle left-border color for agenda item rows
export const AGENDA_PRESET_BORDER: Record<AgendaTag, string> = {
  MODERATION: 'border-l-blue-400',
  PREDIGT: 'border-l-green-400',
  KINDERGESCHICHTE: 'border-l-yellow-400',
  GEMEINSAMER_GESANG: 'border-l-purple-400',
  BEITRAG: 'border-l-gray-300',
}

// ─── Agenda Templates ─────────────────────────────────────────────────────────

export interface AgendaTemplateItem {
  id: string
  templateId: string
  order: number
  title: string
  tag: AgendaTag | null
  duration: number | null
}

export interface AgendaTemplate {
  id: string
  name: string
  createdAt: string
  items: AgendaTemplateItem[]
}

// ─── Data interfaces ──────────────────────────────────────────────────────────

export interface Person {
  id: string
  firstName: string
  lastName: string
  email: string | null
  createdAt: string
  roles?: JobRole[]
}

export interface CalendarEvent {
  id: string
  microsoftId: string
  title: string
  startDate: string
  endDate: string
  isService: boolean
  eventType: EventType
  isPublic: boolean
  needsPlanning: boolean
  vermeldungen: string | null
  thema: string | null
  gebetsanliegen: string | null
}

export interface ServiceJob {
  id: string
  eventId: string
  role: JobRole
  personId: string | null
  person?: Person | null
}

export interface AgendaItem {
  id: string
  eventId: string
  order: number
  title: string
  tag: AgendaTag | null
  personId: string | null
  person?: Person | null
  duration: number | null
  notes: string | null
}

export interface ServiceDetail extends CalendarEvent {
  jobs: ServiceJob[]
  agendaItems: AgendaItem[]
}
