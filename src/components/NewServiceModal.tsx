'use client'

import { useState } from 'react'
import { EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_DEFAULTS } from '@/types'
import type { EventType } from '@/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function NewServiceModal({ onClose, onCreated }: Props) {
  const [eventType, setEventType] = useState<EventType>('GOTTESDIENST')
  const [title, setTitle] = useState(EVENT_TYPE_DEFAULTS['GOTTESDIENST'].defaultTitle)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState(EVENT_TYPE_DEFAULTS['GOTTESDIENST'].defaultStartTime)
  const [endTime, setEndTime] = useState(EVENT_TYPE_DEFAULTS['GOTTESDIENST'].defaultEndTime)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTypeChange(t: EventType) {
    const d = EVENT_TYPE_DEFAULTS[t]
    setEventType(t)
    setTitle(d.defaultTitle)
    setStartTime(d.defaultStartTime)
    setEndTime(d.defaultEndTime)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, startTime, endTime, eventType }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Fehler beim Erstellen')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Neuer Termin</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Event type */}
          <div>
            <label className="label">Typ</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                    eventType === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {EVENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Titel</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="label">Datum</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Beginn</label>
              <input
                type="time"
                className="input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Ende</label>
              <input
                type="time"
                className="input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Public indicator */}
          <p className="text-xs text-gray-400">
            {EVENT_TYPE_DEFAULTS[eventType].isPublic
              ? '✓ Öffentlich sichtbar'
              : '🔒 Intern (nicht öffentlich)'}
            {EVENT_TYPE_DEFAULTS[eventType].needsPlanning
              ? ' · Planungsbereich aktiv'
              : ' · Kein Planungsbereich'}
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 mt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Erstellt…' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
