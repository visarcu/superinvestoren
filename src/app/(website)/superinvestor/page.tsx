// src/app/superinvestor/page.tsx - LINEAR/QUARTR STYLE
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  UserGroupIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  SignalIcon,
  BuildingOfficeIcon,
  CircleStackIcon,
  CalendarIcon,
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
    return str.replace(/([0-9]+)\.([0-9]+)/g, '$1,$2')
  }

  // 1. STATE HOOKS
  const [isLoading, setIsLoading] = useState(true)

  // 2. DATA HOOKS - OPTIMIZED API CALL
  const { data: overviewData, loading: dataLoading, error: dataError } = useOverviewData()

  // Dynamic latest quarter calculation
  const latestQuarter = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    // 13F filings are delayed ~45 days, so we show the previous quarter
    if (month >= 10) return `Q3 ${year}`
    if (month >= 7) return `Q2 ${year}`
    if (month >= 4) return `Q1 ${year}`
    return `Q4 ${year - 1}`
  }, [])

  // 4. SIDE EFFECTS
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // 5. CONDITIONAL RETURNS
  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F11] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-neutral-800 border-t-neutral-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Lade Daten...</p>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-[#0F0F11] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4">Fehler beim Laden der Daten</div>
          <p className="text-gray-500 text-sm mb-4">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand text-black rounded-lg hover:bg-green-400 transition-colors"
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
    <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-16 pt-8">

      {/* Hero Section */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3">
            Super-Investoren
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Verfolge die Portfolios und Strategien der besten Investoren der Welt
          </p>
        </div>

        {/* Key Metrics */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-12">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-left">
              <div className="text-xl font-semibold text-white">{totalInvestors}+</div>
              <div className="text-sm text-gray-500">Top Investoren</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg">
              <CircleStackIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-left">
              <div className="text-xl font-semibold text-white">2,5 Bio. $</div>
              <div className="text-sm text-gray-500">Verwaltetes Vermögen</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-left">
              <div className="text-xl font-semibold text-white">{latestQuarter}</div>
              <div className="text-sm text-gray-500">Letztes Update</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Investors Section */}
      <div className="mb-16">
        <div className="mb-8 pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-medium text-white mb-1">Top Performer</h2>
          <p className="text-sm text-gray-500">
            Die erfolgreichsten Investoren mit ihren aktuellen Portfolios
          </p>
        </div>

        {/* Investor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {featuredInvestors.map((inv) => (
            <Link
              key={inv.slug}
              href={`/superinvestor/${inv.slug}`}
              className="group bg-[#111113] rounded-2xl p-6 hover:bg-[#161618] transition-all duration-200 border border-white/[0.06] hover:border-white/[0.1]"
            >
              <div className="flex items-center gap-4 mb-4">
                <InvestorAvatar
                  name={inv.name}
                  imageUrl={inv.imageUrl}
                  size="lg"
                  className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-white group-hover:text-neutral-200 transition-colors truncate">
                    {inv.name.split('–')[0].trim()}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(inv.portfolioValue)}
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
              </div>

              {inv.peek.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Top Holdings:</p>
                  {inv.peek.slice(0, 3).map((p, idx) => (
                    <div key={p.ticker} className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{idx + 1}. {p.ticker}</span>
                      <span className="text-gray-600 truncate ml-2 text-xs">{p.name.slice(0, 20)}...</span>
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-green-400 text-black font-medium rounded-lg transition-colors duration-200"
          >
            Alle {totalInvestors} Investoren ansehen
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Market Activity */}
      <div className="mb-16">
        <div className="mb-8 pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-medium text-white mb-1">Marktaktivitäten</h2>
          <p className="text-sm text-gray-500">
            Aktuelle Trends und größte Portfolio-Bewegungen
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trending Stocks */}
          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-white">Beliebte Aktien</h3>
            </div>

            {trendingStocks.topBuys.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {trendingStocks.topBuys.slice(0, 8).map(([ticker, count]) => (
                  <Link
                    key={ticker}
                    href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
                    className="bg-white/5 hover:bg-white/[0.08] rounded-lg p-3 text-center transition-colors"
                    title={`${ticker}: ${count} Käufe`}
                  >
                    <div className="font-medium text-white text-xs mb-1">{ticker}</div>
                    <div className="text-xs text-green-400">+{count}</div>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/superinvestor/insights"
              className="block text-center mt-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Vollständige Analyse →
            </Link>
          </div>

          {/* Recent Trades */}
          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <ChartBarIcon className="w-4 h-4 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-white">Größte Trades</h3>
            </div>

            <div className="space-y-3">
              {biggestTrades.slice(0, 4).map((trade, index) => (
                <div key={`${trade.investorSlug}-${trade.ticker}-${index}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/[0.08] transition-colors">
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
                      <div className="text-gray-500 text-xs">{trade.investor}</div>
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
              className="block text-center mt-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Alle Trades →
            </Link>
          </div>
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="mb-16">
        <div className="mb-8 pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-medium text-white mb-1">Markt-Sentiment</h2>
          <p className="text-sm text-gray-500">
            Aktuelle Stimmung und Aktivitäten der Super-Investoren
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className={`text-3xl font-semibold mb-2 ${
              pulseData.sentimentPercentage >= 60 ? 'text-green-400' :
              pulseData.sentimentPercentage >= 40 ? 'text-gray-300' : 'text-red-400'
            }`}>
              {pulseData.sentimentPercentage}%
            </div>
            <div className="text-gray-500 text-sm">
              {pulseData.sentimentPercentage >= 60 ? 'Kaufstimmung' :
               pulseData.sentimentPercentage >= 40 ? 'Neutral' : 'Verkaufsstimmung'}
            </div>
          </div>

          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white mb-2">
              {pulseData.hotSectors.length}
            </div>
            <div className="text-gray-500 text-sm">Aktive Sektoren</div>
          </div>

          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <SignalIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white mb-2">
              {pulseData.totalInvestorsActive}
            </div>
            <div className="text-gray-500 text-sm">Aktive Investoren</div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/superinvestor/insights"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-white/[0.06] hover:border-white/[0.1]"
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
        <div className="bg-[#111113] rounded-2xl p-8 border border-white/[0.06]">
          <div className="text-center mb-6">
            <h2 className="text-xl font-medium text-white mb-2">
              Newsletter abonnieren
            </h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              Erhalte quartalsweise Updates über die Portfolio-Bewegungen der Top-Investoren
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <NewsletterSignup />

            <div className="flex items-center justify-center gap-6 text-xs text-gray-600 mt-4">
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                Kostenlos
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                Kein Spam
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
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
