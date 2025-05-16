'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'

// 1) Schema
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
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState<string|null>(null)
  const router                      = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 2) Validierung
    const result = SignupSchema.safeParse({ email, password })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    // 3) API-Call
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data as SignupData),
    })

    if (res.ok) {
      router.push('/auth/signin?registered=1')
    } else {
      const body = await res.json()
      setError(body.error || 'Registrierung fehlgeschlagen')
    }
  }


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-black">
      {/* — Links: Registrierungs-Formular als Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-card-dark p-8 rounded-lg shadow-lg space-y-6"
        >
          <h1 className="text-2xl font-bold text-gray-100 text-center">
            Registrieren
          </h1>

          {error && (
            <p className="text-red-500 text-center">{error}</p>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 
                         focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-transparent text-gray-100 placeholder-gray-500 
                         focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-accent rounded text-black font-medium hover:bg-accent/90 transition"
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
      </div>

      {/* — Rechts: Vorschau-Card + Feature-Liste */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-8">
          {/* Screenshot-Card */}
          <div className="bg-card-dark p-4 rounded-lg shadow-lg">
            <Image
              src="/images/hero-mockup.png"
              alt="App Preview"
              width={800}
              height={500}
              className="rounded"
            />
          </div>
          {/* Feature-Bulletpoints */}
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