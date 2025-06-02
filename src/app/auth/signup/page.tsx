// src/app/auth/signup/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignupPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 1) Supabase signUp
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // optional: du kannst User-Metadaten mit übergeben, z.B. firstName/lastName
      // options: {
      //   data: { first_name: firstName, last_name: lastName }
      // }
    })
    if (error) {
      setError(error.message)
    } else {
      // Supabase schickt automatisch die Verifikations-Mail (wenn SMTP in Supabase eingestellt ist)
      // Leite zum Login mit Hinweis weiter:
      router.push('/auth/signin?registered=1')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md bg-gray-800 p-8 rounded-lg">
        <h1 className="text-3xl font-bold text-white text-center">Registrieren</h1>
        {error && (
          <p className="bg-red-800 text-red-200 px-4 py-2 rounded-lg text-center">
            {error}
          </p>
        )}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <input
            type="password"
            placeholder="Passwort (mind. 8 Zeichen)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition"
        >
          Account erstellen
        </button>
        <p className="text-sm text-gray-400 text-center">
          Schon einen Account?{' '}
          <a href="/auth/signin" className="text-accent hover:underline">
            Anmelden
          </a>
        </p>
      </form>
    </div>
  )
}