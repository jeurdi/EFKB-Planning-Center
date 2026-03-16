'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ServiceDetail, Person, AgendaItem } from '@/types'
import { JobsPanel } from '@/components/JobsPanel'
import { AgendaBuilder } from '@/components/AgendaBuilder'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [service, setService] = useState<ServiceDetail | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [serviceRes, personsRes] = await Promise.all([
          fetch(`/api/services/${id}`),
          fetch('/api/persons'),
        ])
        if (!serviceRes.ok) throw new Error('Service nicht gefunden')
        const [serviceData, personsData] = await Promise.all([
          serviceRes.json(),
          personsRes.json(),
        ])
        setService(serviceData)
        setPersons(personsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleExport() {
    setExporting(true)
    setExportMsg(null)
    try {
      const res = await fetch(`/api/services/${id}/export`, { method: 'POST' })
      const data = await res.json() as { error?: string; dev?: boolean; preview?: string }
      if (!res.ok) throw new Error(data.error ?? 'Export fehlgeschlagen')
      if (data.dev) {
        setExportMsg(`Vorschau (Dev-Modus):\n${data.preview}`)
      } else {
        setExportMsg('Erfolgreich in Kalender exportiert.')
      }
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Gottesdienst wirklich löschen?')) return
    await fetch(`/api/services/${id}`, { method: 'DELETE' })
    router.push('/services')
  }

  async function handleJobChange(jobs: ServiceDetail['jobs']) {
    if (!service) return
    setService({ ...service, jobs })
  }

  async function handleAgendaChange(agendaItems: AgendaItem[]) {
    if (!service) return
    setService({ ...service, agendaItems })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-8" />
        <div className="card p-6 mb-6">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <p className="text-red-600">{error ?? 'Service nicht gefunden'}</p>
          <Link href="/services" className="btn-secondary mt-4 inline-flex">
            Zurück
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/services" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Alle Gottesdienste
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
            <p className="text-gray-500 mt-1">
              {formatDate(service.startDate)} · {formatTime(service.startDate)} – {formatTime(service.endDate)} Uhr
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.open(`/services/${id}/print`, '_blank')}
              className="btn-secondary"
            >
              PDF
            </button>
            <button onClick={handleExport} disabled={exporting} className="btn-secondary">
              {exporting ? 'Exportiert…' : 'In Kalender exportieren'}
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Löschen
            </button>
          </div>
        </div>
        {exportMsg && (
          <pre className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 whitespace-pre-wrap">
            {exportMsg}
          </pre>
        )}
      </div>

      {/* Jobs */}
      <JobsPanel
        eventId={id}
        jobs={service.jobs}
        persons={persons}
        onChange={handleJobChange}
      />

      {/* Agenda */}
      <div className="mt-6">
        <AgendaBuilder
          eventId={id}
          items={service.agendaItems}
          persons={persons}
          jobs={service.jobs}
          onChange={handleAgendaChange}
        />
      </div>
    </div>
  )
}
