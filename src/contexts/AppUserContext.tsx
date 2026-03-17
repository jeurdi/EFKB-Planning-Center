'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { AppRole } from '@/types'

interface AppUserCtx {
  role: AppRole | null
  email: string | null
  loading: boolean
}

const AppUserContext = createContext<AppUserCtx>({ role: null, email: null, loading: true })

export function AppUserProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<AppUserCtx>({ role: null, email: null, loading: true })

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setCtx({ role: data.role, email: data.email, loading: false })
        else setCtx({ role: null, email: null, loading: false })
      })
      .catch(() => setCtx({ role: null, email: null, loading: false }))
  }, [])

  return <AppUserContext.Provider value={ctx}>{children}</AppUserContext.Provider>
}

export function useAppUser(): AppUserCtx {
  return useContext(AppUserContext)
}
