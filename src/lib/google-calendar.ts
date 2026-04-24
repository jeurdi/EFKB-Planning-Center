import { EventType, EVENT_TYPE_DEFAULTS } from '@/types'

// ── Timezone helpers ──────────────────────────────────────────────────────────

function lastSundayOfMonth(year: number, month: number): number {
  const lastDay = new Date(year, month, 0).getDate()
  return lastDay - new Date(year, month - 1, lastDay).getDay()
}

/** Returns '+01:00' (CET) or '+02:00' (CEST) for a given UTC timestamp. */
function berlinOffset(utcMs: number): '+01:00' | '+02:00' {
  const d = new Date(utcMs)
  const y = d.getUTCFullYear()
  const dstStart = new Date(Date.UTC(y, 2, lastSundayOfMonth(y, 3), 1))
  const dstEnd   = new Date(Date.UTC(y, 9, lastSundayOfMonth(y, 10), 1))
  return utcMs >= dstStart.getTime() && utcMs < dstEnd.getTime() ? '+02:00' : '+01:00'
}

/** True for any timezone that follows CET/CEST rules. */
function isCET(tzid: string): boolean {
  return tzid.startsWith('Europe/') || tzid === 'Africa/Ceuta' || tzid === 'Africa/Melilla'
}

/** Convert a local datetime string (YYYY-MM-DDTHH:MM:SS) + TZID to UTC Date. */
function localToUtc(localStr: string, tzid?: string): Date {
  if (!tzid || !isCET(tzid)) return new Date(localStr + 'Z')
  const approxUtc = new Date(localStr + '+01:00').getTime()
  return new Date(localStr + berlinOffset(approxUtc))
}

/** Parse a raw ICS datetime string (possibly with TZID) into a UTC Date. */
function parseICSDate(value: string, tzid?: string): Date {
  const v = value.trim()
  if (v.length === 8) {
    return new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00Z`)
  }
  if (v.endsWith('Z')) {
    return new Date(v.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'))
  }
  const local = v.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
  return localToUtc(local, tzid)
}

/** Extract HH, MM, SS from raw ICS value like "20140914T100000" or "20140914T100000Z". */
function extractTime(raw: string): [number, number, number] {
  const m = raw.trim().match(/T(\d{2})(\d{2})(\d{2})/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
}

/**
 * Apply local time (h/m/s + TZID) to a calendar date (y/m/d),
 * returning the correct UTC Date for that local wall-clock time.
 * This ensures DST is accounted for per occurrence.
 */
function makeOccurrenceUtc(
  y: number, mo: number, d: number,
  h: number, mi: number, s: number,
  tzid?: string,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`
  return localToUtc(local, tzid)
}

// ── ICS line unfolding ─────────────────────────────────────────────────────────

function unfoldLines(raw: string): string[] {
  return raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r\n|\n/)
}

// ── Raw VEVENT ────────────────────────────────────────────────────────────────

interface RawEvent {
  uid: string
  summary: string
  dtstart: Date
  dtend: Date
  tzid?: string           // TZID from DTSTART (needed for recurring expansion)
  localH: number          // local hour of DTSTART (for recurring expansion)
  localM: number
  localS: number
  rrule?: string
  exdates: Date[]
  recurrenceId?: Date
}

function parseICS(raw: string): RawEvent[] {
  const lines = unfoldLines(raw)
  const events: RawEvent[] = []
  let cur: (Partial<RawEvent> & { exdates: Date[] }) | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { exdates: [], localH: 0, localM: 0, localS: 0 }; continue }
    if (line === 'END:VEVENT') {
      if (cur?.uid && cur?.summary && cur?.dtstart && cur?.dtend) events.push(cur as RawEvent)
      cur = null; continue
    }
    if (!cur) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const propFull = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1).trim()
    const parts = propFull.split(';')
    const propName = parts[0]
    const params: Record<string, string> = {}
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf('=')
      if (eq !== -1) params[parts[i].slice(0, eq)] = parts[i].slice(eq + 1)
    }

    switch (propName) {
      case 'UID':    cur.uid = value; break
      case 'SUMMARY': cur.summary = value.replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\;/g, ';').trim(); break
      case 'RRULE':  cur.rrule = value; break
      case 'DTSTART':
        cur.tzid = params['TZID']
        cur.dtstart = parseICSDate(value, params['TZID'])
        ;[cur.localH, cur.localM, cur.localS] = extractTime(value)
        break
      case 'DTEND':
        cur.dtend = parseICSDate(value, params['TZID'])
        break
      case 'EXDATE':
        for (const d of value.split(',')) {
          try { cur.exdates.push(parseICSDate(d, params['TZID'])) } catch {}
        }
        break
      case 'RECURRENCE-ID':
        try { cur.recurrenceId = parseICSDate(value, params['TZID']) } catch {}
        break
    }
  }
  return events
}

// ── RRULE expansion ───────────────────────────────────────────────────────────

const DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function parseRRule(str: string) {
  const p: Record<string, string> = {}
  for (const part of str.split(';')) {
    const i = part.indexOf('='); if (i !== -1) p[part.slice(0, i)] = part.slice(i + 1)
  }
  return {
    freq: p.FREQ as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
    until: p.UNTIL ? parseICSDate(p.UNTIL) : undefined,
    count: p.COUNT ? Number(p.COUNT) : undefined,
    interval: p.INTERVAL ? Number(p.INTERVAL) : 1,
    byDay: p.BYDAY ? p.BYDAY.split(',') : [] as string[],
    byMonth: p.BYMONTH ? p.BYMONTH.split(',').map(Number) : [] as number[],
  }
}

function parseBYDAY(list: string[]): { n: number | null; dow: number }[] {
  return list.flatMap(d => {
    const m = d.match(/^(-?\d+)?([A-Z]{2})$/)
    if (!m) return []
    return [{ n: m[1] ? Number(m[1]) : null, dow: DOW[m[2]] ?? 0 }]
  })
}

/** Add `days` to a calendar date (no timezone involved). */
function addDaysToDate(y: number, mo: number, d: number, days: number): [number, number, number] {
  const dt = new Date(Date.UTC(y, mo - 1, d + days))
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()]
}

function getNthWeekday(year: number, month: number, dow: number, n: number): [number, number, number] | null {
  if (n > 0) {
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const day = 1 + ((dow - firstDow + 7) % 7) + (n - 1) * 7
    if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null
    return [year, month, day]
  }
  const lastDay = new Date(Date.UTC(year, month, 0))
  const lastDow = lastDay.getUTCDay()
  const day = lastDay.getUTCDate() - ((lastDow - dow + 7) % 7) + (n + 1) * 7
  if (day < 1) return null
  return [year, month, day]
}

function isExcluded(d: Date, exdates: Date[]): boolean {
  return exdates.some(e => Math.abs(e.getTime() - d.getTime()) < 60_000)
}

/**
 * Expand a recurring event into individual UTC occurrence dates.
 * For each occurrence we re-apply the original local time (h/m/s + TZID)
 * so DST transitions are handled correctly per occurrence.
 */
function expandRRule(event: RawEvent, windowStart: Date, windowEnd: Date): Date[] {
  if (!event.rrule) return [event.dtstart]

  const rule = parseRRule(event.rrule)
  const until = rule.until ?? windowEnd
  const limit = rule.count ?? 5000
  const results: Date[] = []

  // Convert a calendar date to a UTC Date using the event's local time + TZID
  const occ = (y: number, mo: number, d: number): Date =>
    makeOccurrenceUtc(y, mo, d, event.localH, event.localM, event.localS, event.tzid)

  const add = (d: Date) => {
    if (results.length >= limit) return
    if (d < event.dtstart || d > until) return
    if (isExcluded(d, event.exdates)) return
    results.push(d)
  }

  // Starting calendar date (local date of DTSTART)
  let [y, mo, d] = [
    event.dtstart.getUTCFullYear(),
    event.dtstart.getUTCMonth() + 1,
    event.dtstart.getUTCDate(),
  ]
  // If TZID is set, dtstart UTC may differ from local date; re-derive from occ()
  // (for most cases they match, but near midnight transitions they could differ)

  if (rule.freq === 'WEEKLY') {
    const byDays = parseBYDAY(rule.byDay)

    if (byDays.length === 0) {
      while (results.length < limit) {
        const cur = occ(y, mo, d)
        if (cur > until) break
        add(cur)
        ;[y, mo, d] = addDaysToDate(y, mo, d, 7 * rule.interval)
      }
    } else {
      // Find start of the week (Sunday) of DTSTART
      const startDow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
      ;[y, mo, d] = addDaysToDate(y, mo, d, -startDow) // go to Sunday of that week

      let weeks = 0
      while (weeks < 5000 && results.length < limit) {
        for (const { dow } of byDays) {
          const [cy, cmo, cd] = addDaysToDate(y, mo, d, dow)
          const cur = occ(cy, cmo, cd)
          if (cur > until) continue
          add(cur)
        }
        if (occ(...addDaysToDate(y, mo, d, 0)) > until) break
        ;[y, mo, d] = addDaysToDate(y, mo, d, 7 * rule.interval)
        weeks++
      }
    }
  } else if (rule.freq === 'MONTHLY') {
    const byDays = parseBYDAY(rule.byDay)

    for (let m = 0; m < 500 && results.length < limit; m++) {
      if (new Date(Date.UTC(y, mo - 1, 1)) > until) break

      if (byDays.length > 0) {
        for (const { n, dow } of byDays) {
          if (n === null) continue
          const ymd = getNthWeekday(y, mo, dow, n)
          if (!ymd) continue
          add(occ(...ymd))
        }
      } else {
        const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate()
        if (d <= daysInMonth) add(occ(y, mo, d))
      }

      mo += rule.interval
      while (mo > 12) { mo -= 12; y++ }
    }
  } else if (rule.freq === 'YEARLY') {
    const byDays = parseBYDAY(rule.byDay)
    const months = rule.byMonth.length > 0 ? rule.byMonth : [mo]

    for (let yr = y; yr <= until.getUTCFullYear() + 1 && results.length < limit; yr += rule.interval) {
      for (const month of months) {
        if (byDays.length > 0) {
          for (const { n, dow } of byDays) {
            if (n === null) continue
            const ymd = getNthWeekday(yr, month, dow, n)
            if (!ymd) continue
            add(occ(...ymd))
          }
        } else {
          add(occ(yr, month, d))
        }
      }
    }
  }

  return results.filter(r => r >= windowStart && r <= windowEnd)
}

// ── Event type detection ──────────────────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  uid: string
  title: string
  startDate: string
  endDate: string
  eventType: EventType
  isPublic: boolean
  needsPlanning: boolean
}

export async function fetchGoogleCalendarEvents(
  icsUrl: string,
  isInternal: boolean,
  monthsPast = 36,
  monthsAhead = 24,
): Promise<GoogleCalendarEvent[]> {
  const res = await fetch(icsUrl, { cache: 'no-store' } as RequestInit)
  if (!res.ok) throw new Error(`Google Calendar fetch failed: ${res.status}`)
  const allEvents = parseICS(await res.text())

  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - monthsPast)
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + monthsAhead)

  // Separate masters and overrides by UID
  const masters = new Map<string, RawEvent>()
  const overrides = new Map<string, RawEvent[]>()
  for (const e of allEvents) {
    if (e.recurrenceId) {
      const list = overrides.get(e.uid) ?? []; list.push(e); overrides.set(e.uid, list)
    } else {
      masters.set(e.uid, e)
    }
  }

  // Detect THISANDFUTURE splits: Google encodes them as a new UID with _R{date} suffix.
  // The original series must be cut off at the new series' start date.
  const cutoffs = new Map<string, Date>() // baseUid -> exclusive cutoff
  for (const [uid, master] of masters) {
    const m = uid.match(/_R\d{8}T\d{6}/)
    if (m) {
      const baseUid = uid.replace(/_R\d{8}T\d{6}/, '')
      if (masters.has(baseUid)) {
        const existing = cutoffs.get(baseUid)
        if (!existing || master.dtstart < existing) cutoffs.set(baseUid, master.dtstart)
      }
    }
  }

  const results: GoogleCalendarEvent[] = []

  for (const [uid, master] of masters) {
    const masterDuration = master.dtend.getTime() - master.dtstart.getTime()
    const cutoff = cutoffs.get(uid)
    const occurrences = expandRRule(master, windowStart, windowEnd)
      .filter(occ => !cutoff || occ < cutoff)
    const uidOverrides = overrides.get(uid) ?? []

    for (const occStart of occurrences) {
      const override = uidOverrides.find(
        o => o.recurrenceId && Math.abs(o.recurrenceId.getTime() - occStart.getTime()) < 60_000
      )
      const start = override?.dtstart ?? occStart
      const end   = override?.dtend   ?? new Date(occStart.getTime() + masterDuration)
      const title = override?.summary ?? master.summary

      if (start < windowStart || start > windowEnd) continue

      const eventType = detectEventType(title, isInternal)
      const defaults  = EVENT_TYPE_DEFAULTS[eventType]
      results.push({
        uid: `google-${uid}-${occStart.toISOString()}`,
        title,
        startDate: start.toISOString(),
        endDate:   end.toISOString(),
        eventType,
        isPublic:     defaults.isPublic,
        needsPlanning: defaults.needsPlanning,
      })
    }
  }

  return results
}
