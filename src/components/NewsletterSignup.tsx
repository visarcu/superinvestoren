'use client'
import React, { useState, FormEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

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

  // Success State - Subtle improvement
  if (status === 'success') {
    return (
      <div className="text-center max-w-md mx-auto">
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
             className="p-6 border rounded-xl">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Erfolgreich angemeldet!
          </h3>
          <p className="text-theme-secondary text-sm mb-4">
            {message}
          </p>
          <button
            onClick={() => {
              setStatus('idle')
              setMessage('')
            }}
            className="text-sm text-theme-secondary hover:text-white transition-colors"
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
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="
              w-full px-4 py-3 rounded-lg
              border
              text-white placeholder-theme-secondary
              focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20
              hover:bg-theme-hover
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={status === 'loading'}
          className="
            px-6 py-3 
            bg-green-500 hover:bg-green-400
            text-black font-medium rounded-lg
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 hover:scale-[1.02]
            flex items-center justify-center gap-2
            whitespace-nowrap
          "
        >
          {status === 'loading' ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-black/30 border-t-black rounded-full"></div>
              <span>Wird angemeldet...</span>
            </>
          ) : (
            'Abonnieren'
          )}
        </button>
      </form>

      {/* Error Message */}
      {status === 'error' && message && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">
            {message}
          </p>
        </div>
      )}
    </div>
  )
}