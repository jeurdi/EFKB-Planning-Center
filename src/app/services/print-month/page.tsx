'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CalendarEvent } from '@/types'

const SHORT_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function parseDateParts(iso: string) {
  const d = new Date(iso)
  return {
    weekday: SHORT_DAYS[d.getDay()],
    day:     String(d.getDate()).padStart(2, '0') + '.',
    month:   SHORT_MONTHS[d.getMonth()],
    time:    String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'),
  }
}

function isDefaultBold(iso: string): boolean {
  const d = new Date(iso)
  return (d.getDay() === 0 && d.getHours() === 10) || (d.getDay() === 5 && d.getHours() === 18)
}

function isoWeek(iso: string): number {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7)
}

function EventTable({ events, formats, hideHeader }: { events: CalendarEvent[]; formats?: Map<string, { bold: boolean; italic: boolean }>; hideHeader?: boolean }) {
  return (
    <table className="text-base border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
      <colgroup>
        <col style={{ width: '1rem' }} />
        <col style={{ width: '6rem' }} />
        <col style={{ width: '5rem' }} />
        <col />
      </colgroup>
      {!hideHeader && (
        <thead>
          <tr className="border-b-2 border-gray-400">
            <th colSpan={2} className="pr-6 text-left font-semibold text-gray-500" style={{ padding: '1px 1.5rem 1px 0' }}>Datum</th>
            <th className="pr-6 text-left font-semibold text-gray-500" style={{ padding: '1px 1.5rem 1px 0' }}>Uhrzeit</th>
            <th className="text-left font-semibold text-gray-500" style={{ padding: '1px 0' }}>Veranstaltung</th>
          </tr>
        </thead>
      )}
      <tbody>
        {events.map((s, i) => {
          const { weekday, day, month, time } = parseDateParts(s.startDate)
          const nextEvent = events[i + 1]
          const weekBreak = nextEvent && isoWeek(nextEvent.startDate) !== isoWeek(s.startDate)
          const borderStyle = weekBreak ? { borderBottom: '3px double #9ca3af' } : { borderBottom: '1px solid #d1d5db' }
          const fmt = formats?.get(s.id)
          const bold = fmt?.bold ?? s.isBold
          const italic = fmt?.italic ?? s.isItalic
          return (
            <tr key={s.id} style={borderStyle}>
              <td className="text-gray-700 whitespace-nowrap" style={{ padding: '1px 2px 1px 0' }}>{weekday}</td>
              <td className="pr-6 text-gray-700 w-28 text-right whitespace-nowrap" style={{ padding: '1px 1.5rem 1px 0' }}>{day} {month}</td>
              <td className="pr-6 text-gray-700 w-12" style={{ padding: '1px 1.5rem 1px 0' }}>{time}</td>
              <td className="text-gray-900 font-medium" style={{ padding: '1px 0', fontWeight: bold ? 'bold' : undefined, fontStyle: italic ? 'italic' : undefined }}>{s.title}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function PrintMonthContent() {
  const params = useSearchParams()

  const [currentMonth, setCurrentMonth] = useState(() => {
    const p = params.get('month')
    if (p) {
      const [y, m] = p.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = currentMonth.getFullYear()
  const monthIndex = currentMonth.getMonth()

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [includedInternalIds, setIncludedInternalIds] = useState<Set<string>>(new Set())
  const [formats, setFormats] = useState<Map<string, { bold: boolean; italic: boolean }>>(new Map())

  function toggleFormat(id: string, field: 'bold' | 'italic', currentValue: boolean) {
    const next = new Map(formats)
    const cur = next.get(id) ?? { bold: allEvents.find(e => e.id === id)?.isBold ?? false, italic: allEvents.find(e => e.id === id)?.isItalic ?? false }
    next.set(id, { ...cur, [field]: !currentValue })
    setFormats(next)
    fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field === 'bold' ? { isBold: !currentValue } : { isItalic: !currentValue }),
    })
  }

  const title = `Veranstaltungen im ${MONTH_NAMES[monthIndex]} ${year}`

  function offsetMonth(baseYear: number, baseMonth: number, offset: number) {
    const total = baseMonth + offset
    return { y: baseYear + Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
  }
  const next1 = offsetMonth(year, monthIndex, 1)
  const next2 = offsetMonth(year, monthIndex, 2)

  useEffect(() => {
    fetch('/api/services?all=true')
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data as CalendarEvent[]).sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
        setAllEvents(sorted)
        setFormats(new Map(sorted.map(e => [e.id, {
          bold: e.isBold || isDefaultBold(e.startDate),
          italic: e.isItalic,
        }])))
        setLoading(false)
      })
      .catch(() => { setError('Fehler beim Laden'); setLoading(false) })
  }, [])

  const currentEvents = allEvents.filter((e) => {
    const d = new Date(e.startDate)
    return d.getFullYear() === year && d.getMonth() === monthIndex
  })
  const publicCurrentEvents   = currentEvents.filter(e => e.isPublic)
  const internalCurrentEvents = currentEvents.filter(e => !e.isPublic)
  const displayedCurrentEvents = [
    ...publicCurrentEvents,
    ...internalCurrentEvents.filter(e => includedInternalIds.has(e.id)),
  ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  function eventsForMonth(y: number, m: number) {
    return allEvents.filter((e) => {
      const d = new Date(e.startDate)
      return d.getFullYear() === y && d.getMonth() === m
    })
  }

  const upcomingGroups = [
    { label: `${MONTH_NAMES[next1.m]} ${next1.y}`, events: eventsForMonth(next1.y, next1.m) },
    { label: `${MONTH_NAMES[next2.m]} ${next2.y}`, events: eventsForMonth(next2.y, next2.m) },
  ].filter((g) => g.events.length > 0)

  const previewEvents = allEvents.filter((e) => selectedIds.has(e.id))

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <p className="p-8 text-gray-400">Lädt…</p>
  if (error)   return <p className="p-8 text-red-600">{error}</p>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          body { font-size: 11pt; }
          @page { margin: 2cm; }
        }
        body { font-family: sans-serif; color: #111; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex items-start justify-center gap-6 px-6 py-4 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Als PDF drucken
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
          >
            Schließen
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(year, monthIndex - 1, 1))}
            className="p-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
          >
            ‹
          </button>
          <span className="text-sm font-medium w-36 text-center">{MONTH_NAMES[monthIndex]} {year}</span>
          <button
            onClick={() => setCurrentMonth(new Date(year, monthIndex + 1, 1))}
            className="p-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
          >
            ›
          </button>
        </div>

        {/* Formatting + Preview picker */}
        <div className="flex gap-6 flex-wrap">
          {/* Public events — formatting only */}
          {publicCurrentEvents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {MONTH_NAMES[monthIndex]} — Formatierung
              </p>
              <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                {publicCurrentEvents.map((e) => {
                  const fmt = formats.get(e.id)
                  const bold = fmt?.bold ?? e.isBold
                  const italic = fmt?.italic ?? e.isItalic
                  const { weekday, day, month, time } = parseDateParts(e.startDate)
                  return (
                    <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <button onClick={() => toggleFormat(e.id, 'bold', bold)}
                        className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                      <button onClick={() => toggleFormat(e.id, 'italic', italic)}
                        className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                      <span>{weekday} {day} {month} {time} — {e.title.slice(0, 30)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Internal events — optional, unchecked by default */}
          {internalCurrentEvents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Intern (optional)
              </p>
              <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                {internalCurrentEvents.map((e) => {
                  const fmt = formats.get(e.id)
                  const bold = fmt?.bold ?? e.isBold
                  const italic = fmt?.italic ?? e.isItalic
                  const included = includedInternalIds.has(e.id)
                  const { weekday, day, month, time } = parseDateParts(e.startDate)
                  return (
                    <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" checked={included} onChange={() => setIncludedInternalIds(prev => { const n = new Set(prev); included ? n.delete(e.id) : n.add(e.id); return n })} className="rounded" />
                      <button onClick={() => toggleFormat(e.id, 'bold', bold)}
                        className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                      <button onClick={() => toggleFormat(e.id, 'italic', italic)}
                        className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                      <span>{weekday} {day} {month} {time} — {e.title.slice(0, 28)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Preview picker */}
          {upcomingGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Vorschau {group.label}
              </p>
              <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                {group.events.map((e) => {
                  const fmt = formats.get(e.id)
                  const bold = fmt?.bold ?? e.isBold
                  const italic = fmt?.italic ?? e.isItalic
                  const { weekday, day, month, time } = parseDateParts(e.startDate)
                  return (
                    <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleId(e.id)} className="rounded" />
                      <button onClick={() => toggleFormat(e.id, 'bold', bold)}
                        className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                      <button onClick={() => toggleFormat(e.id, 'italic', italic)}
                        className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                      <span>{weekday} {day} {month} {time} — {e.title.slice(0, 25)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document */}
      <div className="max-w-2xl mx-auto px-8 pt-4 pb-10">
        {/* Logo + Title row */}
        <div className="flex items-center gap-6 mb-6 border-b border-gray-300 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://efkb.de/wp-content/uploads/2024/10/cropped-cropped-Logo_EFK-Buende2015_orange-300x157-1.png"
            alt="EFK Bünde Logo"
            style={{ height: '60px', width: 'auto', flexShrink: 0 }}
          />
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Live-Stream: www.youtube.com/c/EFK-Bünde</p>
          </div>
        </div>

        {displayedCurrentEvents.length === 0 ? (
          <p className="text-gray-500">Keine Veranstaltungen in diesem Monat.</p>
        ) : (
          <EventTable events={displayedCurrentEvents} formats={formats} />
        )}

        {/* Preview section — only rendered when at least one event is selected */}
        {previewEvents.length > 0 && (
          <div className="mt-6" style={{ borderTop: '3px double #9ca3af', paddingTop: '4px' }}>
            <p className="text-sm font-semibold text-gray-500 mb-1">Vorschau</p>
            <EventTable events={previewEvents} formats={formats} hideHeader />
          </div>
        )}

      </div>
    </>
  )
}

export default function PrintMonthPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-400">Lädt…</p>}>
      <PrintMonthContent />
    </Suspense>
  )
}
