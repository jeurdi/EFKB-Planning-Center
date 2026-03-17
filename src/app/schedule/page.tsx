'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

// Short date label for matrix column headers: "15.03."
function shortDate(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${mon}.`
}

type Person = { id: string; firstName: string; lastName: string }

// Build role matrix for any single role tab
function buildMatrix(events: EventWithJobs[], role: JobRole) {
  const now = new Date()
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())

  const cols = events.filter((e) => {
    const d = new Date(e.startDate)
    return d >= now && d <= sixMonths && e.jobs.some((j) => j.role === role)
  })

  const personMap = new Map<string, Person>()
  for (const e of cols) {
    for (const j of e.jobs) {
      if (j.role === role && j.person) {
        personMap.set(j.person.id, j.person as Person)
      }
    }
  }
  const persons = Array.from(personMap.values()).sort((a, b) =>
    a.lastName.localeCompare(b.lastName)
  )

  return { cols, persons }
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

  const router = useRouter()

  const { cols: matrixCols, persons: matrixPersons } =
    activeTab !== 'GESAMT' ? buildMatrix(events, activeTab as JobRole) : { cols: [], persons: [] }

  const firstOfDate = new Set<string>()
  const seenDates = new Set<string>()
  for (const e of matrixCols) {
    const d = shortDate(e.startDate)
    if (!seenDates.has(d)) { seenDates.add(d); firstOfDate.add(e.id) }
  }

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
                {events.filter((e) => e.needsPlanning && new Date(e.startDate) >= new Date()).map((e) => (
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
      ) : matrixPersons.length === 0 ? (
        <p className="text-gray-500">Keine Einträge in den nächsten 6 Monaten.</p>
      ) : (
        /* ── Role matrix (all non-Gesamt tabs) ── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #6b7280' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap sticky left-0 bg-white z-10" style={{ borderRight: '1px solid #6b7280' }}>
                    Name
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap text-center sticky bg-white" style={{ left: '10rem', borderRight: '1px solid #6b7280' }}>
                    Anz.
                  </th>
                  {matrixCols.map((e) => (
                    <th
                      key={e.id}
                      className="px-2 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap text-center"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '5rem', verticalAlign: 'bottom', borderRight: '1px solid #6b7280' }}
                      title={formatDate(e.startDate)}
                    >
                      {firstOfDate.has(e.id) ? shortDate(e.startDate) : `↳ ${formatTime(e.startDate)}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixPersons.map((p) => {
                  const role = activeTab as JobRole
                  const count = matrixCols.filter((e) =>
                    e.jobs.some((j) => j.role === role && j.person?.id === p.id)
                  ).length
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #6b7280' }}>
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white" style={{ borderRight: '1px solid #6b7280' }}>
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-blue-600" style={{ borderRight: '1px solid #6b7280' }}>
                        {count}
                      </td>
                      {matrixCols.map((e) => {
                        const assigned = e.jobs.some(
                          (j) => j.role === role && j.person?.id === p.id
                        )
                        return (
                          <td key={e.id} className="px-2 py-2 text-center" style={{ borderRight: '1px solid #6b7280' }}>
                            {assigned ? (
                              <button onClick={() => router.push(`/services/${e.id}`)} title={formatDate(e.startDate)}>
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 hover:bg-blue-700 transition-colors" />
                              </button>
                            ) : (
                              <span className="text-gray-300">·</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
