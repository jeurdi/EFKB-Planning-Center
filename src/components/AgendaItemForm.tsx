'use client'

import { useState } from 'react'
import type { AgendaItem, AgendaTag, Person, ServiceJob } from '@/types'
import { AGENDA_PRESETS, AGENDA_PRESET_LABELS, PRESET_TO_JOB } from '@/types'
import { PersonPicker } from './PersonPicker'

interface AgendaItemFormProps {
  eventId: string
  item?: AgendaItem        // present when editing an existing item
  persons: Person[]
  jobs: ServiceJob[]       // current Dienste assignments for auto-fill
  onSave: (item: AgendaItem) => void
  onCancel: () => void
}

export function AgendaItemForm({ eventId, item, persons, jobs, onSave, onCancel }: AgendaItemFormProps) {
  // When editing, skip preset selection and go straight to the form
  const [preset, setPreset] = useState<AgendaTag | null>(item?.tag ?? null)
  const [title, setTitle] = useState(item?.title ?? '')
  const [personId, setPersonId] = useState<string | null>(item?.personId ?? null)
  const [duration, setDuration] = useState<string>(item?.duration?.toString() ?? '')
  const [notes, setNotes] = useState<string>(item?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePresetSelect(p: AgendaTag) {
    setPreset(p)
    setTitle(AGENDA_PRESET_LABELS[p])

    // Auto-fill person from Dienste
    const jobRole = PRESET_TO_JOB[p]
    if (jobRole) {
      const job = jobs.find((j) => j.role === jobRole)
      setPersonId(job?.personId ?? null)
    } else {
      // BEITRAG — leave empty so user can pick
      setPersonId(null)
    }
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Titel ist erforderlich.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      title: title.trim(),
      tag: preset,
      personId,
      duration: duration ? parseInt(duration) : null,
      notes: notes.trim() || null,
    }

    try {
      let res: Response
      if (item) {
        res = await fetch(`/api/services/${eventId}/agenda/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/services/${eventId}/agenda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Fehler beim Speichern')
      }
      onSave(await res.json() as AgendaItem)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
      setSaving(false)
    }
  }

  // ── Step 1: Preset selection (only when adding new item) ───────────────────
  if (!item && preset === null) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Welchen Punkt hinzufügen?</p>
        <div className="flex flex-wrap gap-2">
          {AGENDA_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePresetSelect(p)}
              className="btn-secondary text-sm py-1.5 px-3 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50"
            >
              {AGENDA_PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600"
        >
          Abbrechen
        </button>
      </div>
    )
  }

  // ── Step 2: Edit form ──────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
      {/* Header showing selected preset (for new items, allow going back) */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {item ? 'Punkt bearbeiten' : AGENDA_PRESET_LABELS[preset!]}
        </span>
        {!item && (
          <button
            type="button"
            onClick={() => { setPreset(null); setTitle(''); setPersonId(null); setDuration(''); setNotes('') }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ändern
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Title */}
      <div>
        <label className="label">Titel *</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Person */}
        <div>
          <label className="label">Verantwortliche Person</label>
          <PersonPicker
            persons={persons}
            value={personId}
            onChange={setPersonId}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="label">Dauer (Minuten)</label>
          <input
            className="input"
            type="number"
            min="1"
            max="120"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notizen (z.B. Liedernummer, Bibelvers)</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="optional"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}>
          Abbrechen
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Speichert…' : item ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  )
}
