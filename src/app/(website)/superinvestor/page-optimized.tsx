// src/app/superinvestor/page-optimized.tsx - PERFORMANCE OPTIMIERT
'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ArrowRightIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  CheckIcon,
  StarIcon,
  TrophyIcon,
  PlayIcon,
  FireIcon,
  BoltIcon,
  SignalIcon,
  BuildingOfficeIcon,
  EyeIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { useOverviewData } from '@/hooks/useOverviewData'
import InvestorAvatar from '@/components/InvestorAvatar'
import YouTubeCarousel from '@/components/YoutubeCarousel'
import { featuredVideos } from '@/data/videos'
import NewsletterSignup from '@/components/NewsletterSignup'
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

  return (
    <div className="min-h-screen bg-black">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center space-y-8">
            
            <br />
            <br />

            {/* Headlines */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
                Super-Investoren
              </h1>
              <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto font-light">
                Verfolge die Portfolios der erfolgreichsten Investoren der Welt
              </p>
            </div>
          
            {/* Key Metrics - Minimaler */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16 pt-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <UserGroupIcon className="w-5 h-5 text-brand-light" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">{totalInvestors}+</div>
                  <div className="text-sm text-gray-500">Top Investoren</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <CircleStackIcon className="w-5 h-5 text-brand-light" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">2,5 Billionen $</div>
                  <div className="text-sm text-gray-500">Verwaltetes Vermögen</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-brand-light" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">Q3 2025</div>
                  <div className="text-sm text-gray-500">Letztes Update</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Investors Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 rounded-full mb-6 border border-brand/20">
              <TrophyIcon className="w-4 h-4 text-brand-light" />
              <span className="text-sm font-medium text-brand-light">Featured Investoren</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Die Top
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Performer</span>
            </h2>
          </div>
          
          {/* Investor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {featuredInvestors.map((inv) => (
              <Link
                key={inv.slug}
                href={`/superinvestor/${inv.slug}`}
                className="group relative bg-[#161618] rounded-2xl p-8 hover:bg-[#1A1A1D] transition-all duration-300 border border-white/[0.06] hover:border-white/[0.1]"
              >
                {/* Crown for Buffett */}
                {inv.slug === 'buffett' && (
                  <div className="absolute top-4 right-4">
                    <span className="text-yellow-400 text-2xl">👑</span>
                  </div>
                )}
                
                {/* Profile Image */}
                <div className="flex justify-center mb-6">
                  <InvestorAvatar
                    name={inv.name}
                    imageUrl={inv.imageUrl}
                    size="xl"
                    className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200"
                  />
                </div>
                
                {/* Name */}
                <h3 className="text-xl font-bold text-white text-center mb-2 group-hover:text-brand-light transition-colors">
                  {inv.name.split('–')[0].trim()}
                </h3>
                
                {/* Portfolio Value */}
                <p className="text-center text-gray-400 mb-4">
                  Portfolio: <span className="text-brand-light font-medium">
                    {formatCurrency(inv.portfolioValue, 'USD', 1)}
                  </span>
                </p>
                
                {/* Top 3 Holdings Preview */}
                {inv.peek.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 text-center mb-3">Top Holdings:</p>
                    {inv.peek.slice(0, 3).map((p, idx) => (
                      <div key={p.ticker} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{idx + 1}. {p.ticker}</span>
                        <span className="text-gray-500 truncate ml-2">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* View Portfolio Button */}
                <div className="mt-6 text-center">
                  <span className="inline-flex items-center gap-1 text-brand-light text-sm font-medium group-hover:gap-2 transition-all">
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
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-green-400 text-black font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-green-500/25"
            >
              Alle {totalInvestors} Investoren durchsuchen
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <p className="text-gray-500 text-sm mt-3">
              Erweiterte Filter, Suche und detaillierte Portfolio-Analysen
            </p>
          </div>
        </div>
      </section>

      {/* TRENDING STOCKS SECTION */}
      <section className="bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-white-400 rounded-full text-sm font-medium mb-6 border border-brand/20">
              <FireIcon className="w-4 h-4" />
              Trending Jetzt
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Was ist gerade
              <span className="bg-gradient-to-r from-green-400 to-green-400 bg-clip-text text-transparent"> angesagt?</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Die heißesten Aktien und größten Portfolio-Bewegungen der Super-Investoren
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            
            {/* HEATMAP */}
            <div className="bg-[#161618] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#2A2A2A] rounded-lg flex items-center justify-center">
                  <FireIcon className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Trending Stocks</h3>
                <div className="bg-[#2A2A2A] text-xs text-gray-500 px-2 py-1 rounded">
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
                className="block text-center mt-4 text-white-400 hover:text-gray-300 text-sm transition-colors"
              >
                Vollständige Analyse →
              </Link>
            </div>

            {/* Größte Trades */}
            <div className="bg-[#161618] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#2A2A2A] w-8 h-8 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-brand-light" />
                </div>
                <h3 className="text-lg font-bold text-white">Größte Trades</h3>
              </div>
              
              <div className="space-y-4">
                {biggestTrades.map((trade, index) => (
                  <div key={`${trade.investorSlug}-${trade.ticker}-${index}`} className="bg-[#2A2A2A] flex items-center justify-between p-3 rounded-lg">
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
                className="block text-center mt-4 text-brand-light hover:text-green-300 text-sm transition-colors"
              >
                Alle Trades analysieren →
              </Link>
            </div>
          </div>

          {/* Call-to-Action */}
          <div className="text-center">
            <div className="bg-[#161618] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Aktualisiert nach jedem Quartal • Basierend auf 13F-Filings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Investment-Pulse Sektion */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 rounded-full mb-6 border border-brand/20">
              <SignalIcon className="w-4 h-4 text-brand-light" />
              <span className="text-sm font-medium text-brand-light">Investment-Pulse</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Markt-
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">Sentiment</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Live-Einblick in das aktuelle Verhalten der Super-Investoren
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 1. Netto-Sentiment */}
            <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-brand-light" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Netto-Sentiment</h3>
                  <p className="text-sm text-gray-500">Letztes Quartal</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${
                    pulseData.sentimentPercentage >= 60 ? 'text-brand-light' :
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
                    <span className="text-gray-400">Netto-Käufer:</span>
                    <span className="text-brand-light font-semibold">{pulseData.netBuyers} Investoren</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Netto-Verkäufer:</span>
                    <span className="text-red-400 font-semibold">{pulseData.netSellers} Investoren</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Aktive Investoren:</span>
                    <span className="text-white font-semibold">{pulseData.totalInvestorsActive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Sektor-Momentum */}
            <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-brand-light" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sektor-Momentum</h3>
                  <p className="text-sm text-gray-500">Beliebt vs Unbeliebt</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-brand-light mb-2">🔥 Hot Sectors</h4>
                  {pulseData.hotSectors.map(([sector, count]) => (
                    <div key={sector} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{sector}</span>
                      <span className="text-brand-light">+{count}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-red-400 mb-2">❄️ Cold Sectors</h4>
                  {pulseData.coldSectors.map(([sector, count]) => (
                    <div key={sector} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{sector}</span>
                      <span className="text-red-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Aktivitäts-Level */}
            <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-brand-light" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Aktivitäts-Level</h3>
                  <p className="text-sm text-gray-500">Portfolio-Bewegungen</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {pulseData.averageChanges}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Änderungen pro Investor
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Änderungen:</span>
                    <span className="text-white font-semibold">{pulseData.totalPortfolioChanges}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Aktive Investoren:</span>
                    <span className="text-white font-semibold">{pulseData.totalInvestorsActive}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <Link
              href="/superinvestor/insights"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
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
      <section className="py-24 bg-gradient-to-b from-transparent via-green-500/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Bleib auf dem
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Laufenden</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Video-Analysen und Newsletter für tiefere Einblicke
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left: Videos */}
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <PlayIcon className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Portfolio Deep-Dives</h3>
              </div>
              
              <p className="text-gray-400 mb-8">
                Detaillierte Video-Analysen der Investment-Strategien und Portfolio-Bewegungen
              </p>
              
              <div className="bg-[#161618] rounded-2xl p-4 border border-white/[0.06]">
                <YouTubeCarousel videos={featuredVideos} />
              </div>
            </div>

            {/* Right: Newsletter */}
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-brand-light" />
                </div>
                <h3 className="text-2xl font-bold text-white">Newsletter</h3>
              </div>
              
              <p className="text-gray-400 mb-8">
                Nie wieder ein <span className="text-brand-light font-semibold">13F-Filing</span> verpassen. 
                Quartalsweise Updates über Portfolio-Bewegungen der Top-Investoren.
              </p>
              
              <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
                <div className="space-y-6">
                  {/* Benefits List */}
                  <div className="space-y-3 mb-6">
                    {[
                      '📊 Quartalsweise 13F-Analysen',
                      '🎯 Portfolio-Änderungen der Top-Investoren',
                      '📈 Markt-Trends und Insights',
                      '🚫 Kein Spam, nur relevante Updates'
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Form */}
                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="deine@email.de"
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-green-500/50 transition-all"
                    />
                    <button className="w-full px-4 py-3 bg-brand hover:bg-green-400 text-black font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02]">
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