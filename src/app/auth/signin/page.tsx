// src/app/auth/signin/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SigninPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [resendSent, setResendSent] = useState(false)
  const [info, setInfo]             = useState<string | null>(null)
  const router                      = useRouter()
  const params                      = useSearchParams()

  useEffect(() => {
    if (params?.get('registered') === '1') {
      setInfo('Dein Account wurde erfolgreich erstellt! Bitte logge dich nun ein.')
    }
    if (params?.get('verified') === '1') {
      setInfo('E-Mail bestätigt! Du kannst dich jetzt einloggen.')
    }
  }, [params])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResendSent(false)

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (res?.ok) {
      router.push('/')
    } else if (res?.error === 'EMAIL_NOT_VERIFIED') {
      setError('E-Mail noch nicht bestätigt')
    } else {
      setError('Ungültige Zugangsdaten')
    }
  }

  async function handleResend() {
    const r = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (r.ok) setResendSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden relative p-6">
      {/* zwei subtil animierte Kreise im Hintergrund */}
      <div className="absolute -top-16 -right-16 w-72 h-72 bg-accent/30 rounded-full filter blur-2xl animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute -bottom-16 -left-16 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl w-full">
        {/* ── Linke Spalte: Login-Card ── */}
        <form
          onSubmit={handleSubmit}
          className="
            bg-gray-800/70 backdrop-blur-xl
            border border-gray-700
            rounded-3xl shadow-lg
            p-8 space-y-6
            flex flex-col
          "
        >
          {/* optional: Logo */}
          <div className="flex justify-center">
            <Image src="/logos/superinvestor.svg" alt="SuperInvestor" width={48} height={48} />
          </div>

          <h1 className="text-3xl font-bold text-white text-center">Anmelden</h1>

          {/* Infobanner */}
          {info && (
            <p className="bg-green-800 text-green-200 px-4 py-2 rounded-lg text-center">
              {info}
            </p>
          )}

          {/* Error + Resend */}
          {error && (
            <div className="space-y-2 text-center">
              <p className="text-red-400">{error}</p>
              {error === 'E-Mail noch nicht bestätigt' && (
                !resendSent ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-accent underline"
                  >
                    Bestätigungs-Mail erneut senden
                  </button>
                ) : (
                  <p className="text-green-400">Mail wurde erneut versandt!</p>
                )
              )}
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="
                w-full px-4 py-3
                rounded-lg
                bg-gray-900 text-gray-100 placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-accent
                transition
              "
              required
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="
                w-full px-4 py-3
                rounded-lg
                bg-gray-900 text-gray-100 placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-accent
                transition
              "
              required
            />
            <p className="text-sm text-center text-gray-400">
              <Link href="/auth/forgot-password" className="text-accent hover:underline">
                Passwort vergessen?
              </Link>
            </p>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="
              w-full py-3 bg-accent text-black font-semibold
              rounded-lg hover:bg-accent/90 transition
            "
          >
            Anmelden
          </button>

          <p className="text-sm text-center text-gray-400">
            Noch keinen Account?{' '}
            <Link href="/auth/signup" className="text-accent hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </form>

        {/* ── Rechte Spalte: Vorschau + Features ── */}
        <div className="flex flex-col justify-center space-y-8">
          {/* Bild-Preview */}
          <div
            className="
              bg-gray-800/70 backdrop-blur-xl
              border border-gray-700
              rounded-3xl shadow-lg
              overflow-hidden
            "
          >
            <Image
              src="/images/hero-mockup.png"
              alt="App Preview"
              width={800}
              height={500}
              className="object-cover"
            />
          </div>

          {/* Features */}
          <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-6 space-y-4 text-gray-100">
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Detaillierte historische Kennzahlen
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Wachstumsraten & Quartals-/Jahresansicht
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Interaktiver Chart-Zoom & Vollbild
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Premium-Features (erweitertes Screening)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}