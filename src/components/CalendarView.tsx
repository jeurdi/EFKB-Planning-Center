'use client'

import Link from 'next/link'
import type { CalendarEvent } from '@/types'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

// 0 = Monday … 6 = Sunday
function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function isoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  services: CalendarEvent[]
  currentMonth: Date
  onPrev: () => void
  onNext: () => void
}

export function CalendarView({ services, currentMonth, onPrev, onNext }: Props) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = mondayIndex(firstDay)

  // Build flat array of day cells (null = empty padding)
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
  ]
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d))
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  // Group services by date string
  const byDate = new Map<string, CalendarEvent[]>()
  for (const s of services) {
    const key = isoDate(new Date(s.startDate))
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(s)
  }

  const today = isoDate(new Date())

  return (
    <div className="card overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={onPrev} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </span>
        <button onClick={onNext} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50" />
          }
          const key = isoDate(day)
          const dayServices = byDate.get(key) ?? []
          const isToday = key === today
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const isPast = key < today

          return (
            <div
              key={key}
              className={`min-h-[80px] p-1.5 flex flex-col gap-1 ${
                isWeekend ? 'bg-gray-50/60' : ''
              } ${isPast ? 'opacity-50' : ''}`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-end ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500'
                }`}
              >
                {day.getDate()}
              </span>
              {dayServices.map((s) => (
                <Link key={s.id} href={`/services/${s.id}`}>
                  <div className="rounded px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 transition-colors cursor-pointer">
                    <p className="text-xs font-medium text-blue-800 truncate leading-tight">{s.title}</p>
                    <p className="text-xs text-blue-600 leading-tight">{formatTime(s.startDate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
