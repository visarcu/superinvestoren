// src/app/superinvestor/page-optimized.tsx - PERFORMANCE OPTIMIERT
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ArrowRightIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CheckIcon,
  SignalIcon,
  BuildingOfficeIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { useOverviewData } from '@/hooks/useOverviewData'
import InvestorAvatar from '@/components/InvestorAvatar'
import NewsletterSignup from '@/components/NewsletterSignup'
import SuperinvestorInfo from '@/components/SuperinvestorInfo'
import Logo from '@/components/Logo'
import { CurrencyProvider, useCurrency } from '@/lib/CurrencyContext'

function SuperinvestorOverviewContent() {
  // Currency formatting
  const { formatCurrency } = useCurrency()
  
  // Helper to convert American formatted strings to German
  const toGermanFormat = (str: string): string => {
    // Convert strings like "+12.5%" or "$1,234.56" to German format
    return str.replace(/([0-9]+)\.([0-9]+)/g, '$1,$2')
  }
  
  // 1. STATE HOOKS
  const [isLoading, setIsLoading] = useState(true)
  
  // 2. DATA HOOKS - OPTIMIZED API CALL
  const { data: overviewData, loading: dataLoading, error: dataError } = useOverviewData()
  

  // 4. SIDE EFFECTS
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // 5. CONDITIONAL RETURNS
  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade optimierte Daten...</p>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4">⚠️ Fehler beim Laden der Daten</div>
          <p className="text-gray-400 text-sm mb-4">{dataError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-brand text-black rounded-lg hover:bg-green-400"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  if (!overviewData) {
    return null
  }

  const { featuredInvestors, pulseData, trendingStocks, biggestTrades, totalInvestors } = overviewData

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      
      {/* Hero Section */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <UserGroupIcon className="w-3 h-3" />
            Super-Investoren
          </div>
          
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Die erfolgreichsten Investoren
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Verfolge die Portfolios und Strategien der besten Investoren der Welt
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-white mb-1">{totalInvestors}+</div>
            <div className="text-gray-400 text-sm">Top Investoren</div>
          </div>
          
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-2 bg-brand/10 rounded-lg">
                <CircleStackIcon className="w-5 h-5 text-brand-light" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-white mb-1">2,5B $</div>
            <div className="text-gray-400 text-sm">Verwaltetes Vermögen</div>
          </div>
          
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-white mb-1">Q3 2025</div>
            <div className="text-gray-400 text-sm">Letztes Update</div>
          </div>
        </div>
      </div>

      {/* Top Investors Section */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Top Performer
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Die erfolgreichsten Investoren mit ihren aktuellen Portfolios
          </p>
        </div>
          
        {/* Investor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {featuredInvestors.map((inv) => (
            <Link
              key={inv.slug}
              href={`/superinvestor/${inv.slug}`}
              className="group bg-[#161618] rounded-2xl p-6 hover:bg-[#1A1A1D] transition-all duration-300 border border-white/[0.06] hover:border-white/[0.1]"
            >
              <div className="flex items-center gap-4 mb-4">
                <InvestorAvatar
                  name={inv.name}
                  imageUrl={inv.imageUrl}
                  size="lg"
                  className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-brand-light transition-colors line-clamp-1">
                    {inv.name.split('–')[0].trim()}
                  </h3>
                  <p className="text-sm text-brand-light">
                    {formatCurrency(inv.portfolioValue)}
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-600 group-hover:text-brand-light transition-colors" />
              </div>
              
              {inv.peek.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Top Holdings:</p>
                  {inv.peek.slice(0, 3).map((p, idx) => (
                    <div key={p.ticker} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{idx + 1}. {p.ticker}</span>
                      <span className="text-gray-500 truncate ml-2 text-xs">{p.name.slice(0, 25)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/superinvestor/investors"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all"
          >
            Alle {totalInvestors} Investoren ansehen
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Market Activity */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Marktaktivitäten
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Aktuelle Trends und größte Portfolio-Bewegungen
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trending Stocks */}
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand/10 rounded-lg">
                <ArrowTrendingUpIcon className="w-4 h-4 text-brand-light" />
              </div>
              <h3 className="text-lg font-semibold text-white">Beliebte Aktien</h3>
            </div>
            
            {trendingStocks.topBuys.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {trendingStocks.topBuys.slice(0, 8).map(([ticker, count]) => (
                  <Link
                    key={ticker}
                    href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-3 text-center transition-all"
                    title={`${ticker}: ${count} Käufe`}
                  >
                    <div className="font-medium text-white text-xs mb-1">{ticker}</div>
                    <div className="text-xs text-brand-light">+{count}</div>
                  </Link>
                ))}
              </div>
            )}
            
            <Link 
              href="/superinvestor/insights" 
              className="block text-center mt-4 text-brand-light hover:text-green-300 text-sm transition-colors"
            >
              Vollständige Analyse →
            </Link>
          </div>

          {/* Recent Trades */}
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Größte Trades</h3>
            </div>
            
            <div className="space-y-3">
              {biggestTrades.slice(0, 4).map((trade, index) => (
                <div key={`${trade.investorSlug}-${trade.ticker}-${index}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6">
                      <Logo
                        ticker={trade.ticker}
                        alt={`${trade.ticker} Logo`}
                        className="w-full h-full"
                        padding="none"
                      />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{trade.ticker}</div>
                      <div className="text-gray-400 text-xs">{trade.investor}</div>
                    </div>
                  </div>
                  <div className={`font-medium text-sm ${trade.color}`}>
                    {toGermanFormat(trade.change)}
                  </div>
                </div>
              ))}
            </div>
            
            <Link 
              href="/superinvestor/insights" 
              className="block text-center mt-4 text-brand-light hover:text-green-300 text-sm transition-colors"
            >
              Alle Trades →
            </Link>
          </div>
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Markt-Sentiment
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Aktuelle Stimmung und Aktivitäten der Super-Investoren
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-brand/10 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-brand-light" />
              </div>
            </div>
            <div className={`text-3xl font-semibold mb-2 ${
              pulseData.sentimentPercentage >= 60 ? 'text-brand-light' :
              pulseData.sentimentPercentage >= 40 ? 'text-gray-300' : 'text-red-400'
            }`}>
              {pulseData.sentimentPercentage}%
            </div>
            <div className="text-gray-400 text-sm">
              {pulseData.sentimentPercentage >= 60 ? 'Kaufstimmung' :
               pulseData.sentimentPercentage >= 40 ? 'Neutral' : 'Verkaufsstimmung'}
            </div>
          </div>

          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BuildingOfficeIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white mb-2">
              {pulseData.hotSectors.length}
            </div>
            <div className="text-gray-400 text-sm">Aktive Sektoren</div>
          </div>

          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <SignalIcon className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white mb-2">
              {pulseData.totalInvestorsActive}
            </div>
            <div className="text-gray-400 text-sm">Aktive Investoren</div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/superinvestor/insights"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all border border-white/10 hover:border-white/20"
          >
            Detaillierte Analyse
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
          
      {/* SuperinvestorInfo Integration */}
      <div className="mb-16">
        <SuperinvestorInfo />
      </div>

      {/* Newsletter Section */}
      <div className="mb-16">
        <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Newsletter abonnieren
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Erhalte quartalsweise Updates über die Portfolio-Bewegungen der Top-Investoren
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <NewsletterSignup />
            
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-4">
              <span className="flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Kostenlos
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Kein Spam
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Jederzeit abmeldbar
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default function SuperinvestorOverview() {
  return (
    <CurrencyProvider>
      <SuperinvestorOverviewContent />
    </CurrencyProvider>
  )
}