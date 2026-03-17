'use client'

import { useEffect, useState } from 'react'
import type { Person, JobRole } from '@/types'
import { JOB_ROLE_GROUPS, PROGRAMM_ROLES, PROGRAMM_ROLE_LABELS } from '@/types'

// Full labels for each role (used in checkboxes and badges)
const ROLE_FULL_LABELS: Record<JobRole, string> = {
  MODERATION: 'Moderation',
  PREDIGT: 'Predigt',
  KINDERGESCHICHTE: 'Kindergeschichte',
  GESANG_LEITER: 'Gesang Leiter',
  GESANG_MITARBEITER: 'Gesang Mitarbeiter',
  TECHNIK_LEITER: 'Technik Leiter',
  TECHNIK_MITARBEITER: 'Technik Mitarbeiter',
  PROGRAMM_GEMEINDECHOR: 'Gemeindechor',
  PROGRAMM_JUGENDCHOR: 'Jugendchor',
  PROGRAMM_KINDERCHOR: 'Kinderchor',
  PROGRAMM_ORCHESTER: 'Orchester',
  PROGRAMM_STREICHENSEMBLE: 'Streichensemble',
  PROGRAMM_SONSTIGES: 'Programm Sonstiges',
}

const ROLE_BADGE_COLORS: Record<JobRole, string> = {
  MODERATION: 'bg-blue-100 text-blue-700',
  PREDIGT: 'bg-green-100 text-green-700',
  KINDERGESCHICHTE: 'bg-yellow-100 text-yellow-700',
  GESANG_LEITER: 'bg-purple-100 text-purple-700',
  GESANG_MITARBEITER: 'bg-purple-50 text-purple-500',
  TECHNIK_LEITER: 'bg-orange-100 text-orange-700',
  TECHNIK_MITARBEITER: 'bg-orange-50 text-orange-500',
  PROGRAMM_GEMEINDECHOR: 'bg-pink-100 text-pink-700',
  PROGRAMM_JUGENDCHOR: 'bg-pink-100 text-pink-700',
  PROGRAMM_KINDERCHOR: 'bg-pink-100 text-pink-700',
  PROGRAMM_ORCHESTER: 'bg-pink-100 text-pink-700',
  PROGRAMM_STREICHENSEMBLE: 'bg-pink-100 text-pink-700',
  PROGRAMM_SONSTIGES: 'bg-pink-50 text-pink-500',
}

type FormState = { firstName: string; lastName: string; email: string; roles: JobRole[] }
const emptyForm: FormState = { firstName: '', lastName: '', email: '', roles: [] }

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/persons')
    if (res.ok) setPersons(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startAdd() {
    setEditId(null)
    setForm(emptyForm)
    setShowAdd(true)
    setError(null)
  }

  function startEdit(p: Person) {
    setShowAdd(false)
    setEditId(p.id)
    setForm({ firstName: p.firstName, lastName: p.lastName, email: p.email ?? '', roles: p.roles ?? [] })
    setError(null)
  }

  function cancelForm() {
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Vor- und Nachname sind erforderlich.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || null,
        roles: form.roles,
      }
      let res: Response
      if (editId) {
        res = await fetch(`/api/persons/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/persons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Fehler beim Speichern')
      }
      cancelForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} wirklich löschen?`)) return
    await fetch(`/api/persons/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personen</h1>
          <p className="text-gray-500 text-sm mt-1">Mitarbeitende verwalten</p>
        </div>
        <button onClick={startAdd} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Person hinzufügen
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <PersonForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
          saving={saving}
          error={error}
          title="Neue Person"
        />
      )}

      {/* List */}
      {loading ? (
        <div className="card divide-y divide-gray-100 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center px-5 py-4 gap-3">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : persons.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Noch keine Personen angelegt.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {persons.map((person) => (
            <div key={person.id}>
              {editId === person.id ? (
                <div className="px-5 py-4">
                  <PersonForm
                    form={form}
                    setForm={setForm}
                    onSubmit={handleSubmit}
                    onCancel={cancelForm}
                    saving={saving}
                    error={error}
                    title={`${person.firstName} ${person.lastName} bearbeiten`}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {person.lastName}, {person.firstName}
                    </p>
                    {person.email && (
                      <p className="text-sm text-gray-400 truncate">{person.email}</p>
                    )}
                    {/* Role badges */}
                    {person.roles && person.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {person.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE_COLORS[role]}`}
                          >
                            {ROLE_FULL_LABELS[role]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(person)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(person.id, `${person.firstName} ${person.lastName}`)}
                      className="btn-ghost px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PersonForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  error,
  title,
}: {
  form: FormState
  setForm: (f: FormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  error: string | null
  title: string
}) {
  function toggleRole(role: JobRole) {
    const has = form.roles.includes(role)
    setForm({ ...form, roles: has ? form.roles.filter((r) => r !== role) : [...form.roles, role] })
  }

  return (
    <div className="card p-5 mb-4">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name + email row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Vorname *</label>
            <input
              className="input"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Max"
              required
            />
          </div>
          <div>
            <label className="label">Nachname *</label>
            <input
              className="input"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Mustermann"
              required
            />
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="max@beispiel.de"
            />
          </div>
        </div>

        {/* Role checkboxes */}
        <div>
          <label className="label mb-2">Standard-Aufgaben</label>
          <div className="flex flex-wrap gap-6">
            {JOB_ROLE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.roles.map((role) => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{ROLE_FULL_LABELS[role]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Programmbeitrag
              </p>
              <div className="space-y-1">
                {PROGRAMM_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{PROGRAMM_ROLE_LABELS[role]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
