// src/app/superinvestor/page.tsx - Mit interaktivem Quarter-Filter
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
  ChartBarIcon,
  ChevronDownIcon,
  CalendarIcon,
  ArrowLeftIcon
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

// Quarter-Filter-Optionen
interface QuarterOption {
  id: string
  label: string
  quarters: string[]
  description: string
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

// HILFSFUNKTION: Ticker aus Position extrahieren (13F + Dataroma)
function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

// HILFSFUNKTION: Name aus Position extrahieren
function getStockName(position: any): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
}

// Quarter-Dropdown-Komponente
function QuarterSelector({ 
  options, 
  selected, 
  onSelect 
}: { 
  options: QuarterOption[]
  selected: string
  onSelect: (id: string) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(opt => opt.id === selected)
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
      >
        <CalendarIcon className="w-4 h-4" />
        <span>{selectedOption?.label || 'Wählen'}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
          <div className="p-2 space-y-1">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  onSelect(option.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selected === option.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-400">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SuperinvestorPage() {
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)

  // 1. Alle verfügbaren Quartale ermitteln - KORRIGIERT
  // Nehme nur die neuesten Daten pro Investor (wie vorher)
  const latestDatesPerInvestor = Object.values(holdingsHistory)
    .map(snaps => snaps[snaps.length - 1]?.data.date)
    .filter(Boolean) as string[]
  
  // Das wirklich neueste Datum (z.B. 2025-06-05 von Torray)
  const latestDate = latestDatesPerInvestor.sort().pop() || ''
  const actualLatestQuarter = latestDate ? getPeriodFromDate(latestDate) : 'Q1 2025'
  
  // Alle verfügbaren Quartale sammeln (für Filter-Optionen)
  const allQuarters = Array.from(new Set(
    Object.values(holdingsHistory)
      .flatMap(snaps => snaps.map(snap => getPeriodFromDate(snap.data.date)))
  )).sort().reverse() // Neueste zuerst

  // 2. Quarter-Filter-Optionen erstellen - KORRIGIERT
  const quarterOptions: QuarterOption[] = [
    {
      id: 'latest',
      label: actualLatestQuarter, // Verwende das WIRKLICH neueste
      quarters: [actualLatestQuarter],
      description: 'Neuestes Quartal'
    },
    {
      id: 'last2',
      label: 'Letzte 2 Quartale',
      quarters: allQuarters.slice(0, 2),
      description: `${allQuarters.slice(0, 2).join(' + ')}`
    },
    {
      id: 'last3',
      label: 'Letzte 3 Quartale',
      quarters: allQuarters.slice(0, 3),
      description: `${allQuarters.slice(0, 3).join(', ')}`
    },
    ...allQuarters.slice(0, 6).map(quarter => ({
      id: quarter,
      label: quarter,
      quarters: [quarter],
      description: 'Einzelnes Quartal'
    })),
    {
      id: 'all',
      label: 'Alle Zeit',
      quarters: allQuarters,
      description: 'Alle verfügbaren Quartale'
    }
  ]

  // 3. State für ausgewählten Filter
  const [selectedPeriod, setSelectedPeriod] = useState('latest')
  const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
  const targetQuarters = selectedOption?.quarters || [actualLatestQuarter]

  // 4. Portfolio-Werte je Investor
  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    // ENTFERNT: / 1_000 - behalte Original-Dollar-Werte
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0)
    portfolioValue[slug] = total
  })
  

  // 5. Weitere Investoren
  const highlighted = ['buffett', 'ackman', 'smith']
  const others: Investor[] = investors
    .filter(inv => !highlighted.includes(inv.slug))
    .sort((a, b) => (portfolioValue[b.slug] || 0) - (portfolioValue[a.slug] || 0))
  const visibleOthers = showAll ? others : others.slice(0, 8)

  // 6. ERWEITERTE TOP-KÄUFE mit Quarter-Filter
  const buyCounts = new Map<string, number>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length === 0) return
    
    // Für jedes Target-Quarter prüfen
    snaps.forEach((snap, idx) => {
      const currentQuarter = getPeriodFromDate(snap.data.date)
      
      // Nur verarbeiten wenn Quarter im Filter enthalten
      if (!targetQuarters.includes(currentQuarter)) return
      
      const cur = snap.data
      
      // Wenn mindestens 2 Snapshots: Vergleiche mit vorherigem
      if (idx > 0) {
        const prev = snaps[idx - 1].data
        
        const prevMap = new Map<string, number>()
        prev.positions.forEach((p: any) => {
          const ticker = getTicker(p)
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
          }
        })

        const seen = new Set<string>()
        cur.positions.forEach((p: any) => {
          const ticker = getTicker(p)
          if (!ticker || seen.has(ticker)) return
          
          const prevShares = prevMap.get(ticker) || 0
          const delta = p.shares - prevShares
          
          if (delta > 0) {
            seen.add(ticker)
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      } else {
        // Erste Snapshots: Alle als "Käufe" zählen
        const seen = new Set<string>()
        cur.positions.forEach((p: any) => {
          const ticker = getTicker(p)
          if (ticker && !seen.has(ticker)) {
            seen.add(ticker)
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      }
    })
  })

  const aggregated = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }))

  // 7. ERWEITERTE BELIEBTESTE AKTIEN (unterstützt Dataroma + 13F)
  const ownershipCount = new Map<string, number>()
  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    
    const seen = new Set<string>()
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (ticker && !seen.has(ticker)) {
        seen.add(ticker)
        ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1)
      }
    })
  })

  const topOwned: TopOwnedItem[] = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }))

  // 8. ERWEITERTE GRÖSSTE INVESTMENTS (unterstützt Dataroma + 13F)
  const investmentTotals = new Map<string, { value: number, name: string }>()

  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (!ticker) return
      
      const name = getStockName(p)
      const current = investmentTotals.get(ticker)
      
      if (current) {
        current.value += p.value
      } else {
        investmentTotals.set(ticker, { value: p.value, name })
      }
    })
  })

  const biggest = Array.from(investmentTotals.entries())
    .map(([ticker, { value, name }]) => ({ ticker, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // 9. ERWEITERTE NAME-LOOKUP (unterstützt Dataroma + 13F)
  const nameMap: Record<string, string> = {}

  stocks.forEach(s => { 
    nameMap[s.ticker] = s.name 
  })

  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (ticker && !nameMap[ticker]) {
        nameMap[ticker] = getStockName(p)
      }
    })
  })

  // 10. ERWEITERTE Hilfs-Funktion für Sneak-Peek Top-3 Positionen
  function peekPositions(slug: string) {
    const snaps = holdingsHistory[slug]
    if (!Array.isArray(snaps) || snaps.length === 0) return []
    const latest = snaps[snaps.length - 1].data
    const map = new Map<string, { shares: number; value: number }>()
    
    latest.positions.forEach(p => {
      const ticker = getTicker(p)
      const key = ticker || p.cusip
      
      const prev = map.get(key)
      if (prev) {
        prev.shares += p.shares
        prev.value += p.value
      } else {
        map.set(key, { shares: p.shares, value: p.value })
      }
    })
    
    return Array.from(map.entries())
      .map(([key, { shares, value }]) => {
        const ticker = getTicker({ ticker: key, cusip: key })
        const name = getStockName({ ticker: key, cusip: key, name: key })
        
        return { 
          ticker: ticker || key, 
          name: name || key, 
          value 
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      
   {/* Hero Section - VERBESSERT: Gradient umgekehrt + grüner Text */}
   <section className="relative overflow-hidden bg-gray-950">
        {/* Background Effects - GEÄNDERT: Gradient von oben (blau) nach unten (schwarz) */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/8 via-gray-950 to-gray-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/4 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="text-center">
            {/* Clean Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-8 hover:bg-blue-500/20 transition-colors">
              <UserGroupIcon className="w-4 h-4" />
              <span>Super-Investoren</span>
            </div>
            
            {/* Main Heading - GEÄNDERT: "der Welt" in grün statt blau */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
              Die besten Investoren
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                der Welt
              </span>
            </h2>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              Entdecke, wie Legenden wie Warren Buffett, Bill Ackman und Terry Smith investieren.
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
            
            {/* Top Käufe - MIT QUARTER-FILTER */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Top Käufe</h3>
                <QuarterSelector
                  options={quarterOptions}
                  selected={selectedPeriod}
                  onSelect={setSelectedPeriod}
                />
              </div>
              
              {/* Info Badge */}
              {selectedOption && (
                <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400">
                    📊 {selectedOption.description}
                    {targetQuarters.length > 1 && (
                      <span className="block mt-1 text-gray-400">
                        Zeigt Käufe aus: {targetQuarters.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                {aggregated.length > 0 ? (
                  aggregated.slice(0, 6).map((item, idx) => (
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
                            {nameMap[item.ticker] || item.ticker}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm bg-gray-700 px-2 py-1 rounded">
                        {item.count}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Käufe in diesem Zeitraum</p>
                  </div>
                )}
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
                          {nameMap[item.ticker] || item.ticker}
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

        <section className="mb-20">
  <div className="flex items-center justify-between mb-8">
    <h2 className="text-2xl font-bold text-white">Weitere Investoren</h2>
    {others.length > 12 && (
      <button
        onClick={() => setShowAll(!showAll)}
        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
      >
        {showAll ? 'Weniger anzeigen' : `Alle (${others.length}) anzeigen`}
      </button>
    )}
  </div>
  
  <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
    {/* Header */}
    <div className="border-b border-gray-800 px-6 py-3 bg-gray-800/30">
      <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 font-medium">
        <div className="col-span-7 sm:col-span-8">Investor</div>
        <div className="col-span-5 sm:col-span-4 text-right">Portfolio-Wert</div>
      </div>
    </div>
    
    {/* Investor Liste */}
    <div className="divide-y divide-gray-800">
      {(showAll ? others : others.slice(0, 12)).map((inv, idx) => {
        const portfolioVal = portfolioValue[inv.slug] || 0
        
        // KORRIGIERTE Farbkodierung - nutzt echte Dollar-Werte
        const getValueColor = (value: number) => {
          if (value >= 10_000_000_000) return 'text-green-400'     // 10B+
          if (value >= 5_000_000_000) return 'text-emerald-400'    // 5B+
          if (value >= 1_000_000_000) return 'text-blue-400'       // 1B+
          if (value >= 500_000_000) return 'text-cyan-400'         // 500M+
          return 'text-gray-400'                                   // unter 500M
        }
        
        // KORRIGIERTE Formatierung - nutzt echte Dollar-Werte
        const formatPortfolioValue = (value: number) => {
          if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)} Mrd.`
          } else if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(0)} Mio.`
          } else if (value >= 1_000) {
            return `${(value / 1_000).toFixed(0)}k`
          } else {
            return '–'
          }
        }
        
        return (
          <Link
            key={inv.slug}
            href={`/investor/${inv.slug}`}
            className="block hover:bg-gray-800/30 transition-colors"
          >
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              {/* Investor Info */}
              <div className="col-span-7 sm:col-span-8 min-w-0">
                <div className="flex items-center gap-3">
                  {/* Ranking-Nummer */}
                  <span className="text-gray-500 text-sm font-mono w-6 text-right flex-shrink-0">
                    {idx + 1}
                  </span>
                  
                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
                      {inv.name.split('–')[0].trim()}
                    </p>
                    {inv.name.includes('–') && (
                      <p className="text-gray-500 text-xs truncate">
                        {inv.name.split('–')[1].trim()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Portfolio-Wert */}
              <div className="col-span-5 sm:col-span-4 text-right">
                {portfolioVal > 0 ? (
                  <div className="flex flex-col items-end">
                    <span className={`font-semibold ${getValueColor(portfolioVal)}`}>
                      {formatPortfolioValue(portfolioVal)}
                    </span>
                    {/* KORRIGIERT: Nutze formatCurrency OHNE zusätzliche Division */}
                    {portfolioVal >= 1_000_000_000 && (
                      <span className="text-gray-600 text-xs">
                        {formatCurrency(portfolioVal, 'USD', 0)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-600 text-sm">–</span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
    
    {/* Show all button */}
    {!showAll && others.length > 12 && (
      <div className="border-t border-gray-800 px-6 py-4 bg-gray-800/30">
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-gray-400 hover:text-blue-400 text-sm font-medium transition-colors"
        >
          + {others.length - 12} weitere Investoren anzeigen
        </button>
      </div>
    )}
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