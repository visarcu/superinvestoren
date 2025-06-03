// src/app/superinvestor/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import YouTubeCarousel from '@/components/YoutubeCarousel'
import { featuredVideos } from '@/data/videos'
import { investors, Investor } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import NewsletterSignup from '@/components/NewsletterSignup'
import InvestorAvatar from '@/components/InvestorAvatar'

interface TopOwnedItem {
  ticker: string
  count: number
}

// Währung formatieren
function formatCurrency(
  amount: number,
  currency: 'USD' | 'EUR' = 'USD',
  maximumFractionDigits = 0
) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

// Datum → tatsächliches Reporting-Quartal (ein Filing-Quartal zurück)
function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

export default function SuperinvestorPage() {
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)

  // 1. Portfolio-Werte je Investor
  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0) / 1_000
    portfolioValue[slug] = total
  })

  // 2. Weitere Investoren
  const highlighted = ['buffett', 'ackman', 'smith']
  const others: Investor[] = investors
    .filter(inv => !highlighted.includes(inv.slug))
    .sort((a, b) => (portfolioValue[b.slug] || 0) - (portfolioValue[a.slug] || 0))
  const visibleOthers = showAll ? others : others.slice(0, 8)

  // 3. Top-10 Käufe aus dem letzten Reporting-Quartal
  const allDates = Object.values(holdingsHistory)
    .map(snaps => snaps[snaps.length - 1]?.data.date)
    .filter(Boolean) as string[]
  const latestDate = allDates.sort().pop() || ''
  const latestQuarter = latestDate ? getPeriodFromDate(latestDate) : ''

  const buyCounts = new Map<string, number>()
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length < 2) return
    const prev = snaps[snaps.length - 2].data
    const cur = snaps[snaps.length - 1].data

    if (getPeriodFromDate(cur.date) !== latestQuarter) return

    const prevMap = new Map<string, number>()
    prev.positions.forEach(p =>
      prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares)
    )

    const seen = new Set<string>()
    cur.positions.forEach(p => {
      const delta = p.shares - (prevMap.get(p.cusip) || 0)
      if (delta > 0) {
        const st = stocks.find(s => s.cusip === p.cusip)
        if (st && !seen.has(st.ticker)) {
          seen.add(st.ticker)
          buyCounts.set(st.ticker, (buyCounts.get(st.ticker) || 0) + 1)
        }
      }
    })
  })

  const aggregated = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }))

  // 4. Name-Lookup für Stocks
  const nameMap: Record<string, string> = {}
  stocks.forEach(s => { nameMap[s.ticker] = s.name })

  // 5. Top-10 Meistgehalten
  const cusipToTicker = new Map(stocks.map(s => [s.cusip, s.ticker]))
  const ownershipCount = new Map<string, number>()
  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    const seen = new Set<string>()
    latest.positions.forEach(p => {
      const t = cusipToTicker.get(p.cusip)
      if (t && !seen.has(t)) {
        seen.add(t)
        ownershipCount.set(t, (ownershipCount.get(t) || 0) + 1)
      }
    })
  })

  const topOwned: TopOwnedItem[] = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }))

  // 6. Top-10 Biggest Investments
  const biggest = stocks
    .map(s => {
      const total = Object.values(holdingsHistory).reduce((sum, snaps) => {
        const latest = snaps[snaps.length - 1].data
        const match = latest.positions.find(p => p.cusip === s.cusip)
        return sum + (match?.value || 0)
      }, 0)
      return { ticker: s.ticker, name: s.name, value: total }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Hilfs-Funktion für Sneak-Peek Top-3 Positionen
  function peekPositions(slug: string) {
    const snaps = holdingsHistory[slug]
    if (!Array.isArray(snaps) || snaps.length === 0) return []
    const latest = snaps[snaps.length - 1].data
    const map = new Map<string, { shares: number; value: number }>()
    latest.positions.forEach(p => {
      const prev = map.get(p.cusip)
      if (prev) {
        prev.shares += p.shares
        prev.value += p.value
      } else {
        map.set(p.cusip, { shares: p.shares, value: p.value })
      }
    })
    return Array.from(map.entries())
      .map(([cusip, { shares, value }]) => {
        const st = stocks.find(s => s.cusip === cusip)
        return { ticker: st?.ticker ?? cusip, name: st?.name ?? cusip, value }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* Hero Section - Clean Supabase Style */}
      <section className="relative overflow-hidden bg-gray-950">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="text-center">
            {/* Clean Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-8 hover:bg-blue-500/20 transition-colors">
              <UserGroupIcon className="w-4 h-4" />
              <span>Super-Investoren</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
              Die besten Investoren
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                der Welt
              </span>
            </h2>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              Entdecke, wie Legenden wie Warren Buffett, Bill Ackman und Terry Smith investieren
              <br className="hidden sm:block" />
              mit aktuellen Portfolios, Top-Käufen & detaillierten Analysen.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Featured Investors */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">
              Top-Investoren
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {investors
              .filter(i => highlighted.includes(i.slug))
              .map(inv => {
                const peek = peekPositions(inv.slug)
                const portfolioVal = portfolioValue[inv.slug] || 0
                
                return (
                  <Link
                    key={inv.slug}
                    href={`/investor/${inv.slug}`}
                    className="group bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 relative overflow-hidden"
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
                        className="ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-200"
                      />
                    </div>
                    
                    {/* Name */}
                    <h3 className="text-xl font-bold text-white text-center mb-2 group-hover:text-blue-400 transition-colors">
                      {inv.name.split('–')[0].trim()}
                    </h3>
                    
                    {/* Portfolio Value */}
                    <p className="text-center text-gray-400 mb-4">
                      Portfolio: <span className="text-green-400 font-medium">
                        {formatCurrency(portfolioVal, 'USD', 1)}
                      </span>
                    </p>
                    
                    {/* Top 3 Holdings Preview */}
                    {peek.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500 text-center mb-3">Top Holdings:</p>
                        {peek.slice(0, 3).map((p, idx) => (
                          <div key={p.ticker} className="flex justify-between items-center text-sm">
                            <span className="text-gray-300">{idx + 1}. {p.ticker}</span>
                            <span className="text-gray-500 truncate ml-2">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* View Portfolio Button */}
                    <div className="mt-6 text-center">
                      <span className="inline-flex items-center gap-1 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                        Portfolio ansehen
                        <ArrowRightIcon className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                )
              })}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <ChartBarIcon className="w-5 h-5 text-gray-400" />
            <h2 className="text-2xl font-bold text-white">
              Market Insights
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Top Käufe */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Top Käufe</h3>
                <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">{latestQuarter}</span>
              </div>
              <div className="space-y-3">
                {aggregated.slice(0, 6).map((item, idx) => (
                  <Link
                    key={item.ticker}
                    href={`/analyse/${item.ticker.toLowerCase()}`}
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm w-4">{idx + 1}</span>
                      <div>
                        <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                          {item.ticker}
                        </p>
                        <p className="text-gray-500 text-xs truncate max-w-[180px]">
                          {nameMap[item.ticker]}
                        </p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm bg-gray-700 px-2 py-1 rounded">
                      {item.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Meistgehalten */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Beliebteste Aktien</h3>
              <div className="space-y-3">
                {topOwned.slice(0, 6).map((item, idx) => (
                  <Link
                    key={item.ticker}
                    href={`/analyse/${item.ticker.toLowerCase()}`}
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm w-4">{idx + 1}</span>
                      <div>
                        <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                          {item.ticker}
                        </p>
                        <p className="text-gray-500 text-xs truncate max-w-[180px]">
                          {nameMap[item.ticker]}
                        </p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm bg-gray-700 px-2 py-1 rounded">
                      {item.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Größte Investments */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Größte Investments</h3>
              <div className="space-y-3">
                {biggest.slice(0, 6).map((item, idx) => (
                  <Link
                    key={item.ticker}
                    href={`/analyse/${item.ticker.toLowerCase()}`}
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm w-4">{idx + 1}</span>
                      <div>
                        <p className="text-white font-medium group-hover:text-purple-400 transition-colors">
                          {item.ticker}
                        </p>
                        <p className="text-gray-500 text-xs truncate max-w-[180px]">
                          {item.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {formatCurrency(item.value / 1000000, 'USD', 1)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Other Investors */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Weitere Investoren</h2>
            {others.length > 8 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                {showAll ? 'Weniger anzeigen' : `Alle (${others.length}) anzeigen`}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleOthers.map(inv => (
              <Link
                key={inv.slug}
                href={`/investor/${inv.slug}`}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <InvestorAvatar
                    name={inv.name}
                    imageUrl={inv.imageUrl}
                    size="sm"
                    className="ring-1 ring-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
                      {inv.name.split('–')[0].trim()}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {formatCurrency(portfolioValue[inv.slug] || 0, 'USD', 1)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Video Section */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">
            Neueste Video-Analysen
          </h2>
          <YouTubeCarousel videos={featuredVideos} />
        </section>

        {/* Info & Newsletter */}
        <section className="grid md:grid-cols-2 gap-8">
          {/* 13F Info */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Was sind 13F-Filings?</h3>
                <p className="text-gray-400 leading-relaxed">
                  Quartalsberichte großer institutioneller Investmentmanager an die US-SEC. 
                  Diese Berichte zeigen alle Aktienpositionen über $100M und geben uns 
                  Einblicke in die Strategien der besten Investoren.
                </p>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-3">
              Nie wieder ein Update verpassen
            </h3>
            <p className="text-gray-400 mb-6">
              Quartalsweise Updates über neue 13F-Filings und Investment-Insights.
            </p>
            <NewsletterSignup />
          </div>
        </section>
      </div>
    </div>
  )
}