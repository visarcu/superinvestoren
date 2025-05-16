'use client'

import Image from 'next/image'
import Link from 'next/link'           // ← ganz wichtig
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState<string|null>(null)
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
        // Gib immer den vom API zurückgegebenen Fehler aus
        setError(body.error ?? 'Fehler beim Senden der E-Mail.')
      }
    } catch (err) {
      console.error(err)
      setError('Netzwerkfehler beim Senden der E-Mail.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-black">
      {/* — Formular */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-card-dark p-8 rounded-lg shadow-lg space-y-6"
        >
          <h1 className="text-2xl font-bold text-gray-100 text-center">
            Passwort vergessen
          </h1>

          {error && <p className="text-red-500 text-center">{error}</p>}
          {success && (
            <p className="text-green-400 text-center">
              Reset-Link wurde versandt – prüfe dein Postfach.
            </p>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-accent rounded text-black font-medium hover:bg-accent/90 transition"
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
      </div>

      {/* — Vorschau-Bild */}
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
        </div>
      </div>
    </div>
  )
}