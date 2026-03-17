'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function ExportContent() {
  const params = useSearchParams()

  const [currentMonth, setCurrentMonth] = useState(() => {
    const p = params.get('month')
    if (p) {
      const [y, m] = p.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  function openMonthPdf() {
    const y = currentMonth.getFullYear()
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0')
    window.open(`/services/print-month?month=${y}-${m}`, '_blank')
  }

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">PDF Export</h1>
        <button onClick={() => window.close()} className="text-sm text-gray-500 hover:text-gray-700">
          ✕ Schließen
        </button>
      </div>

      {/* Monats-PDF */}
      <div className="border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Monats-PDF</h2>
        <p className="text-sm text-gray-500 mb-5">
          Alle Veranstaltungen eines Monats als PDF exportieren.
        </p>

        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            ‹
          </button>
          <span className="text-base font-medium w-44 text-center">{monthLabel}</span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            ›
          </button>
        </div>

        <button onClick={openMonthPdf} className="btn-primary">
          PDF öffnen
        </button>
      </div>

      {/* Mitarbeiter-Plan */}
      <div className="border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Mitarbeiter-Plan</h2>
        <p className="text-sm text-gray-500 mb-5">
          Alle zukünftigen internen Termine plus ausgewählte öffentliche Termine.
        </p>

        <button
          onClick={() => window.open('/services/print-internal', '_blank')}
          className="btn-primary"
        >
          PDF öffnen
        </button>
      </div>
    </div>
  )
}

export default function ExportPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-400">Lädt…</p>}>
      <ExportContent />
    </Suspense>
  )
}
