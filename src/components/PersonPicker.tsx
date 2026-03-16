'use client'

import { useState, useRef, useEffect } from 'react'
import type { Person } from '@/types'

interface PersonPickerProps {
  persons: Person[]
  matchCount?: number
  value: string | null
  onChange: (personId: string | null) => void
  placeholder?: string
}

export function PersonPicker({ persons, matchCount = 0, value, onChange, placeholder = 'Person auswählen…' }: PersonPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = persons.find((p) => p.id === value) ?? null

  const filtered = persons.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)
    )
  })

  // Close on click outside
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-left flex items-center justify-between gap-2 w-full"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? `${selected.firstName} ${selected.lastName}` : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              className="input text-sm"
              placeholder="Suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Options */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {/* Clear option */}
            <li>
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setSearch('') }}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                — Keine Person —
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400 italic">Keine Ergebnisse</li>
            )}
            {filtered.map((p, idx) => (
              <li key={p.id}>
                {/* Divider between matched and rest (only when not searching) */}
                {!search && matchCount > 0 && matchCount < persons.length && idx === matchCount && (
                  <div className="mx-3 my-1 border-t border-gray-200" />
                )}
                <button
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                    value === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                  }`}
                >
                  {p.lastName}, {p.firstName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
