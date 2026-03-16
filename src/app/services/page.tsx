'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CalendarEvent } from '@/types'
import { ServiceCard } from '@/components/ServiceCard'
import { CalendarView } from '@/components/CalendarView'
import { NewServiceModal } from '@/components/NewServiceModal'

type View = 'list' | 'calendar'
type Visibility = 'all' | 'public' | 'private'

export default function ServicesPageWrapper() {
  return <Suspense><ServicesPage /></Suspense>
}

function ServicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [services, setServices] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')
  const [visibility, setVisibility] = useState<Visibility>('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const param = searchParams.get('month')
    if (param) {
      const [y, m] = param.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  async function loadServices(all = false) {
    try {
      const res = await fetch(`/api/services${all ? '?all=true' : ''}`)
      if (!res.ok) throw new Error('Fehler beim Laden')
      const data = await res.json() as CalendarEvent[]
      setServices(data)
    } catch {
      setError('Dienste konnten nicht geladen werden.')
    }
  }

  async function syncCalendar() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Import fehlgeschlagen')
      }
      await loadServices(view === 'calendar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync fehlgeschlagen')
    } finally {
      setSyncing(false)
    }
  }

  // When switching to calendar view, reload all events
  async function handleViewChange(v: View) {
    setView(v)
    if (v === 'calendar' && services.length > 0) {
      await loadServices(true)
    }
  }

  useEffect(() => {
    loadServices(true).then(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeMonth(m: Date) {
    setCurrentMonth(m)
    const y = m.getFullYear()
    const mo = String(m.getMonth() + 1).padStart(2, '0')
    router.replace(`/services?month=${y}-${mo}`, { scroll: false })
  }

  function prevMonth() {
    changeMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  function nextMonth() {
    changeMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const filteredServices = services.filter((s) => {
    if (visibility === 'public') return s.isPublic
    if (visibility === 'private') return !s.isPublic
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Gottesdienste</h1>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Visibility filter */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['all', 'public', 'private'] as Visibility[]).map((v, i) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`px-3 py-1.5 text-sm transition-colors ${i > 0 ? 'border-l border-gray-200' : ''} ${
                    visibility === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {v === 'all' ? 'Alle' : v === 'public' ? 'Öffentlich' : 'Intern'}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => handleViewChange('list')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Listenansicht"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Liste
              </button>
              <button
                onClick={() => handleViewChange('calendar')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 border-l border-gray-200 transition-colors ${
                  view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Kalenderansicht"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Kalender
              </button>
            </div>

            <button onClick={() => setShowNewModal(true)} className="btn-primary">
              + Neu
            </button>

            <button
              onClick={syncCalendar}
              disabled={syncing || loading}
              className="btn-secondary"
              title="Aus Kalender importieren"
            >
              <svg
                className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Importiert…' : 'Importieren'}
            </button>

            <button
              onClick={async () => {
                setExporting(true)
                await fetch('/api/services/export-all', { method: 'POST' })
                setExporting(false)
              }}
              disabled={exporting || loading}
              className="btn-secondary"
              title="Alle in Kalender exportieren"
            >
              {exporting ? 'Exportiert…' : 'Exportieren'}
            </button>

            <button
              onClick={() => {
                const y = currentMonth.getFullYear()
                const m = String(currentMonth.getMonth() + 1).padStart(2, '0')
                window.open(`/services/print-month?month=${y}-${m}`, '_blank')
              }}
              className="btn-secondary"
              title="PDF für den aktuellen Monat"
            >
              Monats-PDF
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredServices.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Keine Termine gefunden.</p>
          <p className="text-gray-400 text-sm mt-1">Kalender importieren, um Termine zu laden.</p>
        </div>
      )}

      {/* List view */}
      {!loading && filteredServices.length > 0 && view === 'list' && (
        <div className="grid gap-3">
          {filteredServices.map((service) => (
            <Link key={service.id} href={`/services/${service.id}`}>
              <ServiceCard service={service} />
            </Link>
          ))}
        </div>
      )}

      {/* Calendar view */}
      {!loading && view === 'calendar' && (
        <CalendarView
          services={filteredServices}
          currentMonth={currentMonth}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
      )}

      {showNewModal && (
        <NewServiceModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false)
            loadServices(true)
          }}
        />
      )}
    </div>
  )
}
