'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true'

const links = [
  { href: '/my-services', label: 'Meine Dienste' },
  { href: '/services', label: 'Gottesdienste' },
  { href: '/schedule', label: 'Übersicht' },
  { href: '/persons', label: 'Personen' },
  { href: '/export', label: 'Export' },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  function handleSignOut() {
    if (DEV_SKIP_AUTH) { router.push('/services'); return }
    import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }))
  }

  if (pathname === '/login') return null

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/services" className="flex items-center gap-2 font-bold text-gray-900">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Planungstool
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            )
          })}

          <button
            onClick={handleSignOut}
            className="ml-3 btn-ghost text-sm px-3 py-1.5"
          >
            Abmelden
          </button>
        </nav>
      </div>
    </header>
  )
}
