// src/app/auth/signin/page.tsx - MODERNISIERTE VERSION
'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

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

// Moderne Message Komponenten
function MessageBox({ message, type }: { message: string; type: 'error' | 'success' }) {
  if (type === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-red-400 text-sm">!</span>
          </div>
          <p className="text-red-300 text-sm font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-green-400 text-sm">✓</span>
        </div>
        <p className="text-green-300 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

export default function ModernSigninPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 noise-bg px-4">
      {/* Subtle background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Main Form Card */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Willkommen zurück
            </h1>
            <p className="text-gray-400 text-sm">
              Melde dich an, um fortzufahren
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-6">
            {info && <MessageBox message={info} type="success" />}
            {error && <MessageBox message={error} type="error" />}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="email"
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Dein Passwort"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900 px-2 text-gray-500">oder</span>
              </div>
            </div>

            {/* Google Sign In */}
            <GoogleSignInButton />
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            {/* Forgot Password */}
            <div className="text-center">
              <a 
                href="/auth/forgot-password"
                className="text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                Passwort vergessen?
              </a>
            </div>

            {/* Sign Up Link */}
            <div className="text-center text-sm text-gray-400">
              Noch keinen Account?{' '}
              <a href="/auth/signup" className="text-green-400 hover:text-green-300 font-medium transition-colors">
                Jetzt registrieren
              </a>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Sicher verschlüsselt</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>DSGVO-konform</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}