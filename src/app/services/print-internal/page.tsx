'use client'

import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/types'

const SHORT_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function isDefaultBold(iso: string): boolean {
  const d = new Date(iso)
  return (d.getDay() === 0 && d.getHours() === 10) || (d.getDay() === 5 && d.getHours() === 18)
}

function fmtShort(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

function formatDate(e: { startDate: string; endDate: string }) {
  const start = new Date(e.startDate)
  const end = new Date(new Date(e.endDate).getTime() - 1)
  const endStr = fmtShort(end) !== fmtShort(start) ? ` – ${fmtShort(end)}` : ''
  return `${fmtShort(start)}${endStr}`
}

function fmtEventLabel(e: CalendarEvent) {
  const d = new Date(e.startDate)
  return `${SHORT_DAYS[d.getDay()]} ${fmtShort(d)} — ${e.title}`
}

function defaultThreshold(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

function isRecentlyChanged(e: CalendarEvent, threshold: string, active: boolean): boolean {
  if (!active || !threshold) return false
  const t = new Date(threshold)
  if (e.calCreatedAt && new Date(e.calCreatedAt) >= t) return true
  if (e.calModifiedAt && new Date(e.calModifiedAt) >= t) return true
  return false
}

export default function PrintInternalPage() {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formats, setFormats] = useState<Map<string, { bold: boolean; italic: boolean }>>(new Map())
  const [highlightNew, setHighlightNew] = useState(true)
  const [threshold, setThreshold] = useState(defaultThreshold)
  const [twoColumn, setTwoColumn] = useState(false)

  function toggleFormat(id: string, field: 'bold' | 'italic', currentValue: boolean) {
    const next = new Map(formats)
    const ev = allEvents.find(e => e.id === id)
    const cur = next.get(id) ?? { bold: ev?.isBold ?? false, italic: ev?.isItalic ?? false }
    next.set(id, { ...cur, [field]: !currentValue })
    setFormats(next)
    fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field === 'bold' ? { isBold: !currentValue } : { isItalic: !currentValue }),
    })
  }

  // Load events once
  useEffect(() => {
    fetch('/api/services?all=true')
      .then((r) => r.json())
      .then((data: unknown) => {
        const now = new Date()
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        const future = (data as CalendarEvent[])
          .filter((e) => {
            const start = new Date(e.startDate)
            if (start < now) return false
            if (start > endOfYear) {
              const t = e.title.toLowerCase()
              if (e.eventType === 'MITARBEITER' || t.includes('leitungskreis')) return false
            }
            return true
          })
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        setAllEvents(future)
        setSelectedIds(new Set(future.filter((e) => !e.isPublic).map((e) => e.id)))
        setLoading(false)
      })
      .catch(() => {
        setError('Fehler beim Laden')
        setLoading(false)
      })
  }, [])

  // Re-initialize bold state whenever events, threshold or highlightNew changes
  useEffect(() => {
    if (allEvents.length === 0) return
    setFormats(new Map(allEvents.map(e => [e.id, {
      bold: e.isBold || isDefaultBold(e.startDate) || isRecentlyChanged(e, threshold, highlightNew),
      italic: e.isItalic,
    }])))
  }, [allEvents, threshold, highlightNew])

  function toggleId(id: string) {
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

  const internalEvents = allEvents.filter((e) => !e.isPublic)
  const publicEvents = allEvents.filter((e) => e.isPublic)
  const selectedEvents = allEvents.filter((e) => selectedIds.has(e.id))

  function renderYearGroups(evts: CalendarEvent[]) {
    const grouped: Record<number, CalendarEvent[]> = {}
    for (const e of evts) {
      const y = new Date(e.startDate).getFullYear()
      if (!grouped[y]) grouped[y] = []
      grouped[y].push(e)
    }
    return Object.keys(grouped).map(Number).sort().map((year, yi) => (
      <div key={year} className={yi > 0 ? 'mt-6' : ''}>
        <h2 className="text-lg font-bold mb-2">{year}</h2>
        <table className="text-base border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '9rem' }} />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-gray-400">
              <th className="text-left font-semibold text-gray-500" style={{ padding: '2px 3rem 2px 0' }}>Datum</th>
              <th className="text-left font-semibold text-gray-500" style={{ padding: '2px 0' }}>Veranstaltung</th>
            </tr>
          </thead>
          <tbody>
            {grouped[year].map((e) => {
              const date = formatDate(e)
              const fmt = formats.get(e.id)
              const bold = fmt?.bold ?? e.isBold
              const italic = fmt?.italic ?? e.isItalic
              return (
                <tr key={e.id} className="border-b border-gray-300" style={{ fontWeight: bold ? 'bold' : undefined, fontStyle: italic ? 'italic' : undefined }}>
                  <td className="text-gray-700 whitespace-nowrap" style={{ padding: '3px 3rem 3px 0' }}>{date}</td>
                  <td className="text-gray-900 font-medium" style={{ padding: '3px 0', fontWeight: bold ? 'bold' : undefined }}>{e.title}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    ))
  }

  if (loading) return <p className="p-8 text-gray-400">Lädt…</p>
  if (error) return <p className="p-8 text-red-600">{error}</p>

  const splitIdx = Math.ceil(selectedEvents.length / 2)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          body { font-size: 11pt; }
          @page { margin: 2cm; size: ${twoColumn ? 'A4 landscape' : 'A4 portrait'}; }
        }
        body { font-family: sans-serif; color: #111; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex items-start justify-center gap-6 px-6 py-4 bg-gray-100 border-b border-gray-200">
        {/* Buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Als PDF drucken
            </button>
            <button
              onClick={() => window.close()}
              className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Schließen
            </button>
            <button
              onClick={() => setTwoColumn(v => !v)}
              title="Zwei Spalten im Querformat drucken"
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                twoColumn ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              2 Spalten
            </button>
          </div>
          {/* Recently-changed highlight */}
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={highlightNew}
              onChange={ev => setHighlightNew(ev.target.checked)}
              className="rounded"
            />
            <span>Fett: neu/geändert seit</span>
            <input
              type="date"
              value={threshold}
              onChange={ev => setThreshold(ev.target.value)}
              disabled={!highlightNew}
              className="border border-gray-300 rounded px-1 py-0.5 text-xs disabled:opacity-40"
            />
          </label>
        </div>

        {/* Event selection */}
        <div className="flex gap-8">
          {/* Internal */}
          <div className="shrink-0">
            <div className="flex items-center gap-3 mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Intern ({internalEvents.length})
              </p>
              <div className="flex gap-1.5 text-xs text-blue-600">
                <button onClick={() => toggleAll(internalEvents, true)}>Alle</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => toggleAll(internalEvents, false)}>Keine</button>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: '50vh' }}>
              {internalEvents.map((e) => {
                const fmt = formats.get(e.id)
                const bold = fmt?.bold ?? e.isBold
                const italic = fmt?.italic ?? e.isItalic
                const isNew = isRecentlyChanged(e, threshold, highlightNew)
                return (
                  <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleId(e.id)} className="rounded" />
                    <button onClick={() => toggleFormat(e.id, 'bold', bold)} className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                    <button onClick={() => toggleFormat(e.id, 'italic', italic)} className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                    <span className={isNew ? 'text-blue-600' : ''}>{fmtEventLabel(e)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Public */}
          <div className="shrink-0">
            <div className="flex items-center gap-3 mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Öffentlich ({publicEvents.length})
              </p>
              <div className="flex gap-1.5 text-xs text-blue-600">
                <button onClick={() => toggleAll(publicEvents, true)}>Alle</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => toggleAll(publicEvents, false)}>Keine</button>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: '50vh' }}>
              {publicEvents.map((e) => {
                const fmt = formats.get(e.id)
                const bold = fmt?.bold ?? e.isBold
                const italic = fmt?.italic ?? e.isItalic
                const isNew = isRecentlyChanged(e, threshold, highlightNew)
                return (
                  <div key={e.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleId(e.id)} className="rounded" />
                    <button onClick={() => toggleFormat(e.id, 'bold', bold)} className={`w-5 h-5 text-xs font-bold border rounded leading-none ${bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>B</button>
                    <button onClick={() => toggleFormat(e.id, 'italic', italic)} className={`w-5 h-5 text-xs italic border rounded leading-none ${italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>I</button>
                    <span className={isNew ? 'text-blue-600' : ''}>{fmtEventLabel(e)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className={twoColumn ? 'px-8 pt-6 pb-10' : 'max-w-2xl mx-auto px-8 pt-6 pb-10'}>
        {/* Logo + Title */}
        <div className="flex items-center gap-6 mb-6 border-b border-gray-300 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://efkb.de/wp-content/uploads/2024/10/cropped-cropped-Logo_EFK-Buende2015_orange-300x157-1.png"
            alt="EFK Bünde Logo"
            style={{ height: '60px', width: 'auto', flexShrink: 0 }}
          />
          <h1 className="text-2xl font-bold">Mitarbeiter-Plan</h1>
        </div>

        {selectedEvents.length === 0 && (
          <p className="text-gray-500">Keine Veranstaltungen ausgewählt.</p>
        )}

        {twoColumn ? (
          <div style={{ display: 'flex', gap: '2.5cm', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>{renderYearGroups(selectedEvents.slice(0, splitIdx))}</div>
            <div style={{ flex: 1 }}>{renderYearGroups(selectedEvents.slice(splitIdx))}</div>
          </div>
        ) : (
          renderYearGroups(selectedEvents)
        )}
      </div>
    </>
  )
}
