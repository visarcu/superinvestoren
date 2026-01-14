// src/app/auth/signup/page.tsx - CLEAN FEY STYLE DESIGN
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline'

// Deutsche Fehlermeldungen
function translateAuthError(error: string): string {
  const errorMap: { [key: string]: string } = {
    'User already registered': 'Ein Account mit dieser E-Mail existiert bereits',
    'Invalid email': 'Ungültige E-Mail-Adresse',
    'Password should be at least 6 characters': 'Passwort muss mindestens 6 Zeichen lang sein',
    'Signup disabled': 'Registrierung ist derzeit deaktiviert',
    'Too many requests': 'Zu viele Versuche. Bitte warten Sie einen Moment',
    'Rate limit exceeded': 'Zu viele Versuche. Bitte warten Sie einen Moment',
    'fetch': 'Verbindungsfehler. Prüfen Sie Ihre Internetverbindung',
    'network': 'Netzwerkfehler. Bitte versuchen Sie es erneut',
    'timeout': 'Zeitüberschreitung. Bitte versuchen Sie es erneut',
  }

  for (const [englishError, germanTranslation] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(englishError.toLowerCase())) {
      return germanTranslation
    }
  }

  return error
}

// Password Strength Indicator - Clean Style
function PasswordStrength({ password }: { password: string }) {
  const requirements = [
    { text: 'Min. 6 Zeichen', met: password.length >= 6 },
    { text: 'Großbuchstabe', met: /[A-Z]/.test(password) },
    { text: 'Zahl', met: /\d/.test(password) },
  ]

  if (password.length === 0) return null

  return (
    <div className="flex items-center gap-3 mt-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-1.5 text-xs">
          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
            req.met ? 'bg-emerald-500' : 'bg-neutral-800'
          }`}>
            {req.met && <CheckIcon className="w-2 h-2 text-white" />}
          </div>
          <span className={req.met ? 'text-neutral-300' : 'text-neutral-600'}>
            {req.text}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/analyse`
        }
      })
      if (error) {
        setError('Google-Registrierung fehlgeschlagen')
      }
    } catch (error) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validierung
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    if (!acceptTerms) {
      setError('Bitte akzeptiere die Nutzungsbedingungen')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            newsletter_opt_in: newsletterOptIn,
          }
        }
      })

      if (error) {
        const translatedError = translateAuthError(error.message)
        setError(translatedError)
      } else {
        setSuccess('Account erstellt! Bitte überprüfe deine E-Mails.')
        setTimeout(() => {
          router.push('/auth/signin?registered=1')
        }, 2000)
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Title */}
      <h1 className="text-xl font-semibold text-white text-center mb-6">
        Registrieren
      </h1>

      {/* Messages */}
      {success && (
        <div className="mb-4 py-2.5 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-400 text-sm text-center">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 py-2.5 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Name Field */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm text-neutral-400">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors text-sm"
            placeholder="Max Mustermann"
            disabled={loading}
          />
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-neutral-400">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors text-sm"
            placeholder="name@beispiel.de"
            disabled={loading}
          />
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-neutral-400">
            Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm text-neutral-400">
            Passwort bestätigen
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2.5 pt-1">
          {/* Terms & Conditions */}
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
              acceptTerms
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-neutral-600 group-hover:border-neutral-500'
            }`}>
              {acceptTerms && <CheckIcon className="w-2.5 h-2.5 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="sr-only"
              required
            />
            <span className="text-xs text-neutral-500 leading-relaxed">
              Ich akzeptiere die{' '}
              <Link href="/terms" target="_blank" className="text-neutral-300 hover:text-emerald-400 transition-colors">
                AGB
              </Link>
              {' '}und{' '}
              <Link href="/privacy" target="_blank" className="text-neutral-300 hover:text-emerald-400 transition-colors">
                Datenschutzerklärung
              </Link>
            </span>
          </label>

          {/* Newsletter Opt-in */}
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
              newsletterOptIn
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-neutral-600 group-hover:border-neutral-500'
            }`}>
              {newsletterOptIn && <CheckIcon className="w-2.5 h-2.5 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(e) => setNewsletterOptIn(e.target.checked)}
              className="sr-only"
            />
            <span className="text-xs text-neutral-500">
              Updates zu neuen Features erhalten
            </span>
          </label>
        </div>

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center text-white text-sm mt-4"
          style={{ backgroundColor: loading ? 'rgba(16, 185, 129, 0.5)' : '#10b981' }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#34d399')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#10b981')}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Account erstellen'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-neutral-800"></div>
        <span className="text-xs text-neutral-600">oder</span>
        <div className="flex-1 h-px bg-neutral-800"></div>
      </div>

      {/* OAuth Buttons - Icon Style like Quartr */}
      <div className="flex justify-center">
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-12 h-12 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
          title="Mit Google registrieren"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </button>
      </div>

      {/* Sign In Link */}
      <p className="text-center mt-6 text-sm text-neutral-500">
        Bereits einen Account?{' '}
        <Link
          href="/auth/signin"
          className="text-white hover:text-emerald-400 transition-colors font-medium"
        >
          Anmelden
        </Link>
      </p>
    </>
  )
}
