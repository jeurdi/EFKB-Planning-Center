'use client'

import { useState } from 'react'
import type { ServiceJob, Person, JobRole } from '@/types'
import { JOB_ROLE_GROUPS, JOB_ROLE_LABELS, MULTI_PERSON_ROLES, PROGRAMM_ROLES, PROGRAMM_ROLE_LABELS } from '@/types'
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
  const [open, setOpen] = useState(true)

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

  // Programmbeitrag: find which type is currently active
  const programmJob = jobs.find((j) => PROGRAMM_ROLES.includes(j.role) && j.personId !== null)
    ?? jobs.find((j) => PROGRAMM_ROLES.includes(j.role))
  const [programmType, setProgrammType] = useState<JobRole | ''>(programmJob?.role ?? '')

  async function handleProgrammTypeChange(newType: JobRole | '') {
    const oldType = programmType
    setProgrammType(newType)
    setSaving('PROGRAMM')
    try {
      // Clear old type
      if (oldType && oldType !== newType) {
        await fetch(`/api/services/${eventId}/jobs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: oldType, personId: null }),
        })
      }
      // Re-assign person to new type if one was set
      const currentPersonId = programmJob?.personId ?? null
      if (newType && currentPersonId) {
        const res = await fetch(`/api/services/${eventId}/jobs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newType, personId: currentPersonId }),
        })
        if (res.ok) onChange(await res.json() as ServiceJob[])
      } else {
        const res = await fetch(`/api/services/${eventId}/jobs`)
        if (res.ok) onChange(await res.json() as ServiceJob[])
      }
    } finally {
      setSaving(null)
    }
  }

  async function handleProgrammPersonChange(personId: string | null) {
    if (!programmType) return
    setSaving('PROGRAMM')
    try {
      const res = await fetch(`/api/services/${eventId}/jobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: programmType, personId }),
      })
      if (res.ok) onChange(await res.json() as ServiceJob[])
    } finally {
      setSaving(null)
    }
  }

  const programmPersonId = programmType ? (jobMap[programmType] ?? null) : null
  const programmSorted = sortPersonsForRole(persons, programmType as JobRole)

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
    <div className="card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Dienste
        </h2>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && <div className="px-5 pb-5 space-y-4">
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

        {/* Programmbeitrag */}
        <hr className="mt-4 border-gray-100" />
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Programmbeitrag
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label">Art</label>
              <select
                className="select"
                value={programmType}
                onChange={(e) => handleProgrammTypeChange(e.target.value as JobRole | '')}
              >
                <option value="">— Kein Beitrag —</option>
                {PROGRAMM_ROLES.map((r) => (
                  <option key={r} value={r}>{PROGRAMM_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Person</label>
              <div className="relative">
                <PersonPicker
                  persons={programmType ? programmSorted : []}
                  matchCount={programmType ? persons.filter((p) => p.roles?.includes(programmType as JobRole)).length : 0}
                  value={programmPersonId}
                  onChange={handleProgrammPersonChange}
                  placeholder={programmType ? 'Nicht besetzt' : '— Erst Art wählen —'}
                />
                {saving === 'PROGRAMM' && (
                  <div className="absolute inset-y-0 right-8 flex items-center pr-2 pointer-events-none">
                    <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
