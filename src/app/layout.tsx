import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'
import { AppUserProvider } from '@/contexts/AppUserContext'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Planungstool',
  description: 'Gottesdienst-Planungstool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AppUserProvider>
          <Nav />
          <main className="min-h-screen">{children}</main>
          <DevRoleSwitcher />
        </AppUserProvider>
      </body>
    </html>
  )
}
