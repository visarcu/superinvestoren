// src/app/pricing/page.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()

  async function handleUpgrade() {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.user.email })
    })
    const { url } = await res.json()
    if (!url) {
      console.error('Keine Checkout-URL zurückgekommen')
      return
    }
    window.location.href = url
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="bg-card-dark p-8 rounded-lg shadow-lg text-center">
          <p className="text-gray-100 mb-4">
            Bitte melde dich zuerst an, um Premium freizuschalten.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-2 bg-accent rounded text-black font-medium hover:bg-accent/90 transition"
          >
            Anmelden
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-lg bg-card-dark p-10 rounded-lg shadow-lg space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-100">Upgrade auf Premium</h1>
        <p className="text-gray-300">
          Sichere dir vollen Zugriff auf alle Funktionenfür nur{' '}
          <span className="font-semibold text-white">10 € / Monat</span>.
        </p>

        <ul className="text-left space-y-3 text-gray-200">
          <li className="flex items-start">
            <span className="inline-block mr-3 mt-1 text-green-400">✓</span>
            Interaktive Charts & Zeitraumauswahl
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-3 mt-1 text-green-400">✓</span>
            Erweiterte Kennzahlen (Quartal, Wachstum, Segmente)
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-3 mt-1 text-green-400">✓</span>
            Unbegrenzte historische Daten (bis 154 Jahre)
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-3 mt-1 text-green-400">✓</span>
            Exklusive Premium-Filter und Alerts
          </li>
        </ul>

        <button
          onClick={handleUpgrade}
          className="w-full mt-4 px-6 py-3 bg-accent rounded text-black font-medium hover:bg-accent/90 transition"
        >
          Jetzt Premium freischalten
        </button>

        <p className="text-sm text-gray-500">
          Bereits Premium?{' '}
          <button
            onClick={() => router.push('/account')}
            className="text-accent hover:underline"
          >
            Zu meinem Account
          </button>
        </p>
      </div>
    </div>
  )
}