'use client'
import React, { useState, FormEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface NewsletterSignupProps {
  variant?: 'dark' | 'light'
}

export default function NewsletterSignup({ variant = 'dark' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const isLight = variant === 'light'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!email.trim()) {
      setStatus('error')
      setMessage('Bitte gib eine E-Mail-Adresse ein')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message || 'Vielen Dank für deine Anmeldung!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Da ist etwas schiefgegangen. Bitte versuche es nochmal.')
      }
    } catch (error) {
      console.error('Newsletter signup error:', error)
      setStatus('error')
      setMessage('Verbindungsfehler. Bitte prüfe deine Internetverbindung.')
    }
  }

  // Success State
  if (status === 'success') {
    return (
      <div className="text-center max-w-md mx-auto">
        <div className={`p-6 border rounded-xl ${
          isLight
            ? 'bg-white border-gray-200'
            : 'bg-[var(--bg-card)] border-[var(--border-color)]'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
            isLight ? 'bg-emerald-100' : 'bg-theme-secondary/20'
          }`}>
            <span className="text-2xl">✅</span>
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Erfolgreich angemeldet!
          </h3>
          <p className={`text-sm mb-4 ${isLight ? 'text-gray-500' : 'text-theme-secondary'}`}>
            {message}
          </p>
          <button
            onClick={() => {
              setStatus('idle')
              setMessage('')
            }}
            className={`text-sm transition-colors ${
              isLight
                ? 'text-gray-500 hover:text-gray-900'
                : 'text-theme-secondary hover:text-white'
            }`}
          >
            Weitere E-Mail hinzufügen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <input
            type="email"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            className={`
              w-full px-4 py-3 rounded-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              ${isLight
                ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400'
                : 'bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 focus:bg-white/10'
              }
            `}
            required
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className={`
            px-6 py-3 font-medium rounded-lg
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center justify-center gap-2
            whitespace-nowrap
            ${isLight
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-white/90'
            }
          `}
        >
          {status === 'loading' ? (
            <>
              <div className={`animate-spin w-4 h-4 border-2 rounded-full ${
                isLight
                  ? 'border-white/30 border-t-white'
                  : 'border-black/30 border-t-black'
              }`}></div>
              <span>Wird angemeldet...</span>
            </>
          ) : (
            'Abonnieren'
          )}
        </button>
      </form>

      {/* Error Message */}
      {status === 'error' && message && (
        <div className={`mt-3 p-3 rounded-lg ${
          isLight
            ? 'bg-red-50 border border-red-200'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <p className={`text-sm ${isLight ? 'text-red-600' : 'text-red-400'}`}>
            {message}
          </p>
        </div>
      )}
    </div>
  )
}