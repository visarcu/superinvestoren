'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'

// 1) Schema für neue Passwörter
const ResetSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Mindestens 8 Zeichen' })
      .regex(/[A-Z]/, { message: 'Mindestens 1 Großbuchstabe' })
      .regex(/[0-9]/, { message: 'Mindestens 1 Zahl' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const params = useSearchParams()



 // erst mal darauf achten, dass params nicht null ist
  if (!params) {
    return (
      <p className="text-red-500 text-center mt-10">
        Ungültige URL.
      </p>
    )
  }

  const token = params.get('token')

  // ohne Token macht das keinen Sinn
  if (!token) {
    return (
      <p className="text-center text-red-500 mt-10">
        Ungültiger oder fehlender Link.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // 2) Validierung
    const result = ResetSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    // 3) API-Call
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (res.ok) {
        setSuccess(true)
        // nach 2s weiterleiten zur Login-Seite
        setTimeout(() => {
          router.push('/auth/signin?reset=1')
        }, 2000)
      } else {
        const body = await res.json()
        setError(body.error || 'Fehler beim Zurücksetzen des Passworts')
      }
    } catch (err: any) {
      setError(err.message)
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
            Neues Passwort setzen
          </h1>

          {error && <p className="text-red-500 text-center">{error}</p>}
          {success && (
            <p className="text-green-400 text-center">
              Passwort geändert. Weiterleitung…
            </p>
          )}

          <div className="space-y-4">
            <input
              type="password"
              placeholder="Neues Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="password"
              placeholder="Passwort wiederholen"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-accent rounded text-black font-medium hover:bg-accent/90 transition"
          >
            Passwort speichern
          </button>

          <p className="text-sm text-center text-gray-400">
            Bereits ein Konto?{' '}
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