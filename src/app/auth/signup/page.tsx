// src/app/auth/signup/page.tsx - MODERNISIERTE VERSION
'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react'

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

// Password Strength Indicator
function PasswordStrength({ password }: { password: string }) {
  const requirements = [
    { text: 'Mindestens 6 Zeichen', met: password.length >= 6 },
    { text: 'Ein Großbuchstabe', met: /[A-Z]/.test(password) },
    { text: 'Eine Zahl', met: /\d/.test(password) },
  ];

  if (password.length === 0) return null;

  return (
    <div className="space-y-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          {req.met ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <div className="w-3 h-3 rounded-full border border-gray-600"></div>
          )}
          <span className={req.met ? 'text-green-400' : 'text-gray-500'}>
            {req.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ModernSignupPage() {
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
        // Weiterleitung nach kurzer Verzögerung
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 noise-bg px-4 py-8">
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
              Account erstellen
            </h1>
            <p className="text-gray-400 text-sm">
              Starte deine Investment-Reise mit Finclue
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-6">
            {success && <MessageBox message={success} type="success" />}
            {error && <MessageBox message={error} type="error" />}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Vollständiger Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Max Mustermann"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

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
                  placeholder="Sicheres Passwort wählen"
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
              {/* Password Strength */}
              <PasswordStrength password={password} />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Passwort wiederholen"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              {/* Terms & Conditions */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-green-500 bg-gray-800 border-gray-700 rounded focus:ring-green-500 focus:ring-2"
                  required
                />
                <span className="text-sm text-gray-300">
                  Ich akzeptiere die{' '}
                  <a href="/terms" target="_blank" className="text-green-400 hover:text-green-300 underline">
                    Nutzungsbedingungen
                  </a>
                  {' '}und{' '}
                  <a href="/privacy" target="_blank" className="text-green-400 hover:text-green-300 underline">
                    Datenschutzerklärung
                  </a>
                </span>
              </label>

              {/* Newsletter Opt-in */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsletterOptIn}
                  onChange={e => setNewsletterOptIn(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-green-500 bg-gray-800 border-gray-700 rounded focus:ring-green-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">
                  Ja, ich möchte über neue Features und Investment-Insights informiert werden (optional)
                </span>
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  Account wird erstellt...
                </>
              ) : (
                'Account erstellen'
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

            {/* Google Sign Up */}
            <GoogleSignInButton />
          </form>

          {/* Footer Links */}
          <div className="mt-8">
            {/* Sign In Link */}
            <div className="text-center text-sm text-gray-400">
              Bereits einen Account?{' '}
              <a href="/auth/signin" className="text-green-400 hover:text-green-300 font-medium transition-colors">
                Jetzt anmelden
              </a>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Kostenlos starten</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Jederzeit kündbar</span>
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