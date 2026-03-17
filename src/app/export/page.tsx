'use client'

import { useAppUser } from '@/contexts/AppUserContext'
import { canSeeExport, allowedExports } from '@/lib/permissions'

const ALL_ITEMS = [
  {
    section: 'Veranstaltungen',
    adminOnly: true,
    items: [
      { label: 'Monats-Plan',  description: 'Alle Veranstaltungen eines Monats als PDF.',           href: '/services/print-month',            role: null },
      { label: 'Jahre-Plan',   description: 'Alle zukünftigen internen und öffentlichen Termine.',  href: '/services/print-internal',          role: null },
    ],
  },
  {
    section: 'Dienstplan',
    adminOnly: false,
    items: [
      { label: 'Predigt',          description: 'Predigt-Einsätze der nächsten 6 Monate.',          href: '/schedule/print?role=PREDIGT',          role: 'PREDIGT' },
      { label: 'Moderation',       description: 'Moderations-Einsätze der nächsten 6 Monate.',      href: '/schedule/print?role=MODERATION',       role: 'MODERATION' },
      { label: 'Kindergeschichte', description: 'Kindergeschichte-Einsätze der nächsten 6 Monate.', href: '/schedule/print?role=KINDERGESCHICHTE',  role: 'KINDERGESCHICHTE' },
      { label: 'Gesang Leiter',    description: 'Gesang-Einsätze der nächsten 6 Monate.',           href: '/schedule/print?role=GESANG_LEITER',    role: 'GESANG_LEITER' },
      { label: 'Technik Leiter',   description: 'Technik-Einsätze der nächsten 6 Monate.',          href: '/schedule/print?role=TECHNIK_LEITER',   role: 'TECHNIK_LEITER' },
      { label: 'Gesamt',           description: 'Alle Rollen — Übersicht der nächsten 6 Monate.',   href: '/schedule/print?role=GESAMT',           role: 'GESAMT' },
    ],
  },
]

export default function ExportPage() {
  const { role, loading } = useAppUser()

  if (!loading && !canSeeExport(role)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Kein Zugriff auf diese Seite.</p>
      </div>
    )
  }

  const allowed = allowedExports(role)
  const isAdmin = role === 'ADMIN'

  const sections = ALL_ITEMS
    .map((section) => ({
      ...section,
      items: section.adminOnly
        ? isAdmin ? section.items : []
        : section.items.filter((item) => isAdmin || allowed.includes(item.role ?? '')),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Export</h1>

      {sections.map(({ section, items }) => (
        <section key={section}>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{section}</h2>
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
            {items.map(({ label, description, href }) => (
              <div key={label} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-base font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
                <button
                  onClick={() => window.open(href, '_blank')}
                  className="btn-secondary shrink-0 ml-4"
                >
                  PDF öffnen
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
