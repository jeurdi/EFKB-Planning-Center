'use client'

import { useEffect, useState } from 'react'

const SHORT_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

interface PublicEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  moderator: string
}

function formatEvent(e: PublicEvent) {
  const d = new Date(e.startDate)
  const isAllDay = d.getHours() === 0 && d.getMinutes() === 0
  return {
    weekday: SHORT_DAYS[d.getDay()],
    date: `${String(d.getDate()).padStart(2, '0')}. ${SHORT_MONTHS[d.getMonth()]}`,
    time: isAllDay ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

export default function PublicPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/public')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicEvent[]) => { setEvents(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-8 pt-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://efkb.de/wp-content/uploads/2024/10/cropped-cropped-Logo_EFK-Buende2015_orange-300x157-1.png"
          alt="EFK Bünde Logo"
          style={{ height: '56px', width: 'auto', flexShrink: 0 }}
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gottesdienste</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nächste 2 Monate · Live-Stream: youtube.com/c/EFK-Bünde</p>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Lädt…</p>}
      {error && <p className="text-red-600 text-sm">Fehler beim Laden der Termine.</p>}

      {!loading && !error && events.length === 0 && (
        <p className="text-gray-500">Aktuell sind keine Termine mit Moderation eingetragen.</p>
      )}

      {!loading && !error && events.length > 0 && (
        <table className="border-collapse w-full text-base" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '2.5rem' }} />
            <col style={{ width: '7rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col />
            <col style={{ width: '9rem' }} />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-gray-400">
              <th className="text-left font-semibold text-gray-500 text-sm" style={{ padding: '2px 0.5rem 4px 0' }}></th>
              <th className="text-left font-semibold text-gray-500 text-sm" style={{ padding: '2px 1.5rem 4px 0' }}>Datum</th>
              <th className="text-left font-semibold text-gray-500 text-sm" style={{ padding: '2px 1.5rem 4px 0' }}>Uhrzeit</th>
              <th className="text-left font-semibold text-gray-500 text-sm" style={{ padding: '2px 0 4px' }}>Veranstaltung</th>
              <th className="text-left font-semibold text-gray-500 text-sm" style={{ padding: '2px 0 4px 1rem' }}>Moderation</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const { weekday, date, time } = formatEvent(e)
              return (
                <tr key={e.id} className="border-b border-gray-200">
                  <td className="text-gray-500 text-sm" style={{ padding: '5px 0.5rem 5px 0' }}>{weekday}</td>
                  <td className="text-gray-700 whitespace-nowrap" style={{ padding: '5px 1.5rem 5px 0' }}>{date}</td>
                  <td className="text-gray-700" style={{ padding: '5px 1.5rem 5px 0' }}>{time}</td>
                  <td className="text-gray-900 font-medium" style={{ padding: '5px 0' }}>{e.title}</td>
                  <td className="text-gray-600 text-sm" style={{ padding: '5px 0 5px 1rem' }}>{e.moderator}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
