'use client'

import { useEffect, useState, use } from 'react'
import type { ServiceDetail } from '@/types'
import { JOB_ROLE_GROUPS, JOB_ROLE_LABELS, MULTI_PERSON_ROLES } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/services/${id}`)
      .then((r) => r.json())
      .then((data) => setService(data as ServiceDetail))
      .catch(() => setError('Fehler beim Laden'))
  }, [id])

  if (error) return <p className="p-8 text-red-600">{error}</p>
  if (!service) return <p className="p-8 text-gray-400">Lädt…</p>

  const totalDuration = service.agendaItems.reduce((s, i) => s + (i.duration ?? 0), 0)

  return (
    <>
      {/* Print styles injected inline so they work without a global CSS file */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11pt; }
          @page { margin: 2cm; }
        }
        body { font-family: sans-serif; color: #111; }
      `}</style>

      {/* Print / close bar — hidden when printing */}
      <div className="no-print flex items-center justify-center gap-3 px-6 py-3 bg-gray-100 border-b border-gray-200 print:hidden">
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
      <div className="max-w-2xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-8 border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-bold">{service.title}</h1>
          <p className="text-gray-600 mt-1">
            {formatDate(service.startDate)} · {formatTime(service.startDate)} – {formatTime(service.endDate)} Uhr
          </p>
        </div>

        {/* Dienste */}
        <section className="mb-8">
          <h2 className="text-base font-bold uppercase tracking-wider text-gray-500 mb-3">Dienste</h2>
          <div className="space-y-3">
            {JOB_ROLE_GROUPS.map((group) => {
              const groupJobs = group.roles.flatMap((role) =>
                MULTI_PERSON_ROLES.includes(role) ? [] :
                service.jobs
                  .filter((j) => j.role === role && j.person)
                  .map((j) => ({ label: JOB_ROLE_LABELS[role], person: j.person! }))
              )
              if (groupJobs.length === 0) return null
              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{group.label}</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {groupJobs.map(({ label, person }, i) => (
                        <tr key={i}>
                          <td className="py-0.5 pr-4 text-gray-500 w-40">{label}</td>
                          <td className="py-0.5 font-medium">{person.firstName} {person.lastName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </section>

        {/* Agenda */}
        {service.agendaItems.length > 0 && (
          <section>
            <h2 className="text-base font-bold uppercase tracking-wider text-gray-500 mb-3">
              Ablauf{totalDuration > 0 && <span className="font-normal normal-case text-gray-400 ml-2 text-sm">({totalDuration} Min.)</span>}
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-1.5 pr-3 font-semibold text-gray-500 w-6">#</th>
                  <th className="py-1.5 pr-3 font-semibold text-gray-500">Punkt</th>
                  <th className="py-1.5 pr-3 font-semibold text-gray-500">Person</th>
                  <th className="py-1.5 font-semibold text-gray-500 text-right">Min.</th>
                </tr>
              </thead>
              <tbody>
                {service.agendaItems.map((item, i) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-3 text-gray-400 align-top">{i + 1}</td>
                    <td className="py-1.5 pr-3 align-top">
                      <div className="font-medium">{item.title}</div>
                      {item.notes && <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-600 align-top">
                      {item.person ? `${item.person.firstName} ${item.person.lastName}` : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-500 align-top">{item.duration ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  )
}
