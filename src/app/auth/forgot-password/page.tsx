// src/app/auth/forgot-password/page.tsx - FIXED VERSION
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeftIcon, EnvelopeIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    if (!email) {
      setError('Bitte gib deine E-Mail an')
      setIsLoading(false)
      return
    }

    try {
      // Debug: Log Supabase Client
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Has anon key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      // Direkte Supabase-Integration statt eigene API
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        console.error('Reset Password Error:', error)
        setError(`Fehler: ${error.message}`)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      console.error('[Forgot Password] Error:', err)
      setError('Fehler beim Senden der E-Mail.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Back Button */}
      <div className="absolute -top-2 -left-2">
        <Link
          href="/auth/signin"
          className="flex items-center gap-2 px-3 py-2 text-theme-secondary hover:text-theme-primary transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Zurück
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-end gap-0.5">
            <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
            <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
            <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
          </div>
          <span className="text-lg font-bold text-theme-primary">FinClue</span>
        </div>
        <h1 className="text-2xl font-bold text-theme-primary mb-2">
          Passwort vergessen?
        </h1>
        <p className="text-theme-secondary">
          Kein Problem. Wir senden dir einen Reset-Link per E-Mail.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 justify-center">
            <CheckIcon className="w-4 h-4 text-green-400" />
            <p className="text-green-400 text-sm">
              Reset-Link wurde versandt. Prüfe dein Postfach (auch Spam-Ordner)!
            </p>
          </div>
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-theme-primary">
            E-Mail-Adresse
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-theme-muted" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-theme-secondary border border-theme rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
              placeholder="deine@email.de"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
          ) : (
            'Reset-Link senden'
          )}
        </button>
      </form>

      {/* Back to Sign In */}
      <div className="text-center mt-6">
        <p className="text-theme-secondary text-sm">
          Erinnerst du dich wieder?{' '}
          <Link href="/auth/signin" className="text-green-400 hover:text-green-300 font-medium transition-colors">
            Hier einloggen
          </Link>
        </p>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-theme-secondary/50 border border-theme rounded-xl p-4">
        <h3 className="text-sm font-semibold text-theme-primary mb-2">So funktioniert's:</h3>
        <ul className="space-y-1 text-xs text-theme-secondary">
          <li className="flex items-start gap-2">
            <CheckIcon className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
            <span>E-Mail eingeben und Reset-Link anfordern</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Link in der E-Mail anklicken (gültig für 1 Stunde)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Neues Passwort festlegen und fertig</span>
          </li>
        </ul>
        <p className="text-xs text-theme-muted mt-2">
          Probleme? Schreib uns an{' '}
          <a href="mailto:team@finclue.de" className="text-green-400 hover:text-green-300 transition-colors">
            team@finclue.de
          </a>
        </p>
      </div>
    </>
  )
}