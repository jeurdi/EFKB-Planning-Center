'use client'

import { useState } from 'react'
import type { ServiceJob, Person, JobRole } from '@/types'
import { JOB_ROLE_GROUPS, JOB_ROLE_LABELS, MULTI_PERSON_ROLES } from '@/types'
import { PersonPicker } from './PersonPicker'
import { MultiPersonPicker } from './MultiPersonPicker'

function sortPersonsForRole(persons: Person[], role: JobRole): Person[] {
  const byLastName = (a: Person, b: Person) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  const matching = persons.filter((p) => p.roles?.includes(role)).sort(byLastName)
  const rest     = persons.filter((p) => !p.roles?.includes(role)).sort(byLastName)
  return [...matching, ...rest]
}

interface JobsPanelProps {
  eventId: string
  jobs: ServiceJob[]
  persons: Person[]
  onChange: (jobs: ServiceJob[]) => void
}

export function JobsPanel({ eventId, jobs, persons, onChange }: JobsPanelProps) {
  const [saving, setSaving] = useState<string | null>(null)

  // Single-person roles: role → personId
  const jobMap: Record<string, string | null> = {}
  // Multi-person roles: role → personId[]
  const jobMultiMap: Record<string, string[]> = {}

  for (const job of jobs) {
    if (MULTI_PERSON_ROLES.includes(job.role)) {
      if (!jobMultiMap[job.role]) jobMultiMap[job.role] = []
      if (job.personId) jobMultiMap[job.role].push(job.personId)
    } else {
      jobMap[job.role] = job.personId
    }
  }

  async function handleChange(role: string, personId: string | null) {
    setSaving(role)
    try {
      const res = await fetch(`/api/services/${eventId}/jobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, personId }),
      })
      if (res.ok) onChange(await res.json())
    } finally {
      setSaving(null)
    }
  }

  async function handleMultiChange(role: string, personIds: string[]) {
    setSaving(role)
    try {
      const res = await fetch(`/api/services/${eventId}/jobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, personIds }),
      })
      if (res.ok) onChange(await res.json())
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Dienste
      </h2>

      <div className="space-y-4">
        {JOB_ROLE_GROUPS.map((group, groupIdx) => (
          <div key={group.label}>
            {groupIdx > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {group.label}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.roles.map((role) => {
                const isMulti = MULTI_PERSON_ROLES.includes(role)
                const sorted = sortPersonsForRole(persons, role)
                const matchCount = persons.filter((p) => p.roles?.includes(role)).length
                return (
                  <div key={role}>
                    <label className="label">{JOB_ROLE_LABELS[role]}</label>
                    <div className="relative">
                      {isMulti ? (
                        <MultiPersonPicker
                          persons={sorted}
                          matchCount={matchCount}
                          values={jobMultiMap[role] ?? []}
                          onChange={(personIds) => handleMultiChange(role, personIds)}
                          placeholder="Nicht besetzt"
                        />
                      ) : (
                        <PersonPicker
                          persons={sorted}
                          matchCount={matchCount}
                          value={jobMap[role] ?? null}
                          onChange={(personId) => handleChange(role, personId)}
                          placeholder="Nicht besetzt"
                        />
                      )}
                      {saving === role && (
                        <div className="absolute inset-y-0 right-8 flex items-center pr-2 pointer-events-none">
                          <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {groupIdx < JOB_ROLE_GROUPS.length - 1 && (
              <hr className="mt-4 border-gray-100" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
