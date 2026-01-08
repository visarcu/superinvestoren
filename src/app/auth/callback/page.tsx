// src/app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage(`Authentifizierung fehlgeschlagen: ${error.message}`)
          
          // Redirect to sign-in after 3 seconds
          setTimeout(() => {
            router.push('/auth/signin')
          }, 3000)
          return
        }

        if (data.session) {
          console.log('✅ Successfully authenticated:', data.session.user.email)
          setStatus('success')
          setMessage('Erfolgreich angemeldet! Weiterleitung...')
          
          // Redirect to home page after 1 second
          setTimeout(() => {
            router.push('/')
          }, 1000)
        } else {
          setStatus('error')
          setMessage('Keine gültige Session gefunden')
          
          setTimeout(() => {
            router.push('/auth/signin')
          }, 3000)
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        setStatus('error')
        setMessage('Ein unerwarteter Fehler ist aufgetreten')
        
        setTimeout(() => {
          router.push('/auth/signin')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900 px-4">
      <div className="w-full max-w-md bg-gray-800/60 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <h1 className="text-xl font-semibold text-white mb-2">Anmeldung wird verarbeitet...</h1>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-brand-light mb-2">Anmeldung erfolgreich!</h1>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-red-400 mb-2">Anmeldung fehlgeschlagen</h1>
            </>
          )}
        </div>
        
        <p className="text-gray-300 text-sm mb-4">{message}</p>
        
        {status === 'error' && (
          <div className="space-y-2">
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Zur Anmeldung
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Zur Startseite
            </button>
          </div>
        )}
      </div>
    </div>
  )
}