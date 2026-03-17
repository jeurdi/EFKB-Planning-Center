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

function isoWeek(iso: string): number {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7)
}

function EventTable({ events, hideHeader }: { events: CalendarEvent[]; hideHeader?: boolean }) {
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
          const borderStyle = weekBreak
            ? { borderBottom: '3px double #9ca3af' }
            : { borderBottom: '1px solid #d1d5db' }
          return (
            <tr key={s.id} style={borderStyle}>
              <td className="text-gray-700 whitespace-nowrap" style={{ padding: '1px 2px 1px 0' }}>{weekday}</td>
              <td className="pr-6 text-gray-700 w-28 text-right whitespace-nowrap" style={{ padding: '1px 1.5rem 1px 0' }}>{day} {month}</td>
              <td className="pr-6 text-gray-700 w-12" style={{ padding: '1px 1.5rem 1px 0' }}>{time}</td>
              <td className="text-gray-900 font-medium" style={{ padding: '1px 0' }}>{s.title}</td>
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
        setLoading(false)
      })
      .catch(() => { setError('Fehler beim Laden'); setLoading(false) })
  }, [])

  const currentEvents = allEvents.filter((e) => {
    const d = new Date(e.startDate)
    return d.getFullYear() === year && d.getMonth() === monthIndex
  })

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
      <div className="no-print flex items-start gap-6 px-6 py-4 bg-gray-100 border-b border-gray-200">
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

        {/* Preview picker */}
        {upcomingGroups.length > 0 && (
          <div className="flex gap-6 flex-wrap">
            {upcomingGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Vorschau {group.label}
                </p>
                <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                  {group.events.map((e) => {
                    const { weekday, day, month, time } = parseDateParts(e.startDate)
                    return (
                      <label key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(e.id)}
                          onChange={() => toggleId(e.id)}
                          className="rounded"
                        />
                        {weekday} {day} {month} {time} — {e.title}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        {currentEvents.length === 0 ? (
          <p className="text-gray-500">Keine Veranstaltungen in diesem Monat.</p>
        ) : (
          <EventTable events={currentEvents} />
        )}

        {/* Preview section — only rendered when at least one event is selected */}
        {previewEvents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-500 mb-3 border-b border-gray-300 pb-1">
              Vorschau
            </h2>
            <EventTable events={previewEvents} hideHeader />
          </div>
        )}

        {/* Footer */}
        <p className="text-sm font-bold text-center text-gray-700" style={{ marginTop: '25px' }}>
          Unsere Gottesdienste per live-stream unter: www.youtube.com/c/EFK-Bünde
        </p>
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
