// src/components/GoogleSignInButton.tsx
'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })
    setLoading(false)
    if (error) {
      console.error('Google-Login-Fehler:', error.message)
      setError('Google Anmeldung fehlgeschlagen.')
    }
    // Bei Erfolg wird automatisch auf deine Redirect-URL weitergeleitet.
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 transition"
      >
        {loading ? 'Bitte warten…' : 'Mit Google anmelden'}
      </button>
      {error && (
        <p className="text-red-400 text-center text-sm">
          {error}
        </p>
      )}
    </div>
  )
}