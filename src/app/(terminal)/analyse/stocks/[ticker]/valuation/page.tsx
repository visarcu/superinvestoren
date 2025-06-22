// src/app/analyse/[ticker]/valuation/page.tsx - THEME-OPTIMIERTE VERSION
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ProfessionalValuationTable from '@/components/ProfessionalValuationTable'
import { supabase } from '@/lib/supabaseClient'
import { 
  CalculatorIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon
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

  // User-Daten laden
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
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
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted">Lade Bewertungsdaten...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ REDESIGNED Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <CalculatorIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary">
                {ticker.toUpperCase()} Bewertungsanalyse
              </h1>
              <p className="text-theme-muted">
                Professionelle Bewertungsmetriken und Ratio-Vergleiche
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-sm">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span>Live Bewertungsdaten</span>
          </div>
        </div>

        {/* Main Content */}
        <ProfessionalValuationTable 
          ticker={ticker} 
          isPremium={user?.isPremium || false}
        />

        {/* ✅ REDESIGNED Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 hover:bg-theme-tertiary/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
                <p className="text-theme-muted text-sm">Vergleich mit Branchenkonkurrenten</p>
              </div>
            </div>
            <div className="bg-theme-tertiary/30 rounded-lg p-4 border-l-4 border-blue-400">
              <p className="text-sm text-theme-muted">
                🚀 Bald verfügbar: Automatischer Vergleich mit Top-Konkurrenten in der Branche
              </p>
            </div>
          </div>
          
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 hover:bg-theme-tertiary/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">DCF Modell</h3>
                <p className="text-theme-muted text-sm">Discounted Cash Flow Bewertung</p>
              </div>
            </div>
            <div className="bg-theme-tertiary/30 rounded-lg p-4 border-l-4 border-green-400">
              <p className="text-sm text-theme-muted">
                📊 Bald verfügbar: Interaktives DCF-Modell mit anpassbaren Parametern
              </p>
            </div>
          </div>
        </div>

        {/* ✅ REDESIGNED Premium CTA */}
        {!user?.isPremium && (
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <CalculatorIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-3">Erweiterte Bewertungstools</h3>
            <p className="text-theme-muted mb-6 max-w-xl mx-auto">
              Erhalte Zugang zu interaktiven DCF-Modellen, Peer-Vergleichen, Monte-Carlo-Simulationen 
              und professionellen Bewertungsberichten für {ticker.toUpperCase()} und 3000+ weitere Aktien.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>DCF-Modell</span>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Peer-Vergleich</span>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Monte-Carlo</span>
              </div>
            </div>
            
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-400 hover:to-blue-400 transition-all">
              Premium freischalten - Nur 9€/Monat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}