// src/app/auth/forgot-password/page.tsx - CLEAN VERSION
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeftIcon, ShieldCheckIcon, CheckIcon } from '@heroicons/react/24/outline'

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
        redirectTo: `${window.location.origin}/auth/reset-password`,
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
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Hero Section - Gleicher Stil wie Pricing */}
      <div className="bg-gray-950 noise-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            
            {/* Back Button */}
            <div className="absolute left-4 top-4 lg:left-8 lg:top-8">
              <Link
                href="/auth/signin"
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Zurück
              </Link>
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                Passwort vergessen
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Kein Problem. Wir senden dir einen Reset-Link per E-Mail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Zentriert und Clean */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Linke Spalte: Reset Form */}
          <div className="lg:col-span-2 bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm">
            
            {/* Fehlermeldung */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Erfolgsmeldung */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  Reset-Link wurde versandt. Prüfe dein Postfach (auch Spam-Ordner)!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* E-Mail Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  placeholder="deine@email.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-lg
                    bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                    transition
                  "
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  w-full py-3 px-4 bg-green-500 text-black font-medium rounded-lg
                  hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed
                  transition flex items-center justify-center gap-2
                "
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                ) : (
                  'Reset-Link senden'
                )}
              </button>

              {/* Back to Sign In */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-400">
                  Erinnerst du dich wieder?{' '}
                  <Link href="/auth/signin" className="text-green-400 hover:text-green-300 transition">
                    Hier einloggen
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Rechte Spalte: Info Card */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">So funktioniert's</h3>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">
                  E-Mail eingeben und Reset-Link anfordern
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">
                  Link in der E-Mail anklicken (gültig für 1 Stunde)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">
                  Neues Passwort festlegen und fertig
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">
                  Probleme? Schreib uns an{' '}
                  <Link href="mailto:team.finclue@gmail.com" className="text-green-400 hover:text-green-300 transition">
                    team@finclue.de
                  </Link>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Indicators - Wie bei anderen Auth-Seiten */}
        <div className="flex items-center justify-center gap-8 text-xs text-gray-500 pt-12">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
            <span>Sicher verschlüsselt</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-green-400" />
            <span>DSGVO-konform</span>
          </div>
        </div>
      </div>
    </div>
  )
}