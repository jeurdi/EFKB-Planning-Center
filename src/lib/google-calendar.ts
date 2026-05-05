import IcalExpander from 'ical-expander'
import type { EventType } from '@/types'
import { EVENT_TYPE_DEFAULTS } from '@/types'

export interface GoogleCalendarEvent {
  uid: string
  stableKey: string
  title: string
  startDate: string
  endDate: string
  eventType: EventType
  isPublic: boolean
  needsPlanning: boolean
  calCreatedAt: string | null
  calModifiedAt: string | null
}

function detectEventType(title: string, isInternal: boolean): EventType {
  if (isInternal) return 'INTERN'
  const t = title.toLowerCase()
  if (t.includes('gottesdienst') || t.includes('andacht') || t.includes('festgott')) return 'GOTTESDIENST'
  if (t.includes('jugend') || t.includes('teeny') || t.includes('teenys')) return 'JUGEND'
  if (t.includes('jungschar') || t.includes('kinder') || t.includes('kidz')) return 'KINDER'
  if (t.includes('gebet')) return 'GEBET'
  if (t.includes('mitarbeiter')) return 'MITARBEITER'
  return 'SONSTIGE'
}

function unescape(s: string): string {
  return s.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, '\n').replace(/\\\\/g, '\\').trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function componentDate(component: any, prop: string): string | null {
  try {
    const val = component?.getFirstPropertyValue?.(prop)
    return val ? val.toJSDate().toISOString() : null
  } catch {
    return null
  }
}

export async function fetchGoogleCalendarEvents(
  icsUrl: string,
  isInternal: boolean,
  monthsPast = 36,
  monthsAhead = 60,
): Promise<GoogleCalendarEvent[]> {
  const res = await fetch(icsUrl, { cache: 'no-store' } as RequestInit)
  if (!res.ok) throw new Error(`Google Calendar fetch failed: ${res.status}`)
  const text = await res.text()

  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - monthsPast)
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + monthsAhead)

  const expander = new IcalExpander({ ics: text, maxIterations: 2000 })
  const { events, occurrences } = expander.between(windowStart, windowEnd)

  type RawEntry = { uid: string; title: string; start: Date; end: Date; stableKey: string; calCreatedAt: string | null; calModifiedAt: string | null }
  const raw: RawEntry[] = []

  for (const e of events) {
    const uid = e.uid ?? ''
    raw.push({
      uid,
      title: unescape(e.summary ?? ''),
      start: e.startDate.toJSDate(),
      end: e.endDate.toJSDate(),
      stableKey: uid + '::single',
      calCreatedAt: componentDate(e.component, 'created'),
      calModifiedAt: componentDate(e.component, 'last-modified'),
    })
  }

  for (const o of occurrences) {
    const uid = o.item.uid ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recId: Date = (o as any).recurrenceId?.toJSDate?.() ?? o.startDate.toJSDate()
    raw.push({
      uid,
      title: unescape(o.item.summary ?? ''),
      start: o.startDate.toJSDate(),
      end: o.endDate.toJSDate(),
      stableKey: uid + '::' + recId.toISOString(),
      calCreatedAt: componentDate(o.item.component, 'created'),
      calModifiedAt: componentDate(o.item.component, 'last-modified'),
    })
  }

  // Google Calendar encodes THISANDFUTURE splits as a new series with _R{date} in the UID.
  // Cut off the original series at that point to avoid duplicates.
  const cutoffs = new Map<string, Date>()
  for (const entry of raw) {
    const m = entry.uid.match(/_R\d{8}T\d{6}/)
    if (m) {
      const baseUid = entry.uid.replace(/_R\d{8}T\d{6}/, '')
      const existing = cutoffs.get(baseUid)
      if (!existing || entry.start < existing) cutoffs.set(baseUid, entry.start)
    }
  }

  const results: GoogleCalendarEvent[] = []
  for (const entry of raw) {
    const cutoff = cutoffs.get(entry.uid)
    if (cutoff && entry.start >= cutoff) continue

    const eventType = detectEventType(entry.title, isInternal)
    const defaults = EVENT_TYPE_DEFAULTS[eventType]
    results.push({
      uid: `google-${entry.uid}-${entry.start.toISOString()}`,
      stableKey: entry.stableKey,
      title: entry.title,
      startDate: entry.start.toISOString(),
      endDate: entry.end.toISOString(),
      eventType,
      isPublic: defaults.isPublic,
      needsPlanning: defaults.needsPlanning,
      calCreatedAt: entry.calCreatedAt,
      calModifiedAt: entry.calModifiedAt,
    })
  }

  return results
}
