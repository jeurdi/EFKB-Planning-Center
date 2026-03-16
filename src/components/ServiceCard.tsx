import type { CalendarEvent } from '@/types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ServiceCard({ service }: { service: CalendarEvent }) {
  const now = new Date()
  const start = new Date(service.startDate)
  const isPast = start < now
  const isToday =
    start.toDateString() === now.toDateString()

  return (
    <div
      className={`card p-5 hover:shadow-md transition-shadow cursor-pointer ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Date badge */}
        <div className="flex-shrink-0 text-center bg-blue-50 rounded-lg px-3 py-2 w-16">
          <div className="text-xs text-blue-500 font-medium uppercase">
            {start.toLocaleDateString('de-DE', { month: 'short' })}
          </div>
          <div className="text-2xl font-bold text-blue-700 leading-none">
            {start.getDate()}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{service.title}</h3>
            {isToday && (
              <span className="flex-shrink-0 rounded-full bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5">
                Heute
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(service.startDate)} · {formatTime(service.startDate)} – {formatTime(service.endDate)} Uhr
          </p>
        </div>

        {/* Arrow */}
        <svg
          className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
