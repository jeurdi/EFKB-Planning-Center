'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { JobRole } from '@/types'
import { JOB_ROLE_LABELS, JOB_ROLE_GROUPS } from '@/types'

interface MyService {
  id: string
  title: string
  startDate: string
  endDate: string
  roles: JobRole[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function RoleBadge({ role }: { role: JobRole }) {
  const group = JOB_ROLE_GROUPS.find((g) => g.roles.includes(role))
  const colors: Record<string, string> = {
    'Technik': 'bg-orange-50 text-orange-700',
    'Dienst': 'bg-blue-50 text-blue-700',
    'Gesang': 'bg-purple-50 text-purple-700',
  }
  const color = group ? (colors[group.label] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'
  const label = group ? `${group.label} · ${JOB_ROLE_LABELS[role]}` : JOB_ROLE_LABELS[role]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

export default function MyServicesPage() {
  const [services, setServices] = useState<MyService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/my-services')
      .then((r) => r.json())
      .then((data) => setServices(data as MyService[]))
      .catch(() => setError('Dienste konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meine Dienste</h1>
        <p className="text-gray-500 text-sm mt-1">Gottesdienste, bei denen du eingeteilt bist</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && services.length === 0 && !error && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Keine bevorstehenden Dienste gefunden.</p>
          <p className="text-gray-400 text-sm mt-1">
            Du wirst hier angezeigt, sobald du einem Gottesdienst zugeteilt wirst.
          </p>
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="grid gap-3">
          {services.map((service) => {
            const start = new Date(service.startDate)
            const isToday = start.toDateString() === new Date().toDateString()
            return (
              <Link key={service.id} href={`/services/${service.id}`}>
                <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0 text-center bg-blue-50 rounded-lg px-3 py-2 w-16">
                      <div className="text-xs text-blue-500 font-medium uppercase">
                        {start.toLocaleDateString('de-DE', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold text-blue-700 leading-none">
                        {start.getDate()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{service.title}</h3>
                        {isToday && (
                          <span className="rounded-full bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5">
                            Heute
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatDate(service.startDate)} · {formatTime(service.startDate)} – {formatTime(service.endDate)} Uhr
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {service.roles.map((role) => (
                          <RoleBadge key={role} role={role} />
                        ))}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
