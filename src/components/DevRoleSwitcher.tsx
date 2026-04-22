'use client'

import { useEffect, useState } from 'react'
import type { AppRole } from '@/types'
import { APP_ROLES, APP_ROLE_LABELS } from '@/types'

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true'

export function DevRoleSwitcher() {
  const [role, setRole] = useState<AppRole | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!DEV_SKIP_AUTH) return
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d: { role: AppRole } | null) => { if (d?.role) setRole(d.role) })
      .catch(() => {})
  }, [])

  if (!DEV_SKIP_AUTH || !role) return null

  async function handleChange(newRole: AppRole) {
    setBusy(true)
    await fetch('/api/dev/role', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    window.location.reload()
  }

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 shadow-lg text-xs">
      <span className="font-semibold text-yellow-700">DEV</span>
      <select
        className="border border-yellow-300 rounded px-1.5 py-1 text-xs bg-white text-gray-800 focus:outline-none"
        value={role}
        disabled={busy}
        onChange={(e) => handleChange(e.target.value as AppRole)}
      >
        {APP_ROLES.map((r) => (
          <option key={r} value={r}>{APP_ROLE_LABELS[r]}</option>
        ))}
      </select>
    </div>
  )
}
