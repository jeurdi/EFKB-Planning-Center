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

function PrintMonthContent() {
  const params = useSearchParams()
  const monthParam = params.get('month') ?? ''   // e.g. "2026-03"

  const [services, setServices] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Parse month param → year / month index
  const [year, monthIndex] = monthParam
    ? [parseInt(monthParam.slice(0, 4)), parseInt(monthParam.slice(5, 7)) - 1]
    : [new Date().getFullYear(), new Date().getMonth()]

  const title = `Veranstaltungen im ${MONTH_NAMES[monthIndex]} ${year}`

  useEffect(() => {
    fetch('/api/services?all=true')
      .then((r) => r.json())
      .then((data) => {
        const all = data as CalendarEvent[]
        const filtered = all.filter((e) => {
          const d = new Date(e.startDate)
          return d.getFullYear() === year && d.getMonth() === monthIndex
        })
        filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        setServices(filtered)
        setLoading(false)
      })
      .catch(() => { setError('Fehler beim Laden'); setLoading(false) })
  }, [year, monthIndex])

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
      <div className="no-print flex items-center gap-3 px-6 py-3 bg-gray-100 border-b border-gray-200">
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

        {services.length === 0 ? (
          <p className="text-gray-500">Keine Gottesdienste in diesem Monat.</p>
        ) : (
          <table className="text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th colSpan={2} className="py-1.5 pr-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Datum</th>
                <th className="py-1.5 pr-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Uhrzeit</th>
                <th className="py-1.5 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Veranstaltung</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const { weekday, day, month, time } = parseDateParts(s.startDate)
                return (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700 whitespace-nowrap" style={{paddingRight:'2px'}}>{weekday}</td>
                    <td className="py-1.5 pr-6 text-gray-700 w-20 text-right">{day} {month}</td>
                    <td className="py-1.5 pr-6 text-gray-700 w-12">{time}</td>
                    <td className="py-1.5 text-gray-900 font-medium">{s.title}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <p className="mt-10 text-sm font-bold text-center text-gray-700">
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
