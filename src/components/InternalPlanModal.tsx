'use client'

import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/types'

const SHORT_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

function formatEvent(e: CalendarEvent) {
  const start = new Date(e.startDate)
  const end = new Date(new Date(e.endDate).getTime() - 1)
  const startStr = `${SHORT_DAYS[start.getDay()]} ${fmtDate(start)}`
  const endStr = fmtDate(end) !== fmtDate(start)
    ? ` – ${SHORT_DAYS[end.getDay()]} ${fmtDate(end)}`
    : ''
  return `${startStr}${endStr} — ${e.title}`
}

interface Props {
  onClose: () => void
}

export function InternalPlanModal({ onClose }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/services?all=true')
      .then((r) => r.json())
      .then((data: unknown) => {
        const now = new Date()
        const future = (data as CalendarEvent[])
          .filter((e) => new Date(e.startDate) >= now)
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        setEvents(future)
        // Pre-check all internal events
        setSelectedIds(new Set(future.filter((e) => !e.isPublic).map((e) => e.id)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const internalEvents = events.filter((e) => !e.isPublic)
  const publicEvents = events.filter((e) => e.isPublic)

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(evts: CalendarEvent[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      evts.forEach((e) => (checked ? next.add(e.id) : next.delete(e.id)))
      return next
    })
  }

  function openPdf() {
    localStorage.setItem('planungstool_internal_plan', JSON.stringify([...selectedIds]))
    window.open('/services/print-internal', '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Mitarbeiter-Plan erstellen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-6 text-gray-400">Lädt…</div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            {/* Internal events */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Interne Veranstaltungen ({internalEvents.length})
                </h3>
                <div className="flex gap-2 text-xs text-blue-600">
                  <button onClick={() => toggleAll(internalEvents, true)}>Alle</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => toggleAll(internalEvents, false)}>Keine</button>
                </div>
              </div>
              <div className="space-y-0.5">
                {internalEvents.length === 0 && (
                  <p className="text-sm text-gray-400">Keine internen Veranstaltungen.</p>
                )}
                {internalEvents.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(e.id)}
                      onChange={() => toggle(e.id)}
                      className="rounded"
                    />
                    {formatEvent(e)}
                  </label>
                ))}
              </div>
            </section>

            {/* Public events */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Öffentliche Veranstaltungen ({publicEvents.length})
                </h3>
                <div className="flex gap-2 text-xs text-blue-600">
                  <button onClick={() => toggleAll(publicEvents, true)}>Alle</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => toggleAll(publicEvents, false)}>Keine</button>
                </div>
              </div>
              <div className="space-y-0.5">
                {publicEvents.length === 0 && (
                  <p className="text-sm text-gray-400">Keine öffentlichen Veranstaltungen.</p>
                )}
                {publicEvents.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(e.id)}
                      onChange={() => toggle(e.id)}
                      className="rounded"
                    />
                    {formatEvent(e)}
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button
            onClick={openPdf}
            disabled={selectedIds.size === 0}
            className="btn-primary disabled:opacity-40"
          >
            PDF erstellen ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  )
}
