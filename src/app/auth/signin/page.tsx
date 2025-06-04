// src/app/auth/signin/page.tsx
'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import GoogleSignInButton from '@/components/GoogleSignInButton'

// Deutsche Fehlermeldungen
function translateAuthError(error: string): string {
  const errorMap: { [key: string]: string } = {
    'Invalid login credentials': 'E-Mail oder Passwort ist falsch',
    'invalid login credentials': 'E-Mail oder Passwort ist falsch',
    'Email not confirmed': 'Bitte bestätigen Sie Ihre E-Mail-Adresse',
    'Invalid email': 'Ungültige E-Mail-Adresse',
    'Password should be at least 6 characters': 'Passwort muss mindestens 6 Zeichen lang sein',
    'Too many requests': 'Zu viele Anmeldeversuche. Bitte warten Sie einen Moment',
    'Rate limit exceeded': 'Zu viele Versuche. Bitte warten Sie einen Moment',
    'User not found': 'Kein Benutzer mit dieser E-Mail-Adresse gefunden',
    'fetch': 'Verbindungsfehler. Prüfen Sie Ihre Internetverbindung',
    'network': 'Netzwerkfehler. Bitte versuchen Sie es erneut',
    'timeout': 'Zeitüberschreitung. Bitte versuchen Sie es erneut',
  };

  for (const [englishError, germanTranslation] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(englishError.toLowerCase())) {
      return germanTranslation;
    }
  }

  return error; // Fallback
}

// Schöne Error/Success Komponenten
function MessageBox({ message, type }: { message: string; type: 'error' | 'success' }) {
  if (type === 'error') {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-red-400 text-xl">⚠️</span>
          <p className="text-red-300 text-sm font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-green-400 text-xl">✅</span>
        <p className="text-green-300 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

export default function SigninPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        const translatedError = translateAuthError(error.message)
        setError(translatedError)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-gray-800/60 backdrop-blur-md p-8 rounded-2xl shadow-2xl space-y-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center font-orbitron">
          Willkommen zurück
        </h1>

        {/* Success Messages */}
        {info && <MessageBox message={info} type="success" />}

        {/* Error Messages */}
        {error && <MessageBox message={error} type="error" />}

        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent transition"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent transition"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 disabled:bg-gray-600 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              Anmelden...
            </>
          ) : (
            'Anmelden'
          )}
        </button>

        <GoogleSignInButton />

        {/* Forgot Password Link */}
        <div className="text-center">
        <a 
  href="/auth/forgot-password"  // ✅ RICHTIG!
  className="text-sm text-gray-400 hover:text-accent transition"
>
  Passwort vergessen?
</a>
        </div>

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