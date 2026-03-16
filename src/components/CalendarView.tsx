'use client'

import Link from 'next/link'
import type { CalendarEvent } from '@/types'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function isoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isAllDay(iso: string) {
  const d = new Date(iso)
  return d.getHours() === 0 && d.getMinutes() === 0
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// Returns true if the event spans more than one calendar day
function isMultiDay(s: CalendarEvent) {
  const start = isoDate(new Date(s.startDate))
  // ICS all-day end dates are exclusive — subtract 1ms to get the actual last day
  const end = isoDate(new Date(new Date(s.endDate).getTime() - 1))
  return end > start
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

  const cells: (Date | null)[] = [...Array(startOffset).fill(null)]
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  // Map each calendar day → events that are active on that day
  const byDate = new Map<string, { event: CalendarEvent; isStart: boolean }[]>()

  for (const s of services) {
    const startKey = isoDate(new Date(s.startDate))
    // Subtract 1ms from end so exclusive ICS end dates land on the last actual day
    const endKey = isoDate(new Date(new Date(s.endDate).getTime() - 1))

    const cur = new Date(new Date(s.startDate))
    cur.setHours(0, 0, 0, 0)

    while (isoDate(cur) <= endKey) {
      const key = isoDate(cur)
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push({ event: s, isStart: key === startKey })
      cur.setDate(cur.getDate() + 1)
    }
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
        <span className="font-semibold text-gray-900">{MONTHS[month]} {year}</span>
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
          if (!day) return <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50" />

          const key = isoDate(day)
          const dayEntries = byDate.get(key) ?? []
          const isToday = key === today
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const isPast = key < today

          return (
            <div
              key={key}
              className={`min-h-[80px] p-1.5 flex flex-col gap-1 ${isWeekend ? 'bg-gray-50/60' : ''} ${isPast ? 'opacity-50' : ''}`}
            >
              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-end ${
                isToday ? 'bg-blue-600 text-white' : 'text-gray-500'
              }`}>
                {day.getDate()}
              </span>

              {dayEntries.map(({ event: s, isStart }) => {
                const multi = isMultiDay(s)
                const baseColor = s.isPublic
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                const contColor = s.isPublic
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-400'

                return (
                  <Link key={`${s.id}-${key}`} href={`/services/${s.id}`}>
                    <div className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer ${isStart ? baseColor : contColor}`}>
                      {isStart ? (
                        <>
                          <p className="text-xs font-medium truncate leading-tight">
                            {!s.isPublic && '🔒 '}{s.title}
                            {multi && ' →'}
                          </p>
                          {!isAllDay(s.startDate) && (
                            <p className={`text-xs leading-tight ${s.isPublic ? 'text-blue-600' : 'text-gray-400'}`}>
                              {formatTime(s.startDate)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs truncate leading-tight italic opacity-75">
                          {s.title}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
