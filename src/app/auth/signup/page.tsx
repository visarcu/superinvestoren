// src/app/auth/signup/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/auth/signin?registered=1')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-lg space-y-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center font-orbitron">
          Account erstellen
        </h1>

        {error && (
          <div className="bg-red-800 text-red-200 px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <input
            type="password"
            placeholder="Passwort (mind. 8 Zeichen)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition"
        >
          Registrieren
        </button>

        <p className="text-sm text-center text-gray-400">
          Schon einen Account?{' '}
          <a href="/auth/signin" className="text-accent hover:underline">
            Jetzt anmelden
          </a>
        </p>
      </form>
    </div>
  )
}