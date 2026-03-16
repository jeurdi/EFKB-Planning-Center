'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ConfirmContent() {
  const params = useSearchParams()
  const response = params.get('response')
  const name = params.get('name') ?? ''

  const accepted = response === 'accepted'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card p-10 max-w-md w-full text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
          accepted ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {accepted ? (
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {accepted ? 'Danke, du bist dabei!' : 'Verstanden, du bist verhindert.'}
        </h1>
        <p className="text-gray-500 text-sm">
          {name ? `Hallo ${name}, d` : 'D'}
          {accepted
            ? 'eine Zusage wurde gespeichert. Wir freuen uns auf dich!'
            : 'eine Absage wurde gespeichert. Das Planungsteam wurde informiert.'}
        </p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
