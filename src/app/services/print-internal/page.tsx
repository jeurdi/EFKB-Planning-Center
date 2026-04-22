'use client'

import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/types'

const SHORT_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function isDefaultBold(iso: string): boolean {
  const d = new Date(iso)
  return (d.getDay() === 0 && d.getHours() === 10) || (d.getDay() === 5 && d.getHours() === 18)
}

function isAllDay(iso: string) {
  const d = new Date(iso)
  return d.getHours() === 0 && d.getMinutes() === 0
}

function fmtShort(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}. ${SHORT_MONTHS[d.getMonth()]}`
}

function formatDate(e: { startDate: string; endDate: string }) {
  const start = new Date(e.startDate)
  const end = new Date(new Date(e.endDate).getTime() - 1)
  const endStr = fmtShort(end) !== fmtShort(start) ? ` – ${fmtShort(end)}` : ''
  return {
    date: `${fmtShort(start)}${endStr}`,
    time: isAllDay(e.startDate) ? '' : `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
  }
}

function fmtEventLabel(e: CalendarEvent) {
  const d = new Date(e.startDate)
  return `${SHORT_DAYS[d.getDay()]} ${fmtShort(d)} — ${e.title}`
}

export default function PrintInternalPage() {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formats, setFormats] = useState<Map<string, { bold: boolean; italic: boolean }>>(new Map())

  function toggleFormat(id: string, field: 'bold' | 'italic', currentValue: boolean) {
    const next = new Map(formats)
    const ev = allEvents.find(e => e.id === id)
    const cur = next.get(id) ?? { bold: ev?.isBold ?? false, italic: ev?.isItalic ?? false }
    next.set(id, { ...cur, [field]: !currentValue })
    setFormats(next)
    fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field === 'bold' ? { isBold: !currentValue } : { isItalic: !currentValue }),
    })
  }

  useEffect(() => {
    fetch('/api/services?all=true')
      .then((r) => r.json())
      .then((data: unknown) => {
        const now = new Date()
        const future = (data as CalendarEvent[])
          .filter((e) => new Date(e.startDate) >= now)
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        setAllEvents(future)
        setSelectedIds(new Set(future.filter((e) => !e.isPublic).map((e) => e.id)))
        setFormats(new Map(future.map(e => [e.id, {
          bold: e.isBold || isDefaultBold(e.startDate),
          italic: e.isItalic,
        }])))
        setLoading(false)
      })
      .catch(() => {
        setError('Fehler beim Laden')
        setLoading(false)
      })
  }, [])

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(evts: CalendarEvent[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      evts.forEach((e) => (checked ? next.add(e.id) : next.delete(e.id)))
      return next
    })
  }

  const internalEvents = allEvents.filter((e) => !e.isPublic)
  const publicEvents = allEvents.filter((e) => e.isPublic)

  const selectedEvents = allEvents.filter((e) => selectedIds.has(e.id))

  // Group selected events by year
  const byYear: Record<number, CalendarEvent[]> = {}
  for (const e of selectedEvents) {
    const y = new Date(e.startDate).getFullYear()
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(e)
  }
  const years = Object.keys(byYear).map(Number).sort()

  if (loading) return <p className="p-8 text-gray-400">Lädt…</p>
  if (error) return <p className="p-8 text-red-600">{error}</p>

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
        {/* Buttons */}
        <div className="flex items-center gap-3 shrink-0">
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
        </div>

        {/* Event selection */}
        <div className="flex gap-6 flex-wrap">
          {/* Internal */}
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Intern ({internalEvents.length})
              </p>
              <div className="flex gap-1.5 text-xs text-blue-600">
                <button onClick={() => toggleAll(internalEvents, true)}>Alle</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => toggleAll(internalEvents, false)}>Keine</button>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
              {internalEvents.map((e) => {
                const fmt = formats.get(e.id)
                const bold = fmt?.bold ?? e.isBold
                const italic = fmt?.italic ?? e.isItalic
                return (
                  <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleId(e.id)} className="rounded" />
                    <button onClick={() => toggleFormat(e.id, 'bold', bold)} className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                    <button onClick={() => toggleFormat(e.id, 'italic', italic)} className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                    <span>{fmtEventLabel(e)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Public */}
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Öffentlich ({publicEvents.length})
              </p>
              <div className="flex gap-1.5 text-xs text-blue-600">
                <button onClick={() => toggleAll(publicEvents, true)}>Alle</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => toggleAll(publicEvents, false)}>Keine</button>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
              {publicEvents.map((e) => {
                const fmt = formats.get(e.id)
                const bold = fmt?.bold ?? e.isBold
                const italic = fmt?.italic ?? e.isItalic
                return (
                  <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleId(e.id)} className="rounded" />
                    <button onClick={() => toggleFormat(e.id, 'bold', bold)} className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                    <button onClick={() => toggleFormat(e.id, 'italic', italic)} className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                    <span>{fmtEventLabel(e)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-2xl mx-auto px-8 pt-6 pb-10">
        {/* Logo + Title */}
        <div className="flex items-center gap-6 mb-6 border-b border-gray-300 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://efkb.de/wp-content/uploads/2024/10/cropped-cropped-Logo_EFK-Buende2015_orange-300x157-1.png"
            alt="EFK Bünde Logo"
            style={{ height: '60px', width: 'auto', flexShrink: 0 }}
          />
          <h1 className="text-2xl font-bold">Mitarbeiter-Plan</h1>
        </div>

        {selectedEvents.length === 0 && (
          <p className="text-gray-500">Keine Veranstaltungen ausgewählt.</p>
        )}

        {years.map((year, yi) => (
          <div key={year} className={yi > 0 ? 'mt-8' : ''}>
            <h2 className="text-lg font-bold mb-2">{year}</h2>
            <table
              className="text-base border-collapse"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '10rem' }} />
                <col style={{ width: '4.5rem' }} />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left font-semibold text-gray-500" style={{ padding: '2px 1.5rem 2px 0' }}>
                    Datum
                  </th>
                  <th className="text-left font-semibold text-gray-500" style={{ padding: '2px 1.5rem 2px 0' }}>
                    Uhrzeit
                  </th>
                  <th className="text-left font-semibold text-gray-500" style={{ padding: '2px 0' }}>
                    Veranstaltung
                  </th>
                </tr>
              </thead>
              <tbody>
                {byYear[year].map((e) => {
                  const { date, time } = formatDate(e)
                  const fmt = formats.get(e.id)
                  const bold = fmt?.bold ?? e.isBold
                  const italic = fmt?.italic ?? e.isItalic
                  return (
                    <tr key={e.id} className="border-b border-gray-300">
                      <td className="text-gray-700 whitespace-nowrap" style={{ padding: '3px 1.5rem 3px 0' }}>{date}</td>
                      <td className="text-gray-700" style={{ padding: '3px 1.5rem 3px 0' }}>{time}</td>
                      <td className="text-gray-900 font-medium" style={{ padding: '3px 0', fontWeight: bold ? 'bold' : undefined, fontStyle: italic ? 'italic' : undefined }}>
                        {e.title}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  )
}
