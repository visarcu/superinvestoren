// src/app/(terminal)/analyse/ai/page.tsx - THEME-AWARE DESIGN
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import FinClueAI from '@/components/FinclueAI'
import { supabase } from '@/lib/supabaseClient'
import { 
  SparklesIcon, 
  UserIcon, 
  ArrowRightIcon,
  LockClosedIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function FinClueAIPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const ticker = searchParams?.get('ticker') || null

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          setUser(null)
          setLoading(false)
          return
        }

        // Get premium status
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
        setLoading(false)
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade FinClue AI...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-primary">
        {/* Professional Header */}
        <div className="bg-theme-primary border-b border-theme py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">FinClue AI</h1>
                <p className="text-theme-secondary text-sm">
                  KI-gestützte Aktienanalyse
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign In Required */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-theme-secondary border border-theme rounded-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-theme-tertiary rounded-lg flex items-center justify-center mb-6">
                <UserIcon className="w-8 h-8 text-theme-muted" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-theme-primary">Anmeldung erforderlich</h2>
                <p className="text-theme-secondary text-sm">
                  Du musst angemeldet sein, um FinClue AI zu verwenden.
                </p>
              </div>
              
              <button 
                onClick={() => window.location.href = '/auth/signin'}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
              >
                <span>Jetzt anmelden</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Non-Premium User - Upgrade Required
  if (!user.isPremium) {
    return (
      <div className="min-h-screen bg-theme-primary">
        {/* Professional Header */}
        <div className="bg-theme-primary border-b border-theme py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-theme-primary">FinClue AI</h1>
                  <p className="text-theme-secondary text-sm">
                    KI-gestützte Aktienanalyse • Premium Feature
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-lg">
                <LockClosedIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium text-sm">Premium erforderlich</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Upgrade Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Hero Card */}
            <div className="bg-theme-secondary border border-theme rounded-lg p-8 text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                <SparklesIcon className="w-10 h-10 text-purple-400" />
              </div>
              
              <div className="space-y-4 mb-8">
                <h2 className="text-2xl font-bold text-theme-primary">Erweitere deine Analyse mit KI</h2>
                <p className="text-theme-secondary">
                  FinClue AI analysiert Aktien in Sekunden und gibt dir fundierte Einschätzungen basierend auf Fundamentaldaten, technischen Indikatoren und Markttrends.
                </p>
              </div>
              
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>Premium upgraden</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <SparklesIcon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Intelligente Analyse</h3>
                <p className="text-theme-secondary text-sm">
                  KI-gestützte Bewertung von Fundamentaldaten, Kennzahlen und Marktposition in wenigen Sekunden.
                </p>
              </div>

              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <StarIcon className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Bewertungsempfehlungen</h3>
                <p className="text-theme-secondary text-sm">
                  Erhalte fundierte Einschätzungen zu Kaufs-, Verkaufs- und Haltempfehlungen basierend auf aktuellen Daten.
                </p>
              </div>

              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <SparklesIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Interaktiver Chat</h3>
                <p className="text-theme-secondary text-sm">
                  Stelle spezifische Fragen zu jeder Aktie und erhalte personalisierte, detaillierte Antworten.
                </p>
              </div>

              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                  <StarIcon className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Marktvergleiche</h3>
                <p className="text-theme-secondary text-sm">
                  Vergleiche Aktien mit Branchendurchschnitten und identifiziere unterbewertete Gelegenheiten.
                </p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-8 text-center">
              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Bereit für den nächsten Schritt?</h3>
                <p className="text-theme-secondary text-sm mb-4">
                  Starte noch heute mit Premium und nutze alle Features von FinClue AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => window.location.href = '/pricing'}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-colors"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Premium upgraden
                  </button>
                  <button 
                    onClick={() => window.location.href = '/analyse'}
                    className="px-6 py-2.5 bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/70 hover:text-theme-primary rounded-lg transition font-medium border border-theme"
                  >
                    Zurück zum Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Premium User - Show FinClue AI
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Professional Header */}
      <div className="bg-theme-primary border-b border-theme py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">FinClue AI</h1>
                <p className="text-theme-secondary text-sm">
                  {ticker ? `Analyse von ${ticker.toUpperCase()}` : 'KI-gestützte Aktienanalyse'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg">
              <SparklesIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium text-sm">Premium</span>
            </div>
          </div>
        </div>
      </div>

      {/* FinClue AI Component */}
      <div className="h-[calc(100vh-120px)]">
        <FinClueAI 
          ticker={ticker} 
          isPremium={user.isPremium} 
        />
      </div>
    </div>
  )
}