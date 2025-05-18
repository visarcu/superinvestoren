// src/app/auth/forgot-password/page.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email) {
      setError('Bitte gib deine E-Mail an')
      return
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json()
      if (res.ok && body.success) {
        setSuccess(true)
      } else {
        setError(body.error ?? 'Fehler beim Senden der E-Mail.')
      }
    } catch (err) {
      console.error(err)
      setError('Netzwerkfehler beim Senden der E-Mail.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden p-6">
      {/* Hintergrund-Elemente */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/25 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-accent/20 rounded-full blur-2xl animate-[pulse_12s_ease-in-out_infinite]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl w-full">
        {/* ── Linke Spalte: Forgot-Password‐Form ── */}
        <form
          onSubmit={handleSubmit}
          className="
            bg-gray-800/70 backdrop-blur-xl
            border border-gray-700
            rounded-3xl shadow-lg
            p-8 space-y-6 flex flex-col
          "
        >
          <h1 className="text-3xl font-bold text-white text-center">
            Passwort vergessen
          </h1>

          {/* Fehlermeldung */}
          {error && (
            <p className="bg-red-900 text-red-300 px-4 py-2 rounded-lg text-center">
              {error}
            </p>
          )}

          {/* Erfolgsmeldung */}
          {success && (
            <p className="bg-green-900 text-green-300 px-4 py-2 rounded-lg text-center">
              Reset-Link wurde versandt. Prüfe dein Postfach.
            </p>
          )}

          {/* E-Mail-Input */}
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="
              w-full py-3 bg-accent text-black font-semibold
              rounded-lg hover:bg-accent/90 transition
            "
          >
            Reset-Link senden
          </button>

          <p className="text-sm text-center text-gray-400">
            Du hast schon ein Konto?{' '}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Hier einloggen
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

          {/* Feature-Bulletpoints */}
          <div className="
            bg-gray-800/70 backdrop-blur-xl
            border border-gray-700
            rounded-3xl shadow-lg
            p-6 space-y-4 text-gray-100
          ">
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Einfacher Reset-Link via E-Mail
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Sichere Token-Prüfung (1 h gültig)
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Falls nicht zugestellt: Spam-Ordner prüfen
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-accent">✓</span>
                Support unter <Link href="mailto:support@superinvestor.test" className="underline">support@superinvestor.test</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}