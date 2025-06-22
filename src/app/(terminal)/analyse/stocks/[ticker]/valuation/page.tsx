// src/app/analyse/[ticker]/valuation/page.tsx - mit Theme Support + Grid Background
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ProfessionalValuationTable from '@/components/ProfessionalValuationTable'
import { supabase } from '@/lib/supabaseClient'
import { 
  CalculatorIcon,
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function ValuationPage() {
  const params = useParams()
  const ticker = params.ticker as string
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // ✅ User-Daten laden (wie in deinem AnalysisClient)
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Premium Status holen
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('[ValuationPage] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  if (loadingUser) {
    return (
      <div className="p-6 bg-theme-primary noise-bg min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-theme-secondary">Lade Bewertungsdaten...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-theme-primary noise-bg min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <CalculatorIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-theme-primary to-theme-secondary bg-clip-text text-transparent">
              {ticker.toUpperCase()} Bewertungsanalyse
            </h1>
            <p className="text-theme-secondary text-lg">
              Professionelle Bewertungsmetriken und Ratio-Vergleiche
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-sm w-fit">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <span>Live Bewertungsdaten</span>
        </div>
      </div>

      {/* Main Content */}
      <ProfessionalValuationTable 
        ticker={ticker} 
        isPremium={user?.isPremium || false}
      />

      {/* Additional Sections mit Theme Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-theme-card/70 backdrop-blur-sm border border-theme rounded-xl p-6 hover:border-border-hover transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
          </div>
          <p className="text-theme-secondary text-sm mb-4">
            Coming soon - Vergleich mit Branchenkonkurrenten
          </p>
          <div className="bg-theme-secondary/20 rounded-lg p-3 border-l-4 border-blue-400">
            <p className="text-xs text-theme-muted">
              🚀 Bald verfügbar: Automatischer Vergleich mit Top-Konkurrenten in der Branche
            </p>
          </div>
        </div>
        
        <div className="bg-theme-card/70 backdrop-blur-sm border border-theme rounded-xl p-6 hover:border-border-hover transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary">DCF Modell</h3>
          </div>
          <p className="text-theme-secondary text-sm mb-4">
            Coming soon - Discounted Cash Flow Bewertung
          </p>
          <div className="bg-theme-secondary/20 rounded-lg p-3 border-l-4 border-green-400">
            <p className="text-xs text-theme-muted">
              📊 Bald verfügbar: Interaktives DCF-Modell mit anpassbaren Parametern
            </p>
          </div>
        </div>
      </div>

      {/* Premium Hinweis für erweiterte Features */}
      {!user?.isPremium && (
        <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10 border border-theme rounded-2xl p-8 text-center backdrop-blur-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
            <CalculatorIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-theme-primary mb-4">Erweiterte Bewertungstools</h3>
          <p className="text-theme-secondary mb-8 max-w-2xl mx-auto text-lg">
            Erhalte Zugang zu interaktiven DCF-Modellen, Peer-Vergleichen, Monte-Carlo-Simulationen 
            und professionellen Bewertungsberichten für {ticker.toUpperCase()} und 3000+ weitere Aktien.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>DCF-Modell</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Peer-Vergleich</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Monte-Carlo</span>
            </div>
          </div>
          <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl hover:from-purple-400 hover:to-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl">
            Premium freischalten - Nur 9€/Monat
          </button>
        </div>
      )}
    </div>
  )
}