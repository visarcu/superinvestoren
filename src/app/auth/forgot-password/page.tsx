// src/app/auth/forgot-password/page.tsx - QUARTR STYLE CENTERED DESIGN
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

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
      {/* Title */}
      <h1 className="text-xl font-semibold text-white text-center mb-6">
        Passwort zurücksetzen
      </h1>

      {/* Success State */}
      {success ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-neutral-400 text-sm">
              Reset-Link an <span className="text-white">{email}</span> gesendet.
              Prüfe auch deinen Spam-Ordner.
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="inline-block text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            Zurück zum Login
          </Link>
        </div>
      ) : (
        <>
          {/* Error Message */}
          {error && (
            <div className="mb-4 py-2.5 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

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
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: isLoading ? 'rgba(16, 185, 129, 0.5)' : '#10b981' }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#34d399')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Reset-Link senden'
              )}
            </button>
          </form>

          {/* Back Link */}
          <p className="text-center mt-6 text-sm text-neutral-500">
            <Link
              href="/auth/signin"
              className="text-white hover:text-emerald-400 transition-colors font-medium inline-flex items-center gap-1.5"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Zurück zum Login
            </Link>
          </p>
        </>
      )}
    </>
  )
}
