'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CalendarEvent, ServiceJob, JobRole } from '@/types'
import { PROGRAMM_ROLES, PROGRAMM_ROLE_LABELS } from '@/types'

type EventWithJobs = CalendarEvent & { jobs: ServiceJob[] }

const ROLE_LABELS: Record<string, string> = {
  PREDIGT:          'Predigt',
  MODERATION:       'Moderation',
  KINDERGESCHICHTE: 'Kindergeschichte',
  GESAMT:           'Gesamt',
}

const GESAMT_COLS: { label: string; role: JobRole }[] = [
  { label: 'Predigt',          role: 'PREDIGT' },
  { label: 'Moderation',       role: 'MODERATION' },
  { label: 'Kindergeschichte', role: 'KINDERGESCHICHTE' },
  { label: 'Gesang',           role: 'GESANG_LEITER' },
  { label: 'Technik',          role: 'TECHNIK_LEITER' },
]

const PRESETS = [
  { label: '3 Monate',  months: 3 },
  { label: '6 Monate',  months: 6 },
  { label: '12 Monate', months: 12 },
]

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.getHours() === 0 && d.getMinutes() === 0
    ? ''
    : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function personName(jobs: ServiceJob[], role: JobRole) {
  const p = jobs.find((j) => j.role === role)?.person
  return p ? `${p.firstName} ${p.lastName}` : '—'
}

function personNameShort(jobs: ServiceJob[], role: JobRole) {
  const p = jobs.find((j) => j.role === role)?.person
  if (!p) return '—'
  return `${p.firstName} ${p.lastName.charAt(0).toUpperCase()}.`
}

function programmBeitrag(jobs: ServiceJob[]) {
  const job = jobs.find((j) => PROGRAMM_ROLES.includes(j.role) && j.personId !== null)
    ?? jobs.find((j) => PROGRAMM_ROLES.includes(j.role))
  if (!job) return '—'
  if (job.role === 'PROGRAMM_SONSTIGES' && job.person) {
    const initial = job.person.lastName.charAt(0).toUpperCase()
    return `Sonstiges – ${job.person.firstName} ${initial}.`
  }
  return PROGRAMM_ROLE_LABELS[job.role] ?? job.role
}

function PrintContent() {
  const params = useSearchParams()
  const role = (params.get('role') ?? 'GESAMT').toUpperCase()

  const now = new Date()
  const [allEvents, setAllEvents] = useState<EventWithJobs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState(toInputDate(now))
  const [to, setTo] = useState(toInputDate(new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set(['PREDIGT', 'MODERATION', 'KINDERGESCHICHTE']))

  function toggleCol(role: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      next.has(role) ? next.delete(role) : next.add(role)
      return next
    })
  }

  useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((data: unknown) => { setAllEvents(data as EventWithJobs[]); setLoading(false) })
      .catch(() => { setError('Fehler beim Laden'); setLoading(false) })
  }, [])

  function applyPreset(months: number) {
    const start = new Date()
    setFrom(toInputDate(start))
    setTo(toInputDate(new Date(start.getFullYear(), start.getMonth() + months, start.getDate())))
  }

  const fromDate = new Date(from)
  const toDate = new Date(to + 'T23:59:59')

  const events = allEvents.filter((e) => {
    const d = new Date(e.startDate)
    return d >= fromDate && d <= toDate && e.needsPlanning
  })

  const title = ROLE_LABELS[role] ?? role

  if (loading) return <p className="p-8 text-gray-400">Lädt…</p>
  if (error)   return <p className="p-8 text-red-600">{error}</p>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          body { font-size: 11pt; }
          @page { margin: 1cm 1.5cm; }
        }
        body { font-family: sans-serif; color: #111; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print bg-gray-100 border-b border-gray-200">
      <div className="flex items-center justify-center gap-3 flex-wrap px-6 py-3">
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

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {PRESETS.map((p) => (
          <button
            key={p.months}
            onClick={() => applyPreset(p.months)}
            className="px-3 py-1.5 text-sm border border-gray-300 bg-white rounded-md hover:bg-gray-50 text-gray-700"
          >
            {p.label}
          </button>
        ))}

        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Monat
          <input
            type="month"
            onChange={(e) => {
              if (!e.target.value) return
              const [y, m] = e.target.value.split('-').map(Number)
              setFrom(toInputDate(new Date(y, m - 1, 1)))
              setTo(toInputDate(new Date(y, m, 0)))
            }}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
          />
        </label>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Von
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Bis
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
          />
        </label>

        <span className="text-sm text-gray-500 ml-1">{events.length} Einträge</span>
      </div>

      {role === 'GESAMT' && (
        <div className="flex items-center justify-center gap-4 flex-wrap px-6 py-2 border-t border-gray-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Spalten</span>
          {[...GESAMT_COLS, { label: 'Programmbeitrag', role: 'PROGRAMMBEITRAG' }].map((c) => (
            <label key={c.role} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!hiddenCols.has(c.role)}
                onChange={() => toggleCol(c.role)}
                className="rounded border-gray-300 text-blue-600"
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
      </div>

      {/* Document */}
      <div className="max-w-7xl mx-auto px-8 pt-6 pb-10">
        {/* Logo + Title */}
        <div className="flex items-center gap-6 mb-6 border-b border-gray-300 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://efkb.de/wp-content/uploads/2024/10/cropped-cropped-Logo_EFK-Buende2015_orange-300x157-1.png"
            alt="EFK Bünde Logo"
            style={{ height: '60px', width: 'auto', flexShrink: 0 }}
          />
          <h1 className="text-2xl font-bold">Dienstplan — {title}</h1>
        </div>

        {events.length === 0 ? (
          <p className="text-gray-500">Keine Einträge für den gewählten Zeitraum.</p>
        ) : role === 'GESAMT' ? (
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr style={{ borderBottom: '2px solid #9ca3af' }}>
                <th className="text-left font-semibold text-gray-500 pb-1 pr-6 whitespace-nowrap">Datum</th>
                <th className="text-left font-semibold text-gray-500 pb-1 pr-6 whitespace-nowrap">Zeit</th>
                <th className="text-left font-semibold text-gray-500 pb-1 pr-6 whitespace-nowrap">Veranstaltung</th>
                {GESAMT_COLS.filter((c) => !hiddenCols.has(c.role)).map((c) => (
                  <th key={c.role} className="text-left font-semibold text-gray-500 pb-1 pr-4 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                {!hiddenCols.has('PROGRAMMBEITRAG') && (
                  <th className="text-left font-semibold text-gray-500 pb-1 whitespace-nowrap">Programmbeitrag</th>
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td className="py-1.5 pr-6 text-gray-900 font-medium whitespace-nowrap">{formatDate(e.startDate)}</td>
                  <td className="py-1.5 pr-6 text-gray-500 whitespace-nowrap">{formatTime(e.startDate)}</td>
                  <td className="py-1.5 pr-6 text-gray-700 whitespace-nowrap">{e.title}</td>
                  {GESAMT_COLS.filter((c) => !hiddenCols.has(c.role)).map((c) => (
                    <td key={c.role} className="py-1.5 pr-4 text-gray-700 whitespace-nowrap">
                      {personNameShort(e.jobs, c.role)}
                    </td>
                  ))}
                  {!hiddenCols.has('PROGRAMMBEITRAG') && (
                    <td className="py-1.5 text-gray-700 whitespace-nowrap">{programmBeitrag(e.jobs)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr style={{ borderBottom: '2px solid #9ca3af' }}>
                <th className="text-left font-semibold text-gray-500 pb-1 pr-6 whitespace-nowrap">Datum</th>
                <th className="text-left font-semibold text-gray-500 pb-1 pr-6 whitespace-nowrap">Zeit</th>
                <th className="text-left font-semibold text-gray-500 pb-1 pr-6">Veranstaltung</th>
                <th className="text-left font-semibold text-gray-500 pb-1">{title}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td className="py-1.5 pr-6 text-gray-900 font-medium whitespace-nowrap">{formatDate(e.startDate)}</td>
                  <td className="py-1.5 pr-6 text-gray-500 whitespace-nowrap">{formatTime(e.startDate)}</td>
                  <td className="py-1.5 pr-6 text-gray-700">{e.title}</td>
                  <td className="py-1.5 text-gray-900 font-medium">{personName(e.jobs, role as JobRole)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export default function SchedulePrintPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-400">Lädt…</p>}>
      <PrintContent />
    </Suspense>
  )
}
