// src/app/superinvestor/page-optimized.tsx - LINEAR/QUARTR STYLE
'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  UserGroupIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  PlayIcon,
  FireIcon,
  BoltIcon,
  SignalIcon,
  BuildingOfficeIcon,
  CircleStackIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { useOverviewData } from '@/hooks/useOverviewData'
import InvestorAvatar from '@/components/InvestorAvatar'
import YouTubeCarousel from '@/components/YoutubeCarousel'
import { featuredVideos } from '@/data/videos'
import SuperinvestorInfo from '@/components/SuperinvestorInfo'
import Logo from '@/components/Logo'

// Only Hero Animation Hook
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold])
  
  return [ref, isVisible] as const
}

// Helper functions
function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

export default function SuperinvestorOverview() {
  // 1. STATE HOOKS
  const [isLoading, setIsLoading] = useState(true)
  
  // 2. DATA HOOKS - OPTIMIZED API CALL
  const { data: overviewData, loading: dataLoading, error: dataError } = useOverviewData()
  
  // 3. ANIMATION HOOK
  const [heroRef, heroVisible] = useIntersectionObserver(0.3)

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

  return (
    <div className="min-h-screen bg-[#0F0F11]">

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center space-y-8">

            {/* Headlines */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
                Super-Investoren
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
                Verfolge die Portfolios der erfolgreichsten Investoren der Welt
              </p>
            </div>

            {/* Key Metrics - Minimal */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-12 pt-6">
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
        </div>
      </section>

      {/* Top Investors Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">

          <div className="mb-12 pb-6 border-b border-neutral-800">
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="w-5 h-5 text-neutral-500" />
              <h2 className="text-xl font-medium text-white">Featured Investoren</h2>
            </div>
            <p className="text-sm text-neutral-400">
              Die erfolgreichsten Super-Investoren und ihre Portfolios
            </p>
          </div>

          {/* Investor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {featuredInvestors.map((inv) => (
              <Link
                key={inv.slug}
                href={`/superinvestor/${inv.slug}`}
                className="group relative bg-[#111113] rounded-2xl p-6 hover:bg-[#161618] transition-all duration-200 border border-white/[0.06] hover:border-white/[0.1]"
              >
                {/* Crown for Buffett */}
                {inv.slug === 'buffett' && (
                  <div className="absolute top-4 right-4">
                    <span className="text-yellow-400 text-xl">👑</span>
                  </div>
                )}

                {/* Profile Image */}
                <div className="flex justify-center mb-5">
                  <InvestorAvatar
                    name={inv.name}
                    imageUrl={inv.imageUrl}
                    size="xl"
                    className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200"
                  />
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold text-white text-center mb-2 group-hover:text-neutral-200 transition-colors">
                  {inv.name.split('–')[0].trim()}
                </h3>

                {/* Portfolio Value */}
                <p className="text-center text-gray-500 text-sm mb-4">
                  Portfolio: <span className="text-white font-medium">
                    {formatCurrency(inv.portfolioValue, 'USD', 1)}
                  </span>
                </p>

                {/* Top 3 Holdings Preview */}
                {inv.peek.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 text-center mb-2">Top Holdings:</p>
                    {inv.peek.slice(0, 3).map((p, idx) => (
                      <div key={p.ticker} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">{idx + 1}. {p.ticker}</span>
                        <span className="text-gray-600 truncate ml-2 text-xs">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* View Portfolio Button */}
                <div className="mt-5 text-center">
                  <span className="inline-flex items-center gap-1 text-gray-400 text-sm font-medium group-hover:text-white group-hover:gap-2 transition-all">
                    Portfolio ansehen
                    <ArrowRightIcon className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA für alle Investoren */}
          <div className="text-center">
            <Link
              href="/superinvestor/investors"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-green-400 text-black font-medium rounded-lg transition-colors duration-200"
            >
              Alle {totalInvestors} Investoren durchsuchen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <p className="text-gray-500 text-sm mt-3">
              Erweiterte Filter, Suche und detaillierte Portfolio-Analysen
            </p>
          </div>
        </div>
      </section>

      {/* TRENDING STOCKS SECTION */}
      <section className="bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">

          <div className="mb-12 pb-6 border-b border-neutral-800">
            <div className="flex items-center gap-3 mb-2">
              <FireIcon className="w-5 h-5 text-neutral-500" />
              <h2 className="text-xl font-medium text-white">Trending Stocks</h2>
            </div>
            <p className="text-sm text-neutral-400">
              Die heißesten Aktien und größten Portfolio-Bewegungen der Super-Investoren
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">

            {/* HEATMAP */}
            <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <FireIcon className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-white">Trending Stocks</h3>
                <div className="bg-white/5 text-xs text-gray-500 px-2 py-1 rounded">
                  Letzte 2 Quartale
                </div>
              </div>
              
              <div className="space-y-6">
                {/* KÄUFE Section */}
                {trendingStocks.topBuys.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-brand rounded-full"></div>
                      <h4 className="text-sm font-semibold text-brand-light">Meist gekaufte Aktien</h4>
                      <span className="text-xs text-gray-500">({trendingStocks.topBuys.length} Aktien)</span>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {trendingStocks.topBuys.map(([ticker, count]) => {
                        const intensity = count / trendingStocks.maxBuys
                        let bgColor = 'bg-brand/20'
                        let textColor = 'text-green-300'
                        
                        if (intensity >= 0.8) {
                          bgColor = 'bg-brand/80'
                          textColor = 'text-white'
                        } else if (intensity >= 0.6) {
                          bgColor = 'bg-brand/60'
                          textColor = 'text-white'
                        } else if (intensity >= 0.4) {
                          bgColor = 'bg-brand/40'
                          textColor = 'text-green-100'
                        }

                        return (
                          <Link
                            key={ticker}
                            href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
                            className={`${bgColor} ${textColor} rounded-lg p-3 text-center hover:scale-105 transition-transform duration-200 group relative`}
                            title={`${ticker}: ${count} Käufe von Investoren`}
                          >
                            <div className="font-bold text-xs truncate group-hover:text-white transition-colors mb-1">
                              {ticker}
                            </div>
                            <div className="text-xs opacity-75">
                              +{count}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* VERKÄUFE Section */}
                {trendingStocks.topSells.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-red-400">Meist verkaufte Aktien</h4>
                      <span className="text-xs text-gray-500">({trendingStocks.topSells.length} Aktien)</span>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {trendingStocks.topSells.map(([ticker, count]) => {
                        const intensity = count / trendingStocks.maxSells
                        let bgColor = 'bg-red-500/20'
                        let textColor = 'text-red-300'
                        
                        if (intensity >= 0.8) {
                          bgColor = 'bg-red-500/80'
                          textColor = 'text-white'
                        } else if (intensity >= 0.6) {
                          bgColor = 'bg-red-500/60'
                          textColor = 'text-white'
                        } else if (intensity >= 0.4) {
                          bgColor = 'bg-red-500/40'
                          textColor = 'text-red-100'
                        }

                        return (
                          <Link
                            key={ticker}
                            href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
                            className={`${bgColor} ${textColor} rounded-lg p-3 text-center hover:scale-105 transition-transform duration-200 group relative`}
                            title={`${ticker}: ${count} Verkäufe von Investoren`}
                          >
                            <div className="font-bold text-xs truncate group-hover:text-white transition-colors mb-1">
                              {ticker}
                            </div>
                            <div className="text-xs opacity-75">
                              -{count}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>💚 Gekauft • ❤️ Verkauft</span>
                  <span>Zahl = Anzahl Investoren</span>
                </div>
              </div>
              
              <Link
                href="/superinvestor/insights"
                className="block text-center mt-4 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Vollständige Analyse →
              </Link>
            </div>

            {/* Größte Trades */}
            <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-white">Größte Trades</h3>
              </div>

              <div className="space-y-3">
                {biggestTrades.map((trade, index) => (
                  <div key={`${trade.investorSlug}-${trade.ticker}-${index}`} className="bg-white/5 flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.08] transition-colors">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/analyse/stocks/${trade.ticker.toLowerCase()}/super-investors`}
                        className="w-8 h-8 relative hover:scale-110 transition-transform"
                      >
                        <Logo
                          ticker={trade.ticker}
                          alt={`${trade.ticker} Logo`}
                          className="w-full h-full"
                          padding="none"
                        />
                      </Link>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/analyse/stocks/${trade.ticker.toLowerCase()}/super-investors`}
                            className="text-white font-medium text-sm hover:text-brand-light transition-colors"
                          >
                            {trade.ticker}
                          </Link>
                          <span className="text-gray-500 text-xs">
                            {trade.action}
                          </span>
                        </div>
                        <Link
                          href={`/superinvestor/${trade.investorSlug}`}
                          className="text-gray-500 text-xs hover:text-brand-light transition-colors"
                        >
                          {trade.investor}
                        </Link>
                      </div>
                    </div>
                    <div className={`font-semibold text-sm ${trade.color}`}>
                      {trade.change}
                    </div>
                  </div>
                ))}
              </div>
              
              <Link
                href="/superinvestor/insights"
                className="block text-center mt-4 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Alle Trades analysieren →
              </Link>
            </div>
          </div>

          {/* Call-to-Action */}
          <div className="text-center">
            <div className="bg-white/5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 text-sm">
              <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
              <span>Aktualisiert nach jedem Quartal • Basierend auf 13F-Filings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Investment-Pulse Sektion */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="mb-12 pb-6 border-b border-neutral-800">
            <div className="flex items-center gap-3 mb-2">
              <SignalIcon className="w-5 h-5 text-neutral-500" />
              <h2 className="text-xl font-medium text-white">Markt-Sentiment</h2>
            </div>
            <p className="text-sm text-neutral-400">
              Live-Einblick in das aktuelle Verhalten der Super-Investoren
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 1. Netto-Sentiment */}
            <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Netto-Sentiment</h3>
                  <p className="text-xs text-gray-500">Letztes Quartal</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-semibold mb-2 ${
                    pulseData.sentimentPercentage >= 60 ? 'text-green-400' :
                    pulseData.sentimentPercentage >= 40 ? 'text-gray-300' : 'text-red-400'
                  }`}>
                    {pulseData.sentimentPercentage}%
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {pulseData.sentimentPercentage >= 60 ? 'Kaufstimmung' :
                     pulseData.sentimentPercentage >= 40 ? 'Neutral' : 'Verkaufsstimmung'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Netto-Käufer:</span>
                    <span className="text-green-400 font-medium">{pulseData.netBuyers} Investoren</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Netto-Verkäufer:</span>
                    <span className="text-red-400 font-medium">{pulseData.netSellers} Investoren</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Aktive Investoren:</span>
                    <span className="text-white font-medium">{pulseData.totalInvestorsActive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Sektor-Momentum */}
            <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Sektor-Momentum</h3>
                  <p className="text-xs text-gray-500">Beliebt vs Unbeliebt</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">Hot Sectors</h4>
                  {pulseData.hotSectors.map(([sector, count]) => (
                    <div key={sector} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{sector}</span>
                      <span className="text-green-400">+{count}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-800 pt-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Cold Sectors</h4>
                  {pulseData.coldSectors.map(([sector, count]) => (
                    <div key={sector} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{sector}</span>
                      <span className="text-red-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Aktivitäts-Level */}
            <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Aktivitäts-Level</h3>
                  <p className="text-xs text-gray-500">Portfolio-Bewegungen</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-semibold text-white mb-2">
                    {pulseData.averageChanges}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Änderungen pro Investor
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Änderungen:</span>
                    <span className="text-white font-medium">{pulseData.totalPortfolioChanges}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Aktive Investoren:</span>
                    <span className="text-white font-medium">{pulseData.totalInvestorsActive}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-10">
            <Link
              href="/superinvestor/insights"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-white/[0.06] hover:border-white/[0.1]"
            >
              Detaillierte Markt-Analyse
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
          
      {/* SuperinvestorInfo Integration */}
      <div className="mb-16">
        <SuperinvestorInfo />
      </div>

      {/* Video & Newsletter Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Section Header */}
          <div className="mb-12 pb-6 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">Bleib auf dem Laufenden</h2>
            <p className="text-sm text-neutral-400">
              Video-Analysen und Newsletter für tiefere Einblicke
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left: Videos */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <PlayIcon className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-white">Portfolio Deep-Dives</h3>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Detaillierte Video-Analysen der Investment-Strategien und Portfolio-Bewegungen
              </p>

              <div className="bg-[#111113] rounded-2xl p-4 border border-white/[0.06]">
                <YouTubeCarousel videos={featuredVideos} />
              </div>
            </div>

            {/* Right: Newsletter */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-white">Newsletter</h3>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Nie wieder ein <span className="text-white font-medium">13F-Filing</span> verpassen.
                Quartalsweise Updates über Portfolio-Bewegungen der Top-Investoren.
              </p>

              <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
                <div className="space-y-5">
                  {/* Benefits List */}
                  <div className="space-y-2">
                    {[
                      'Quartalsweise 13F-Analysen',
                      'Portfolio-Änderungen der Top-Investoren',
                      'Markt-Trends und Insights',
                      'Kein Spam, nur relevante Updates'
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Form */}
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="deine@email.de"
                      className="w-full px-4 py-3 bg-white/5 border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                    />
                    <button className="w-full px-4 py-3 bg-brand hover:bg-green-400 text-black font-medium rounded-lg transition-colors duration-200">
                      Kostenlos abonnieren
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 text-center">
                    Mit der Anmeldung stimmst du unseren Datenschutzbestimmungen zu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}