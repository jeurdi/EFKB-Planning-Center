'use client'

import { useEffect, useState } from 'react'
import type { CalendarEvent, ServiceJob, JobRole } from '@/types'

type EventWithJobs = CalendarEvent & { jobs: ServiceJob[] }
type ActiveTab = JobRole | 'GESAMT'

const TABS: { label: string; id: ActiveTab }[] = [
  { label: 'Predigt',          id: 'PREDIGT' },
  { label: 'Moderation',       id: 'MODERATION' },
  { label: 'Kindergeschichte', id: 'KINDERGESCHICHTE' },
  { label: 'Gesang Leiter',    id: 'GESANG_LEITER' },
  { label: 'Technik Leiter',   id: 'TECHNIK_LEITER' },
  { label: 'Gesamt',           id: 'GESAMT' },
]

const GESAMT_COLS: { label: string; role: JobRole }[] = [
  { label: 'Predigt',           role: 'PREDIGT' },
  { label: 'Moderation',        role: 'MODERATION' },
  { label: 'Kindergeschichte',  role: 'KINDERGESCHICHTE' },
  { label: 'Gesang Leiter',     role: 'GESANG_LEITER' },
  { label: 'Technik Leiter',    role: 'TECHNIK_LEITER' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function personName(jobs: ServiceJob[], role: JobRole) {
  const person = jobs.find((j) => j.role === role)?.person
  return person ? `${person.firstName} ${person.lastName}` : '—'
}

export default function SchedulePage() {
  const [events, setEvents] = useState<EventWithJobs[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('PREDIGT')

  useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((data) => { setEvents(data as EventWithJobs[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const singleRows = events
    .map((e) => {
      const job = e.jobs.find((j) => j.role === (activeTab as JobRole))
      if (!job?.person) return null
      return { event: e, person: job.person }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dienstplan — Übersicht</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ label, id }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Lädt…</p>
      ) : activeTab === 'GESAMT' ? (
        /* ── Gesamt table ── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap text-xs uppercase tracking-wider">Datum</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap text-xs uppercase tracking-wider">Zeit</th>
                  {GESAMT_COLS.map((c) => (
                    <th key={c.role} className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap text-xs uppercase tracking-wider">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatDate(e.startDate)}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatTime(e.startDate)}</td>
                    {GESAMT_COLS.map((c) => (
                      <td key={c.role} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {personName(e.jobs, c.role)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : singleRows.length === 0 ? (
        <p className="text-gray-500">Keine Einträge gefunden.</p>
      ) : (
        /* ── Single-role list ── */
        <div className="card divide-y divide-gray-100">
          {singleRows.map(({ event, person }) => (
            <div key={event.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(event.startDate)}
                </span>
                <span className="text-xs text-gray-400 ml-2">{formatTime(event.startDate)}</span>
                <span className="ml-3 text-xs text-gray-500">{event.title}</span>
              </div>
              <span className="text-sm text-gray-800">
                {person.firstName} {person.lastName}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
