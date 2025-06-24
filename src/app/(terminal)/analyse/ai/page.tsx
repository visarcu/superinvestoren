// src/app/analyse/ai/page.tsx - UNIFIED FinClue AI Page
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import FinClueAI from '@/components/FinclueAI'
import { supabase } from '@/lib/supabaseClient'
import { preparePortfolioDataForAI } from '@/lib/superinvestorDataService'
import { 
  SparklesIcon, 
  UserIcon, 
  ArrowRightIcon,
  LockClosedIcon,
  StarIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function UnifiedFinClueAIPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [portfolioData, setPortfolioData] = useState<any>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // ✅ Extract URL parameters for context
  const ticker = searchParams?.get('ticker')?.toUpperCase() || null
  const investor = searchParams?.get('investor') || null
  
  console.log('🎯 Unified AI loaded with context:', { ticker, investor })

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

  // ✅ Load portfolio data if investor context is provided
  useEffect(() => {
    async function loadPortfolioData() {
      if (!investor) {
        setPortfolioData(null)
        return
      }

      setPortfolioLoading(true)
      try {
        console.log(`👑 Loading portfolio data for: ${investor}`)
        const data = preparePortfolioDataForAI(investor)
        setPortfolioData(data)
        console.log(`✅ Portfolio data loaded for ${investor}:`, {
          hasData: !!data,
          totalValue: data?.totalValue,
          positionsCount: data?.positionsCount
        })
      } catch (error) {
        console.error(`❌ Error loading portfolio data for ${investor}:`, error)
        setPortfolioData(null)
      } finally {
        setPortfolioLoading(false)
      }
    }

    loadPortfolioData()
  }, [investor])

  // ✅ Generate dynamic welcome message based on context
  const getContextualWelcome = () => {
    if (ticker && investor) {
      return `Hallo! Ich bin FinClue AI im Hybrid-Modus. Ich habe sowohl ${ticker.toUpperCase()}-Daten als auch ${investor} Portfolio-Informationen geladen. Frag mich alles über die Verbindung zwischen beiden!`
    }
    if (ticker) {
      return `Hallo! Ich bin FinClue AI mit ${ticker.toUpperCase()}-Fokus. Ich habe aktuelle Finanzdaten, Quartalszahlen und News geladen. Du kannst aber auch andere Ticker oder Investoren erwähnen!`
    }
    if (investor) {
      return `Hallo! Ich bin FinClue AI mit ${investor} Portfolio-Fokus. Ich habe die neuesten Portfolio-Daten und 13F-Filings geladen. Du kannst aber auch spezifische Aktien erwähnen!`
    }
    return undefined // Use default welcome message
  }

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-theme-primary">FinClue AI</h1>
                  <p className="text-theme-secondary text-sm">
                    {ticker ? `Analyse von ${ticker.toUpperCase()}` : 
                     investor ? `Portfolio-Analyse für ${investor}` : 
                     'Intelligente Finanzanalyse mit automatischer Erkennung'}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Zurück</span>
              </button>
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
                
                {(ticker || investor) && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <InformationCircleIcon className="w-4 h-4" />
                      <span>
                        {ticker && investor ? `Hybrid-Analyse für ${ticker.toUpperCase()} + ${investor} wartet auf dich!` :
                         ticker ? `${ticker.toUpperCase()} Analyse wartet auf dich!` :
                         `${investor} Portfolio-Analyse wartet auf dich!`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  const currentUrl = window.location.pathname + window.location.search
                  window.location.href = `/auth/signin?redirect=${encodeURIComponent(currentUrl)}`
                }}
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
                    {ticker ? `Analyse von ${ticker.toUpperCase()}` : 
                     investor ? `Portfolio-Analyse für ${investor}` : 
                     'Intelligente Finanzanalyse'} • Premium Feature
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-lg">
                  <LockClosedIcon className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium text-sm">Premium erforderlich</span>
                </div>
                
                <button 
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-3 py-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span className="text-sm">Zurück</span>
                </button>
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
                <h2 className="text-2xl font-bold text-theme-primary">
                  {ticker && investor ? `Hybrid-Analyse für ${ticker.toUpperCase()} + ${investor}` :
                   ticker ? `${ticker.toUpperCase()} AI-Analyse` :
                   investor ? `${investor} Portfolio-Analyse` :
                   'Erweitere deine Analyse mit KI'}
                </h2>
                <p className="text-theme-secondary">
                  FinClue AI analysiert 
                  {ticker && investor ? ` ${ticker.toUpperCase()} im Kontext von ${investor}s Portfolio-Strategie` :
                   ticker ? ` ${ticker.toUpperCase()} in Sekunden mit Fundamentaldaten, technischen Indikatoren und Markttrends` :
                   investor ? ` ${investor}s Portfolio-Bewegungen und Investment-Strategien` :
                   ' Aktien in Sekunden und gibt dir fundierte Einschätzungen'}.
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

            {/* Context-specific Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ticker && (
                <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                    <SparklesIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-theme-primary mb-2">{ticker.toUpperCase()} Analyse</h3>
                  <p className="text-theme-secondary text-sm">
                    KI-gestützte Bewertung von {ticker.toUpperCase()} Fundamentaldaten, Kennzahlen und Marktposition.
                  </p>
                </div>
              )}

              {investor && (
                <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                    <StarIcon className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-theme-primary mb-2">{investor} Portfolio</h3>
                  <p className="text-theme-secondary text-sm">
                    Detaillierte Analyse von {investor}s Investment-Strategie und Portfolio-Bewegungen.
                  </p>
                </div>
              )}

              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <SparklesIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Smart Detection</h3>
                <p className="text-theme-secondary text-sm">
                  Erwähne einfach andere Ticker oder Investoren - die AI erkennt sie automatisch.
                </p>
              </div>

              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                  <StarIcon className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">RAG-System</h3>
                <p className="text-theme-secondary text-sm">
                  Nutzt echte SEC-Filings, Earnings Calls und aktuelle Finanzberichte.
                </p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-8 text-center">
              <div className="bg-theme-secondary border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-2">Bereit für intelligente Analyse?</h3>
                <p className="text-theme-secondary text-sm mb-4">
                  Starte noch heute mit Premium und nutze die fortschrittlichste Finanz-AI.
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
                    onClick={() => router.back()}
                    className="px-6 py-2.5 bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/70 hover:text-theme-primary rounded-lg transition font-medium border border-theme"
                  >
                    Zurück
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Premium User - Unified AI Experience
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
                  {ticker && investor ? `Hybrid-Analyse: ${ticker.toUpperCase()} + ${investor}` :
                   ticker ? `Aktienanalyse für ${ticker.toUpperCase()}` :
                   investor ? `Portfolio-Analyse für ${investor}` :
                   'Intelligente Finanzanalyse mit automatischer Erkennung'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg">
                <SparklesIcon className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium text-sm">Premium</span>
              </div>
              
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Zurück</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State for Portfolio Data */}
      {portfolioLoading && (
        <div className="bg-blue-500/10 border-b border-blue-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Lade {investor} Portfolio-Daten...</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Unified FinClue AI Component */}
      <div className="h-[calc(100vh-120px)]">
        <FinClueAI 
          ticker={ticker}
          investor={investor}
          portfolioData={portfolioData}
          initialMessage={getContextualWelcome()}
          isPremium={user.isPremium}
          showQuickPrompts={true}
        />
      </div>
    </div>
  )
}