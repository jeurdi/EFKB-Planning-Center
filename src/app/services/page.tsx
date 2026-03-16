'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CalendarEvent } from '@/types'
import { ServiceCard } from '@/components/ServiceCard'

export default function ServicesPage() {
  const [services, setServices] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadServices() {
    try {
      const res = await fetch('/api/services')
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
      await loadServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync fehlgeschlagen')
    } finally {
      setSyncing(false)
    }
  }

  async function exportAll() {
    setExporting(true)
    setExportMsg(null)
    try {
      const res = await fetch('/api/services/export-all', { method: 'POST' })
      const data = await res.json() as { exported?: number; skipped?: number; dev?: boolean; preview?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Export fehlgeschlagen')
      if (data.dev) {
        setExportMsg(`Vorschau (Dev-Modus) — ${data.exported} Ereignisse:\n\n${data.preview}`)
      } else {
        setExportMsg(`${data.exported} Ereignisse exportiert${data.skipped ? `, ${data.skipped} übersprungen` : ''}.`)
      }
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setExporting(false)
    }
  }

  // Auto-sync on mount, then load
  useEffect(() => {
    syncCalendar().then(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gottesdienste</h1>
          <p className="text-gray-500 text-sm mt-1">Nächste Termine aus dem Kalender</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={exportAll}
          disabled={exporting || loading}
          className="btn-secondary"
        >
          {exporting ? 'Exportiert…' : 'Alle exportieren'}
        </button>
        <button
          onClick={syncCalendar}
          disabled={syncing || loading}
          className="btn-secondary"
        >
          <svg
            className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {syncing ? 'Importiert…' : 'Aus Kalender importieren'}
        </button>
        </div>
      </div>

      {exportMsg && (
        <pre className="mb-6 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 whitespace-pre-wrap">
          {exportMsg}
        </pre>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
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

      {/* Services list */}
      {!loading && services.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Keine Termine gefunden.</p>
          <p className="text-gray-400 text-sm mt-1">
            Stellen Sie sicher, dass Ihr Microsoft Kalender Termine enthält.
          </p>
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="grid gap-3">
          {services.map((service) => (
            <Link key={service.id} href={`/services/${service.id}`}>
              <ServiceCard service={service} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
