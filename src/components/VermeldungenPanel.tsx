'use client'

import { useEffect, useRef, useState } from 'react'

interface VermeldungenPanelProps {
  eventId: string
  value: string | null
  onChange: (value: string | null) => void
}

export function VermeldungenPanel({ eventId, value, onChange }: VermeldungenPanelProps) {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setText(value ?? '') }, [value])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(val), 800)
  }

  async function save(val: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/services/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vermeldungen: val.trim() || null }),
      })
      if (res.ok) {
        const data = await res.json() as { vermeldungen?: string | null }
        onChange(data.vermeldungen ?? null)
      }
    } finally {
      setSaving(false)
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Vermeldungen
        </h2>
        <div className="flex items-center gap-2">
          {saving && (
            <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          )}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          <textarea
            className="input w-full resize-none"
            rows={5}
            value={text}
            onChange={handleChange}
            placeholder="Vermeldungen für diesen Gottesdienst…"
          />
        </div>
      )}
    </div>
  )
}
