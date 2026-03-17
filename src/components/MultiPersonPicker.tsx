'use client'

import { useState, useRef, useEffect } from 'react'
import type { Person } from '@/types'

interface MultiPersonPickerProps {
  persons: Person[]
  matchCount?: number
  values: string[]
  onChange: (personIds: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function MultiPersonPicker({ persons, matchCount = 0, values, onChange, placeholder = 'Personen auswählen…', disabled = false }: MultiPersonPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = persons.filter((p) => values.includes(p.id))
  const filtered = persons.filter((p) => {
    const q = search.toLowerCase()
    return p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q)
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`input text-left flex items-center justify-between gap-2 w-full min-h-[38px] ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
      >
        <span className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            selected.map((p) => (
              <span key={p.id} className="inline-flex items-center bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {p.firstName} {p.lastName}
              </span>
            ))
          )}
        </span>
        <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              className="input text-sm"
              placeholder="Suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400 italic">Keine Ergebnisse</li>
            )}
            {filtered.map((p, idx) => {
              const checked = values.includes(p.id)
              return (
                <li key={p.id}>
                  {!search && matchCount > 0 && matchCount < persons.length && idx === matchCount && (
                    <div className="mx-3 my-1 border-t border-gray-200" />
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                      checked ? 'bg-gray-50 text-gray-900' : 'text-gray-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center ${
                      checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {checked && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {p.lastName}, {p.firstName}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
