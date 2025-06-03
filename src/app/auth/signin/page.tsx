// src/app/auth/signin/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import GoogleSignInButton from '@/components/GoogleSignInButton'

export default function SigninPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [info, setInfo]         = useState<string | null>(null)
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    if (params?.get('registered') === '1') {
      setInfo('Dein Account wurde erstellt! Bitte logge dich ein.')
    }
    if (params?.get('verified') === '1') {
      setInfo('E-Mail bestätigt! Du kannst dich jetzt einloggen.')
    }
  }, [params])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md bg-gray-800 p-8 rounded-lg">
        <h1 className="text-3xl font-bold text-white text-center">Anmelden</h1>
        {info && (
          <p className="bg-green-800 text-green-200 px-4 py-2 rounded-lg text-center">
            {info}
          </p>
        )}
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
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition"
        >
          Anmelden
        </button>

        <GoogleSignInButton />

        <p className="text-sm text-center text-gray-400">
          Noch keinen Account?{' '}
          <a href="/auth/signup" className="text-accent hover:underline">
            Jetzt registrieren
          </a>
        </p>
      </form>
    </div>
  )
}