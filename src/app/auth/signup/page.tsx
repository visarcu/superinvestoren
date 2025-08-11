// src/app/auth/signup/page.tsx - NEW THEME DESIGN
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

// Deutsche Fehlermeldungen
function translateAuthError(error: string): string {
  const errorMap: { [key: string]: string } = {
    'User already registered': 'Ein Account mit dieser E-Mail-Adresse existiert bereits',
    'Invalid email': 'Ungültige E-Mail-Adresse',
    'Password should be at least 6 characters': 'Passwort muss mindestens 6 Zeichen lang sein',
    'Signup disabled': 'Registrierung ist derzeit deaktiviert',
    'Too many requests': 'Zu viele Registrierungsversuche. Bitte warten Sie einen Moment',
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

// Password Strength Indicator
function PasswordStrength({ password }: { password: string }) {
  const requirements = [
    { text: 'Mindestens 6 Zeichen', met: password.length >= 6 },
    { text: 'Ein Großbuchstabe', met: /[A-Z]/.test(password) },
    { text: 'Eine Zahl', met: /\d/.test(password) },
  ]

  if (password.length === 0) return null

  return (
    <div className="space-y-1.5">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          {req.met ? (
            <CheckCircleIcon className="w-3 h-3 text-green-500" />
          ) : (
            <div style={{ borderColor: 'var(--border-color)' }} className="w-3 h-3 rounded-full border"></div>
          )}
          <span className={req.met ? 'text-green-400' : 'text-theme-secondary'}>
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
      setError('Bitte akzeptieren Sie die Nutzungsbedingungen')
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
        setSuccess('Account erstellt! Bitte überprüfen Sie Ihre E-Mails zur Bestätigung.')
        setTimeout(() => {
          router.push('/auth/signin?registered=1')
        }, 2000)
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Header Text */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-end gap-0.5">
            <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
            <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
            <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
          </div>
          <span className="text-base font-bold text-white">FinClue</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">
          Account erstellen
        </h1>
        <p className="text-theme-secondary text-sm">
          Starte deine Investment-Reise
        </p>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-xs">!</span>
            </div>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Name Field */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-white">
            Vollständiger Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-4 w-4 text-theme-secondary" />
            </div>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-white placeholder-theme-secondary focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="Max Mustermann"
              disabled={loading}
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-white">
            E-Mail-Adresse
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-4 w-4 text-theme-secondary" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-white placeholder-theme-secondary focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="name@beispiel.de"
              disabled={loading}
            />
          </div>
        </div>
        
        {/* Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-white">
            Passwort
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-4 w-4 text-theme-secondary" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="w-full pl-9 pr-10 py-2.5 border rounded-lg text-white placeholder-theme-secondary focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="Passwort wählen"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-secondary hover:text-white transition-colors"
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
          <label htmlFor="confirmPassword" className="text-sm font-medium text-white">
            Passwort bestätigen
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-4 w-4 text-theme-secondary" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="w-full pl-9 pr-10 py-2.5 border rounded-lg text-white placeholder-theme-secondary focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="Passwort wiederholen"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-secondary hover:text-white transition-colors"
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
        <div className="space-y-3">
          {/* Terms & Conditions */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="mt-0.5 w-4 h-4 text-green-500 border rounded focus:ring-green-500 focus:ring-2"
              required
            />
            <span className="text-sm text-theme-secondary">
              Ich akzeptiere die{' '}
              <Link href="/terms" target="_blank" className="text-green-400 hover:text-green-300 underline">
                Nutzungsbedingungen
              </Link>
              {' '}und{' '}
              <Link href="/privacy" target="_blank" className="text-green-400 hover:text-green-300 underline">
                Datenschutzerklärung
              </Link>
            </span>
          </label>

          {/* Newsletter Opt-in */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(e) => setNewsletterOptIn(e.target.checked)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="mt-0.5 w-4 h-4 text-green-500 border rounded focus:ring-green-500 focus:ring-2"
            />
            <span className="text-sm text-theme-secondary">
              Ja, ich möchte über neue Features informiert werden (optional)
            </span>
          </label>
        </div>

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              Account wird erstellt...
            </>
          ) : (
            'Account erstellen'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div style={{ backgroundColor: 'var(--border-color)' }} className="flex-1 h-px"></div>
        <span className="text-xs text-theme-secondary">oder</span>
        <div style={{ backgroundColor: 'var(--border-color)' }} className="flex-1 h-px"></div>
      </div>

      {/* Google Sign Up */}
      <button
        onClick={handleGoogleSignUp}
        disabled={loading}
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        className="w-full py-2.5 hover:bg-theme-hover border text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
        Mit Google registrieren
      </button>

      {/* Sign In Link */}
      <div className="text-center mt-4">
        <p className="text-theme-secondary text-xs">
          Bereits einen Account?{' '}
          <Link 
            href="/auth/signin" 
            className="text-green-400 hover:text-green-300 font-medium transition-colors"
          >
            Jetzt anmelden
          </Link>
        </p>
      </div>

      {/* Trust Indicators */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-theme-secondary">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>Kostenlos starten</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>DSGVO-konform</span>
          </div>
        </div>
      </div>
    </>
  )
}