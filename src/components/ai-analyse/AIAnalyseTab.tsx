'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AIAnalyseInput from './AIAnalyseInput'
import AIAnalyseOutput from './AIAnalyseOutput'
import AIAnalyseLoading from './AIAnalyseLoading'
import { ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import type { User } from '@supabase/supabase-js'

interface AnalysisResult {
  analysis: string
  ticker: string
  companyName: string
  currentPrice: number
  marketCap: number
  fairValue: number
  timestamp: string
}

interface AIAnalyseTabProps {
  ticker?: string // Optional: pre-fill ticker (e.g., from stock page)
}

const SESSION_STORAGE_KEY = 'finclue_ai_analysis_result'

export default function AIAnalyseTab({ ticker: initialTicker }: AIAnalyseTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check auth state on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
        setAccessToken(session?.access_token || null)
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAccessToken(session?.access_token || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load cached result from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as AnalysisResult
        // Check if the cached result is still valid (less than 30 minutes old)
        const timestamp = new Date(parsed.timestamp).getTime()
        const now = Date.now()
        const thirtyMinutes = 30 * 60 * 1000
        if (now - timestamp < thirtyMinutes) {
          setResult(parsed)
        } else {
          // Clear expired cache
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
    } catch (err) {
      console.error('Error loading cached analysis:', err)
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

  const handleAnalyze = useCallback(async (ticker: string) => {
    if (!accessToken) {
      setError('Bitte melde dich an, um AI-Analysen zu nutzen.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ai-analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ ticker })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analyse fehlgeschlagen')
      }

      const newResult = {
        analysis: data.analysis,
        ticker: data.ticker,
        companyName: data.companyName,
        currentPrice: data.currentPrice,
        marketCap: data.marketCap,
        fairValue: data.fairValue,
        timestamp: data.timestamp
      }
      setResult(newResult)

      // Save to sessionStorage for persistence across page refreshes
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newResult))
      } catch (err) {
        console.error('Error saving analysis to session:', err)
      }
    } catch (err) {
      console.error('AI Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  // Loading auth state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-theme-secondary rounded-full flex items-center justify-center mb-4">
          <LockClosedIcon className="w-8 h-8 text-theme-muted" />
        </div>
        <h3 className="text-xl font-semibold text-theme-primary mb-2">Anmeldung erforderlich</h3>
        <p className="text-theme-muted text-center max-w-md mb-6">
          Melde dich an, um AI-gestützte DCF-Analysen für beliebige Aktien zu erstellen.
        </p>
        <a
          href="/auth/signin"
          className="px-6 py-3 bg-brand hover:bg-brand/90 text-white rounded-lg font-medium transition-colors"
        >
          Jetzt anmelden
        </a>
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-sm font-medium mb-4">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          AI-Powered
        </div>
        <h2 className="text-2xl font-bold text-theme-primary mb-2">
          Automatische DCF-Bewertung
        </h2>
        <p className="text-theme-muted max-w-2xl mx-auto">
          Gib einen Ticker ein und unsere AI erstellt eine professionelle DCF-Analyse
          mit fairem Wert, Szenarien und Investment-Einschätzung.
        </p>
      </div>

      {/* Input */}
      {!isLoading && !result && (
        <AIAnalyseInput
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          initialTicker={initialTicker}
        />
      )}

      {/* Loading State */}
      {isLoading && <AIAnalyseLoading />}

      {/* Error State */}
      {error && (
        <div className="max-w-xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-500 mb-1">Fehler bei der Analyse</h3>
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 px-4 py-2 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded-lg text-sm transition-colors"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <>
          <AIAnalyseOutput
            analysis={result.analysis}
            ticker={result.ticker}
            companyName={result.companyName}
            currentPrice={result.currentPrice}
            marketCap={result.marketCap}
            fairValue={result.fairValue}
            timestamp={result.timestamp}
            accessToken={accessToken}
          />

          {/* New Analysis Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                setResult(null)
                setError(null)
                // Clear session storage when starting a new analysis
                sessionStorage.removeItem(SESSION_STORAGE_KEY)
              }}
              className="px-6 py-3 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded-lg font-medium transition-colors"
            >
              Neue Analyse starten
            </button>
          </div>
        </>
      )}
    </div>
  )
}
