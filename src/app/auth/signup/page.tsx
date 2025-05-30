// src/app/auth/signup/page.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

// 1) Schema bleibt unverändert
const SignupSchema = z.object({
  email: z.string().email({ message: 'Ungültige E-Mail' }),
  password: z
    .string()
    .min(8, { message: 'Mindestens 8 Zeichen' })
    .regex(/[A-Z]/, { message: 'Mindestens 1 Großbuchstabe' })
    .regex(/[0-9]/, { message: 'Mindestens 1 Zahl' }),
})

type SignupData = z.infer<typeof SignupSchema>

export default function SignupPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const router                  = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validierung bleibt
    const result = SignupSchema.safeParse({ email, password })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    // API-Call bleibt
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data as SignupData),
    })

    if (res.ok) {
      // wir leiten auf Login mit ?registered=1 weiter, so wie besprochen
      router.push('/auth/signin?registered=1')
    } else {
      const body = await res.json()
      setError(body.error || 'Registrierung fehlgeschlagen')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden p-6">
      {/* Hintergrund-Elemente */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-accent/25 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-2xl animate-[pulse_10s_ease-in-out_infinite]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl w-full">
        {/* ── Linke Spalte: Signup-Formular ── */}
        <form
          onSubmit={handleSubmit}
          className="
            bg-gray-800/70 backdrop-blur-xl
            border border-gray-700
            rounded-3xl shadow-lg
            p-8 space-y-6 flex flex-col
          "
        >
       
          <h1 className="text-3xl font-bold text-white text-center">Registrieren</h1>

          {/* Fehlermeldung */}
          {error && (
            <p className="bg-red-900 text-red-300 px-4 py-2 rounded-lg text-center">
              {error}
            </p>
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="
              w-full py-3 bg-accent text-black font-semibold
              rounded-lg hover:bg-accent/90 transition
            "
          >
            Account erstellen
          </button>

          <p className="text-sm text-center text-gray-400">
            Schon einen Account?{' '}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Anmelden
            </Link>
          </p>
        </form>

        {/* ── Rechte Spalte: Vorschau + Feature-Liste ── */}
        <div className="flex flex-col justify-center space-y-8">
          {/* Bild-Preview */}
          <div className="
            bg-gray-800/70 backdrop-blur-xl
            border border-gray-700
            rounded-3xl shadow-lg
            overflow-hidden
          ">
            <Image
              src="/images/hero-mockup.png"
              alt="App Preview"
              width={800}
              height={500}
              className="object-cover"
            />
          </div>

          {/* Features */}
          <div className="
            bg-gray-800/70 backdrop-blur-xl
            border border-gray-700
            rounded-3xl shadow-lg
            p-6 space-y-4 text-gray-100
          ">
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