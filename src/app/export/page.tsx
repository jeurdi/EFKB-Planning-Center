'use client'

const EXPORT_ITEMS = [
  {
    section: 'Veranstaltungen',
    items: [
      {
        label: 'Monats-Plan',
        description: 'Alle Veranstaltungen eines Monats als PDF exportieren.',
        href: '/services/print-month',
      },
      {
        label: 'Jahre-Plan',
        description: 'Alle zukünftigen internen Termine plus ausgewählte öffentliche Termine.',
        href: '/services/print-internal',
      },
    ],
  },
  {
    section: 'Dienstplan',
    items: [
      { label: 'Predigt',          description: 'Predigt-Einsätze der nächsten 6 Monate.',          href: '/schedule/print?role=PREDIGT' },
      { label: 'Moderation',       description: 'Moderations-Einsätze der nächsten 6 Monate.',      href: '/schedule/print?role=MODERATION' },
      { label: 'Kindergeschichte', description: 'Kindergeschichte-Einsätze der nächsten 6 Monate.', href: '/schedule/print?role=KINDERGESCHICHTE' },
      { label: 'Gesamt',           description: 'Alle Rollen — Übersicht der nächsten 6 Monate.',   href: '/schedule/print?role=GESAMT' },
    ],
  },
]

export default function ExportPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Export</h1>

      {EXPORT_ITEMS.map(({ section, items }) => (
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
