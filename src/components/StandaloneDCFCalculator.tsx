// src/components/StandaloneDCFCalculator.tsx - FIXED TypeScript Errors
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  CalculatorIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  SparklesIcon,
  LockClosedIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { stocks } from '@/data/stocks'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'
import DCFCalculator from '@/components/DCFCalculator'
import Logo from '@/components/Logo'

interface User {
  id: string
  email: string
  isPremium: boolean
}

// ✅ FIXED: Stock interface to match your exact data structure
interface Stock {
  ticker: string
  name: string
  market?: string
  // Add any other properties that might exist in your stocks data
  [key: string]: any // Allow additional properties
}

// ✅ IMPROVED: Stock Search Component with Real Logos
function StockSearchSelector({ 
  onSelect, 
  selectedTicker 
}: { 
  onSelect: (ticker: string) => void
  selectedTicker: string | null
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([])

  useEffect(() => {
    if (query.trim()) {
      const filtered = stocks.filter(stock => 
        stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
      setFilteredStocks(filtered)
    } else {
      // Popular stocks when empty - DCF geeignete Unternehmen
      const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
      const popularStocks = stocks.filter(stock => 
        popularTickers.includes(stock.ticker)
      )
      setFilteredStocks(popularStocks)
    }
  }, [query])

  const handleSelect = (ticker: string) => {
    onSelect(ticker)
    setQuery('')
    setIsOpen(false)
  }

  const selectedStock = selectedTicker ? stocks.find(s => s.ticker === selectedTicker) : null

  return (
    <div className="relative">
      {/* ✅ IMPROVED: Current Selection Display with Real Logo */}
      {selectedStock && (
        <div className="mb-4 p-4 bg-theme-secondary rounded-lg border border-green-500/30">
          <div className="flex items-center gap-3">
            {/* ✅ FIXED: Logo with required alt prop */}
            <Logo 
              ticker={selectedStock.ticker}
              className="w-12 h-12"
              alt={`${selectedStock.name} (${selectedStock.ticker}) company logo`}
            />
            <div className="flex-1">
              <h3 className="text-theme-primary font-semibold">{selectedStock.ticker}</h3>
              <p className="text-theme-secondary text-sm">{selectedStock.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {/* ✅ FIXED: Safe access to market property with fallback */}
                <span className="px-2 py-0.5 bg-theme-tertiary text-theme-muted rounded-md text-xs font-medium">
                  {(selectedStock as any).market || 'NASDAQ'}
                </span>
                <span className="text-green-400 text-xs">✓ DCF Ready</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-1.5 bg-theme-tertiary hover:bg-theme-card text-theme-primary rounded-md text-sm font-medium transition-colors"
            >
              Ändern
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className={`relative ${selectedStock && !isOpen ? 'hidden' : ''}`}>
        <div className="relative bg-theme-secondary border border-theme/20 rounded-lg transition-all duration-300 hover:border-theme/30">
          <div className="flex items-center px-4 py-3">
            <MagnifyingGlassIcon className="w-5 h-5 mr-3 text-theme-muted" />
            <input
              type="text"
              placeholder="Aktie für DCF-Bewertung suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="flex-1 bg-transparent text-theme-primary placeholder-theme-muted focus:outline-none"
            />
            <ChevronDownIcon className={`w-4 h-4 text-theme-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-theme-card border border-theme/20 rounded-lg shadow-xl z-50 mt-1">
            <div className="max-h-64 overflow-y-auto">
              {filteredStocks.length > 0 ? (
                <div className="p-2">
                  {!query && (
                    <div className="px-3 py-2 text-xs text-theme-muted font-semibold uppercase tracking-wide border-b border-theme/10 mb-2">
                      ✨ DCF-geeignete Aktien
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredStocks.map((stock) => (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelect(stock.ticker)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-theme-secondary transition-all duration-200 text-left group"
                      >
                        {/* ✅ FIXED: Logo with required alt prop in dropdown */}
                        <Logo 
                          ticker={stock.ticker}
                          className="w-10 h-10"
                          alt={`${stock.name} (${stock.ticker}) company logo`}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-theme-primary">{stock.ticker}</span>
                            {/* ✅ FIXED: Safe access to market property with fallback */}
                            <span className="px-2 py-0.5 bg-theme-secondary text-theme-muted rounded-md text-xs font-medium">
                              {(stock as any).market || 'NASDAQ'}
                            </span>
                          </div>
                          <div className="text-xs text-theme-muted truncate">{stock.name}</div>
                        </div>
                        
                        <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-theme-muted">
                  <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Aktien gefunden für "{query}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// ✅ IMPROVED: Premium CTA Component
const PremiumCTA = () => (
  <div className="text-center py-16 px-6">
    <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <CalculatorIcon className="w-10 h-10 text-green-400" />
    </div>
    <h3 className="text-2xl font-semibold text-theme-primary mb-4">Professioneller DCF Calculator</h3>
    <p className="text-theme-secondary mb-8 max-w-lg mx-auto leading-relaxed">
      Bewerte jede Aktie mit unserem professionellen DCF Calculator. Automatische Validierung, 
      realistische Annahmen und detaillierte Berechnungen für fundierte Investitionsentscheidungen.
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
      <div className="text-center p-4">
        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
          <ShieldCheckIcon className="w-6 h-6 text-blue-400" />
        </div>
        <h4 className="text-theme-primary font-medium mb-1">Smart Validierung</h4>
        <p className="text-theme-muted text-xs">Automatische Prüfung unrealistischer Werte</p>
      </div>
      <div className="text-center p-4">
        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
          <ChartBarIcon className="w-6 h-6 text-green-400" />
        </div>
        <h4 className="text-theme-primary font-medium mb-1">Echte Finanzdaten</h4>
        <p className="text-theme-muted text-xs">Basierend auf historischen Fundamentaldaten</p>
      </div>
      <div className="text-center p-4">
        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
          <AdjustmentsHorizontalIcon className="w-6 h-6 text-purple-400" />
        </div>
        <h4 className="text-theme-primary font-medium mb-1">3 Szenarien</h4>
        <p className="text-theme-muted text-xs">Konservativ, Basis & Optimistisch</p>
      </div>
    </div>
    
    <Link
      href="/pricing"
      className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-black rounded-lg font-semibold transition-colors text-lg"
    >
      <SparklesIcon className="w-6 h-6" />
      14 Tage kostenlos testen
    </Link>
    
    {/* ✅ NEW: DCF Best Practices Info */}
    <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-md mx-auto">
      <div className="flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-left">
          <h5 className="text-blue-400 font-medium mb-1 text-sm">DCF Best Practices</h5>
          <ul className="text-theme-muted text-xs space-y-1">
            <li>• Terminal Growth Rate: Max 2-4%</li>
            <li>• WACC immer &gt; Terminal Growth</li>
            <li>• Konservative Annahmen bevorzugen</li>
            <li>• Mehrere Szenarien vergleichen</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
)

// Main Standalone DCF Calculator
export default function StandaloneDCFCalculator() {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  // Load User Data
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
        console.error('[StandaloneDCF] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  // Loading state
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  // Premium check
  if (!user?.isPremium) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-green-400" />
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">DCF Calculator</h1>
              <p className="text-theme-secondary text-sm">Professionelle Discounted Cash Flow Bewertung</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 rounded-lg">
              <SparklesIcon className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">Premium</span>
            </div>
          </div>
        </div>
        
        <PremiumCTA />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ✅ IMPROVED: Header */}
      <div>
        <h1 className="text-3xl font-bold text-theme-primary mb-2">DCF Calculator</h1>
        <p className="text-theme-secondary">
          Bewerte jede Aktie mit professionellen Discounted Cash Flow Analysen. 
          Automatische Validierung und realistische Annahmen inklusive.
        </p>
      </div>

      {/* ✅ IMPROVED: Stock Selection with Logos */}
      <div className="bg-theme-card rounded-lg p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-green-400" />
          Aktie auswählen
        </h2>
        
        <StockSearchSelector 
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
        />
        
        {!selectedTicker && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-theme-secondary rounded-lg border-l-4 border-blue-400">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-theme-secondary text-sm">
                    <strong className="text-blue-400">Tipp:</strong> Wähle eine Aktie aus, um eine professionelle DCF-Bewertung zu starten. 
                    Der Calculator verwendet automatisch historische Daten für intelligente Annahmen.
                  </p>
                </div>
              </div>
            </div>
            
            {/* ✅ NEW: DCF Geeignete Aktien Hinweis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h4 className="text-green-400 font-medium mb-2 text-sm">✅ DCF-geeignete Unternehmen</h4>
                <ul className="text-theme-muted text-xs space-y-1">
                  <li>• Etablierte Unternehmen mit stabilem Cashflow</li>
                  <li>• Predictable Business Models</li>
                  <li>• Mindestens 3-5 Jahre Finanzhistorie</li>
                  <li>• Keine zu volatilen Wachstumsstocks</li>
                </ul>
              </div>
              
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <h4 className="text-orange-400 font-medium mb-2 text-sm">⚠️ Weniger geeignet</h4>
                <ul className="text-theme-muted text-xs space-y-1">
                  <li>• Startups ohne Profitabilität</li>
                  <li>• Hochvolatile Krypto-Stocks</li>
                  <li>• Unternehmen vor Produktlaunch</li>
                  <li>• Zyklische Rohstoff-Unternehmen</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DCF Calculator */}
      {selectedTicker && (
        <DCFCalculator ticker={selectedTicker} />
      )}
    </div>
  )
}