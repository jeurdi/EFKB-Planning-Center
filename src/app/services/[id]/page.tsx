'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ServiceDetail, Person, AgendaItem } from '@/types'
import type { Invitation } from '@/lib/db'
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
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadInvitations() {
    const res = await fetch(`/api/services/${id}/invitations`)
    if (res.ok) setInvitations(await res.json() as Invitation[])
  }

  useEffect(() => {
    async function load() {
      try {
        const [serviceRes, personsRes] = await Promise.all([
          fetch(`/api/services/${id}`),
          fetch('/api/persons'),
        ])
        if (!serviceRes.ok) throw new Error('Service nicht gefunden')
        const [serviceData, personsData] = await Promise.all([
          serviceRes.json() as Promise<ServiceDetail>,
          personsRes.json() as Promise<Person[]>,
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
    loadInvitations()
  }, [id])

  async function handleExport() {
    setExporting(true)
    setActionMsg(null)
    try {
      const res = await fetch(`/api/services/${id}/export`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; dev?: boolean; preview?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Export fehlgeschlagen')
      setActionMsg(data.dev ? `Vorschau (Dev):\n${data.preview}` : 'Kalender aktualisiert.')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setExporting(false)
    }
  }

  async function handleInvite() {
    setInviting(true)
    setActionMsg(null)
    try {
      const res = await fetch(`/api/services/${id}/invite`, { method: 'POST' })
      const data = await res.json() as { sent?: number; failed?: number; dev?: boolean; preview?: Array<{ name: string; to: string | null; roles: string[] }>; count?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Fehler beim Senden')
      if (data.dev) {
        const lines = data.preview!.map((p) => `${p.name} <${p.to}> — ${p.roles.join(', ')}`).join('\n')
        setActionMsg(`Vorschau (Dev) — ${data.count} Einladungen:\n${lines}`)
      } else {
        setActionMsg(`${data.sent} Einladung(en) gesendet${data.failed ? `, ${data.failed} fehlgeschlagen` : ''}.`)
      }
      await loadInvitations()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Fehler beim Senden')
    } finally {
      setInviting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Gottesdienst wirklich löschen?')) return
    await fetch(`/api/services/${id}`, { method: 'DELETE' })
    router.push('/services')
  }

  function openEdit() {
    if (!service) return
    const s = new Date(service.startDate)
    const e = new Date(service.endDate)
    const pad = (n: number) => String(n).padStart(2, '0')
    setEditTitle(service.title)
    setEditDate(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`)
    setEditStart(`${pad(s.getHours())}:${pad(s.getMinutes())}`)
    setEditEnd(`${pad(e.getHours())}:${pad(e.getMinutes())}`)
    setEditing(true)
  }

  async function handleSave() {
    if (!service) return
    setSaving(true)
    const startDate = new Date(`${editDate}T${editStart}:00`).toISOString()
    const endDate   = new Date(`${editDate}T${editEnd}:00`).toISOString()
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, startDate, endDate }),
    })
    if (res.ok) {
      const updated = await res.json() as ServiceDetail
      setService({ ...service, ...updated })
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleToggle(field: 'isPublic' | 'needsPlanning') {
    if (!service) return
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !service[field] }),
    })
    if (res.ok) {
      const updated = await res.json() as ServiceDetail
      setService({ ...service, ...updated })
    }
  }

  function handleJobChange(jobs: ServiceDetail['jobs']) {
    if (!service) return
    setService({ ...service, jobs })
  }

  function handleAgendaChange(agendaItems: AgendaItem[]) {
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
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Alle Gottesdienste
        </button>
        <div className="flex items-start justify-between gap-4">
          {editing ? (
            <div className="flex flex-col gap-2 flex-1">
              <input
                className="input text-lg font-bold"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" className="input" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                <input type="time" className="input" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                <span className="text-gray-400 text-sm">–</span>
                <input type="time" className="input" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Speichert…' : 'Speichern'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Abbrechen</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
                <button onClick={openEdit} className="text-gray-400 hover:text-gray-600" title="Bearbeiten">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
                {/* Status badges */}
                <button
                  onClick={() => handleToggle('isPublic')}
                  title={service.isPublic ? 'Klicken um intern zu setzen' : 'Klicken um zu veröffentlichen'}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                    service.isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {service.isPublic ? '✓ Öffentlich' : '🔒 Intern'}
                </button>
                <button
                  onClick={() => handleToggle('needsPlanning')}
                  title={service.needsPlanning ? 'Planung deaktivieren' : 'Planung aktivieren'}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                    service.needsPlanning ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {service.needsPlanning ? '✓ Planung aktiv' : '+ Planung aktivieren'}
                </button>
              </div>
              <p className="text-gray-500 mt-1">
                {formatDate(service.startDate)} · {formatTime(service.startDate)} – {formatTime(service.endDate)} Uhr
              </p>
            </div>
          )}
          <button onClick={handleDelete} className="btn-danger shrink-0">
            Löschen
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => window.open(`/services/${id}/print`, '_blank')}
            className="btn-secondary"
          >
            PDF
          </button>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary">
            {exporting ? 'Exportiert…' : 'In Kalender exportieren'}
          </button>
          <button onClick={handleInvite} disabled={inviting} className="btn-secondary">
            {inviting ? 'Sendet…' : 'Einladungen senden'}
          </button>
        </div>
        {actionMsg && (
          <pre className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 whitespace-pre-wrap">
            {actionMsg}
          </pre>
        )}
      </div>

      {/* Planning sections — only shown when needsPlanning is active */}
      {service.needsPlanning ? (
        <>
          {/* Jobs */}
          <JobsPanel
            eventId={id}
            jobs={service.jobs}
            persons={persons}
            onChange={handleJobChange}
          />

          {/* Invitation status */}
          {invitations.length > 0 && (
            <div className="mt-6 card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Einladungsstatus</h2>
              <div className="divide-y divide-gray-100">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-800">
                      {inv.person?.firstName} {inv.person?.lastName}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      inv.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      inv.status === 'declined' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {inv.status === 'accepted' ? '✓ Zugesagt' :
                       inv.status === 'declined' ? '✗ Abgesagt' :
                       '· Ausstehend'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        </>
      ) : (
        <div className="card p-8 text-center text-gray-400 mt-2">
          <p className="text-sm">Kein Planungsbereich für diesen Termin.</p>
          <button
            onClick={() => handleToggle('needsPlanning')}
            className="btn-secondary mt-3"
          >
            + Planung aktivieren
          </button>
        </div>
      )}
    </div>
  )
}
