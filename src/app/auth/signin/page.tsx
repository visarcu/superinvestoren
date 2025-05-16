// src/app/auth/signin/page.tsx
'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SigninPage() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [error, setError]             = useState<string|null>(null)
  const [resendSent, setResendSent]   = useState(false)
  const router                        = useRouter()
  const params            = useSearchParams()
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (params?.get('registered') === '1') {
      setInfo('Dein Account wurde erstellt! Bitte melde dich nun an.')
    }
    if (params?.get('verified') === '1') {
      setInfo('Deine E-Mail wurde bestätigt. Du kannst dich jetzt einloggen.')
    }
  }, [params])

  // 1) Login-Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResendSent(false)

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password
    })

    if (res?.ok) {
      router.push('/')
    } else if (res?.error === 'EMAIL_NOT_VERIFIED') {
      // wird von deinem NextAuth-Provider so geworfen
      setError('E-Mail noch nicht bestätigt')
    } else {
      setError('Ungültige Daten')
    }
  }

  // 2) Funktion zum erneuten Senden der Verifizierungs-Mail
  async function handleResend() {
    const r = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (r.ok) {
      setResendSent(true)
    }
  }

 
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-black">
      {/* — Links: Formular-Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-card-dark p-8 rounded-lg shadow-lg space-y-6">
          <h1 className="text-2xl font-bold text-gray-100 text-center">
            Anmelden
          </h1>



        {/* 1) Info-Box */}
        {info && (
          <p className="bg-green-800 text-green-200 p-2 rounded">
            {info}
          </p>
        )}


          {/* ← Error-Block mit „Resend Verification“ UI */}
          {error && (
            <div className="space-y-2 text-center">
              <p className="text-red-500">{error}</p>

              {error === 'E-Mail noch nicht bestätigt' && (
                !resendSent
                  ? <button
                      type="button"
                      onClick={handleResend}
                      className="text-accent underline"
                    >
                      Bestätigungs-Mail erneut senden
                    </button>
                  : <p className="text-green-400">Verifizierungs-Mail wurde erneut versandt!</p>
              )}
            </div>
          )}

          {/* ← Hier beginnen deine Input-Felder */}
          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />

<p className="text-sm text-center text-gray-400">
  <Link href="/auth/forgot-password" className="text-accent hover:underline">
    Passwort vergessen?
  </Link>
</p>



          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-accent rounded text-black font-medium hover:bg-accent/90 transition"
          >
            Anmelden
          </button>

          <p className="text-sm text-center text-gray-400">
            Noch keinen Account?{' '}
            <a href="/auth/signup" className="text-accent hover:underline">
              Registrieren
            </a>
          </p>
        </form>
      </div>

      {/* — Rechts: Vorschau-Card + Features */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-8">
          <div className="bg-card-dark p-4 rounded-lg shadow-lg">
            <Image
              src="/images/hero-mockup.png"
              alt="App Preview"
              width={800}
              height={500}
              className="rounded"
            />
          </div>
          <ul className="bg-card-dark p-6 rounded-lg shadow-lg space-y-4 text-gray-100">
            <li className="flex items-start">
              <span className="inline-block mt-1 mr-3 text-accent">✓</span>
              <span>Detaillierte historische Kennzahlen</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block mt-1 mr-3 text-accent">✓</span>
              <span>Wachstumsraten & Quartals-/Jahresansicht</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block mt-1 mr-3 text-accent">✓</span>
              <span>Interaktiver Chart-Zoom & Vollbild</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block mt-1 mr-3 text-accent">✓</span>
              <span>Premium-Features (z. B. erweitertes Screening)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}