'use client'

import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/types'

const SHORT_MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

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

export default function PrintInternalPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('planungstool_internal_plan')
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const idSet = new Set(ids)

    fetch('/api/services?all=true')
      .then((r) => r.json())
      .then((data: unknown) => {
        const filtered = (data as CalendarEvent[])
          .filter((e) => idSet.has(e.id))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        setEvents(filtered)
        setLoading(false)
      })
      .catch(() => {
        setError('Fehler beim Laden')
        setLoading(false)
      })
  }, [])

  // Group by year
  const byYear: Record<number, CalendarEvent[]> = {}
  for (const e of events) {
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
      <div className="no-print flex items-center gap-3 px-6 py-4 bg-gray-100 border-b border-gray-200">
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
        <span className="text-sm text-gray-500">{events.length} Veranstaltungen</span>
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

        {events.length === 0 && (
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
                  <th
                    className="text-left font-semibold text-gray-500"
                    style={{ padding: '2px 1.5rem 2px 0' }}
                  >
                    Datum
                  </th>
                  <th
                    className="text-left font-semibold text-gray-500"
                    style={{ padding: '2px 1.5rem 2px 0' }}
                  >
                    Uhrzeit
                  </th>
                  <th
                    className="text-left font-semibold text-gray-500"
                    style={{ padding: '2px 0' }}
                  >
                    Veranstaltung
                  </th>
                </tr>
              </thead>
              <tbody>
                {byYear[year].map((e) => {
                  const { date, time } = formatDate(e)
                  return (
                    <tr key={e.id} className="border-b border-gray-300">
                      <td
                        className="text-gray-700 whitespace-nowrap"
                        style={{ padding: '3px 1.5rem 3px 0' }}
                      >
                        {date}
                      </td>
                      <td
                        className="text-gray-700"
                        style={{ padding: '3px 1.5rem 3px 0' }}
                      >
                        {time}
                      </td>
                      <td
                        className="text-gray-900 font-medium"
                        style={{ padding: '3px 0' }}
                      >
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
