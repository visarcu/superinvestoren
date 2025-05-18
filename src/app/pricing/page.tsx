// src/app/pricing/page.tsx
'use client'

import React from 'react'
import Image from 'next/image'
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
      body: JSON.stringify({ email: session?.user.email }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else console.error('Keine Checkout-URL zurückgekommen')
  }

  // ========== LAYOUT ==========
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden p-6">
      {/* Hintergrund-Kreise */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-accent/25 rounded-full blur-2xl animate-[pulse_12s_ease-in-out_infinite]" />

      <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 gap-12">
        {/* Nicht eingeloggt */}
        {!session && (
          <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-8 text-center space-y-6">
            <p className="text-gray-100 text-lg">
              Bitte melde dich zuerst an, um Premium freizuschalten.
            </p>
            <Link
              href="/auth/signin"
              className="inline-block px-6 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition"
            >
              Anmelden
            </Link>
          </div>
        )}

        {/* Eingeloggt */}
        {session && (
          <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-10 space-y-6 text-center">
            <h1 className="text-3xl font-bold text-white">Upgrade auf Premium</h1>
            <p className="text-gray-300">
              Sichere dir vollen Zugriff auf alle Funktionen für nur{' '}
              <span className="font-semibold text-white">9 € / Monat</span>.
            </p>

            <ul className="text-left max-w-md mx-auto space-y-4 text-gray-200">
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Interaktive Charts & Zeitraumauswahl
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Erweiterte Kennzahlen (Quartal, Wachstum, Segmente)
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Unbegrenzte historische Daten (bis 154 Jahre)
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Exklusive Premium-Filter & Alerts
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              className="w-full mt-4 px-6 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition"
            >
              Jetzt Premium freischalten
            </button>

            <p className="text-sm text-gray-400">
              Bereits Premium?{' '}
              <button
                onClick={() => router.push('/profile')}
                className="text-accent hover:underline"
              >
                Zu meinem Profil
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}