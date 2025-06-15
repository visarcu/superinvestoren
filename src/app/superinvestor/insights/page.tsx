// src/app/superinvestor/insights/page.tsx - KOMPLETT MODERNISIERT + NEUE FEATURES
'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  CalendarIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  StarIcon,
  EyeIcon,
  BoltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

// Animation Hook
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
  
  return [ref, isVisible] as const;
};

// CountUp Hook
const useCountUp = (end: number, duration = 2000, shouldStart = false) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(end * easeOutQuart));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, shouldStart]);
  
  return count;
};

// Hilfsfunktionen
function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

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

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getStockName(position: any): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
}

// Quarter-Filter-Typen und Komponente
interface QuarterOption {
  id: string
  label: string
  quarters: string[]
  description: string
}

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
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 transition-colors hover:scale-105"
      >
        <CalendarIcon className="w-4 h-4" />
        <span>{selectedOption?.label || 'Wählen'}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-[99999] backdrop-blur-sm">
          <div className="p-2 space-y-1">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  onSelect(option.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected === option.id 
                    ? 'bg-green-600 text-white' 
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

// Sektor-Mapping für bessere Kategorisierung
const sectorMapping: Record<string, string> = {
  'AAPL': 'Technology',
  'MSFT': 'Technology', 
  'GOOGL': 'Technology',
  'AMZN': 'Technology',
  'TSLA': 'Technology',
  'META': 'Technology',
  'NVDA': 'Technology',
  'BAC': 'Financial Services',
  'JPM': 'Financial Services',
  'WFC': 'Financial Services',
  'AXP': 'Financial Services',
  'KO': 'Consumer Staples',
  'PG': 'Consumer Staples',
  'JNJ': 'Healthcare',
  'UNH': 'Healthcare',
  'XOM': 'Energy',
  'CVX': 'Energy'
}

function getSector(ticker: string): string {
  return sectorMapping[ticker] || 'Other'
}

export default function MarketInsightsPage() {
  // Animation refs
  const [heroRef, heroVisible] = useIntersectionObserver(0.3);
  const [statsRef, statsVisible] = useIntersectionObserver(0.3);
  const [chartsRef, chartsVisible] = useIntersectionObserver(0.3);
  const [sectorsRef, sectorsVisible] = useIntersectionObserver(0.3);

  // Alle verfügbaren Quartale ermitteln
  const latestDatesPerInvestor = Object.values(holdingsHistory)
    .map(snaps => snaps[snaps.length - 1]?.data.date)
    .filter(Boolean) as string[]
  
  const latestDate = latestDatesPerInvestor.sort().pop() || ''
  const actualLatestQuarter = latestDate ? getPeriodFromDate(latestDate) : 'Q1 2025'
  
  const allQuarters = Array.from(new Set(
    Object.values(holdingsHistory)
      .flatMap(snaps => snaps.map(snap => getPeriodFromDate(snap.data.date)))
  )).sort().reverse()

  // Quarter-Filter-Optionen
  const quarterOptions: QuarterOption[] = [
    {
      id: 'latest',
      label: actualLatestQuarter,
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

  // State für Filter
  const [selectedPeriod, setSelectedPeriod] = useState('latest')
  const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
  const targetQuarters = selectedOption?.quarters || [actualLatestQuarter]

  // Top-Käufe Berechnung
  const buyCounts = new Map<string, number>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length === 0) return
    
    snaps.forEach((snap, idx) => {
      const currentQuarter = getPeriodFromDate(snap.data.date)
      
      if (!targetQuarters.includes(currentQuarter)) return
      
      const cur = snap.data
      
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

  const topBuys = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  // Beliebteste Aktien
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

  const topOwned = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  // Größte Investments
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

  const biggestInvestments = Array.from(investmentTotals.entries())
    .map(([ticker, { value, name }]) => ({ ticker, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)

  // Name-Lookup
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

  // NEU: Sektor-Analyse
  const sectorAnalysis = new Map<string, { value: number, count: number }>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (!ticker) return
      
      const sector = getSector(ticker)
      const current = sectorAnalysis.get(sector)
      
      if (current) {
        current.value += p.value
        current.count += 1
      } else {
        sectorAnalysis.set(sector, { value: p.value, count: 1 })
      }
    })
  })

  const topSectors = Array.from(sectorAnalysis.entries())
    .map(([sector, { value, count }]) => ({ sector, value, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // NEU: Konsensus vs. Contrarian Picks
  const consensusPicks = topOwned.slice(0, 5) // Top 5 most owned
  const contrarianPicks = Array.from(ownershipCount.entries())
    .filter(([, count]) => count >= 2 && count <= 4) // Held by 2-4 investors only
    .sort(([, a], [, b]) => a - b) // Sort by lowest ownership count
    .slice(0, 5)
    .map(([ticker, count]) => ({ ticker, count }))

  // NEU: Geographic Exposure (US vs International)
  const internationalTickers = new Set(['ASML', 'TSM', 'NESN', 'BABA', 'TCEHY', 'UL', 'NVO']) // Beispiel
  
  let usValue = 0, internationalValue = 0
  
  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (!ticker) return
      
      if (internationalTickers.has(ticker)) {
        internationalValue += p.value
      } else {
        usValue += p.value
      }
    })
  })

  const totalValue = usValue + internationalValue
  const usPercentage = totalValue > 0 ? (usValue / totalValue) * 100 : 0
  const intlPercentage = totalValue > 0 ? (internationalValue / totalValue) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Kompakte Header für Unterseite */}
      <section className="bg-gray-950 noise-bg pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zur Übersicht
            </Link>
          </div>

          <div ref={heroRef} className={`transform transition-all duration-1000 ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            {/* Kompakter Header */}
            <div className="flex items-center gap-3 mb-4">
              <ChartBarIcon className="w-6 h-6 text-green-400" />
              <h1 className="text-3xl font-bold text-white">Market Insights</h1>
            </div>
            
            <p className="text-lg text-gray-400 max-w-4xl leading-relaxed">
              Detaillierte Analysen der Käufe, Verkäufe und Bewegungen der besten Investoren der Welt.
              Entdecke Trends, Sektoren und Investment-Patterns der Super-Investoren.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Stats Overview - Korrigiert */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(topBuys.filter(buy => buy.count > 0).length, 2000, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Gekaufte Aktien</p>
                <p className="text-gray-600 text-xs">{selectedOption?.label || 'Aktueller Zeitraum'}</p>
              </div>
            </div>
          </div>
          
          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '200ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(topOwned.length, 2200, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Beliebte Aktien</p>
                <p className="text-gray-600 text-xs">Von 2+ Investoren gehalten</p>
              </div>
            </div>
          </div>
          
          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(Math.round(biggestInvestments.reduce((sum, inv) => sum + inv.value, 0) / 1_000_000_000), 2400, statsVisible)}B
                </p>
                <p className="text-gray-400 text-sm">Gesamt-Investment</p>
                <p className="text-gray-600 text-xs">Top 20 Positionen</p>
              </div>
            </div>
          </div>

          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '600ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(topSectors.length, 2600, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Top Sektoren</p>
                <p className="text-gray-600 text-xs">Nach Investment-Volumen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Charts Grid - Erweitert */}
        <div ref={chartsRef} className={`grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 transform transition-all duration-1000 ${
          chartsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          {/* Top Käufe - MIT EIGENEM FILTER */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Top Käufe</h3>
                  <p className="text-sm text-gray-400">Meist gekaufte Aktien</p>
                </div>
              </div>
              {/* Filter nur hier */}
              <QuarterSelector
                options={quarterOptions}
                selected={selectedPeriod}
                onSelect={setSelectedPeriod}
              />
            </div>

            {/* Info Badge nur hier */}
            {selectedOption && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-xs text-green-400">
                  📊 {selectedOption.description}
                  {targetQuarters.length > 1 && (
                    <span className="block mt-1 text-gray-400">
                      Zeigt Käufe aus: {targetQuarters.join(', ')}
                    </span>
                  )}
                </p>
              </div>
            )}
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {topBuys.length > 0 ? (
                topBuys.slice(0, 15).map((item, idx) => (
                  <Link
                    key={item.ticker}
                    href={`/analyse/${item.ticker.toLowerCase()}`}
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{item.ticker.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                          {item.ticker}
                        </p>
                        <p className="text-gray-500 text-xs truncate max-w-[120px]">
                          {nameMap[item.ticker] || item.ticker}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 text-sm font-semibold bg-green-500/20 px-2 py-1 rounded">
                        {item.count}
                      </span>
                      <p className="text-xs text-gray-500">Investoren</p>
                    </div>
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

          {/* Beliebteste Aktien - OHNE FILTER */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FireIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Beliebteste Aktien</h3>
                <p className="text-sm text-gray-400">Meist gehaltene Positionen</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {topOwned.slice(0, 15).map((item, idx) => (
                <Link
                  key={item.ticker}
                  href={`/analyse/${item.ticker.toLowerCase()}`}
                  className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{item.ticker.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {item.ticker}
                      </p>
                      <p className="text-gray-500 text-xs truncate max-w-[120px]">
                        {nameMap[item.ticker] || item.ticker}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-400 text-sm font-semibold bg-blue-500/20 px-2 py-1 rounded">
                      {item.count}
                    </span>
                    <p className="text-xs text-gray-500">Portfolios</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Größte Investments - OHNE FILTER */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Größte Investments</h3>
                <p className="text-sm text-gray-400">Nach Dollar-Volumen</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {biggestInvestments.slice(0, 15).map((item, idx) => (
                <Link
                  key={item.ticker}
                  href={`/analyse/${item.ticker.toLowerCase()}`}
                  className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{item.ticker.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-purple-400 transition-colors">
                        {item.ticker}
                      </p>
                      <p className="text-gray-500 text-xs truncate max-w-[120px]">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-purple-400 text-sm font-semibold">
                      {formatCurrency(item.value / 1000000, 'USD', 1)}
                    </span>
                    <p className="text-xs text-gray-500">Wert</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* NEU: Erweiterte Analysen */}
        <div ref={sectorsRef} className={`space-y-16 transform transition-all duration-1000 ${
          sectorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          {/* NEU: Portfolio Concentration Analysis */}
          <section>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-sm font-medium mb-6">
                <ShieldCheckIcon className="w-4 h-4" />
                Portfolio Concentration
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Konzentration vs.
                <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent"> Diversifikation</span>
              </h2>
              <p className="text-gray-400">
                Wer setzt auf wenige große Positionen vs. breite Diversifikation?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                // Portfolio Concentration Berechnung
                const concentrationData: Array<{
                  investor: string;
                  concentration: number;
                  top3Percentage: number;
                  totalPositions: number;
                  type: 'high' | 'medium' | 'low';
                }> = [];

                ['buffett', 'ackman', 'smith', 'gates', 'marks', 'icahn'].forEach(slug => {
                  const snaps = holdingsHistory[slug];
                  if (!snaps || snaps.length === 0) return;

                  const latest = snaps[snaps.length - 1].data;
                  if (!latest?.positions) return;

                  // Merge positions und sortieren
                  const mergedMap = new Map<string, number>();
                  latest.positions.forEach(p => {
                    const ticker = getTicker(p) || p.cusip;
                    mergedMap.set(ticker, (mergedMap.get(ticker) || 0) + p.value);
                  });

                  const sortedPositions = Array.from(mergedMap.values()).sort((a, b) => b - a);
                  const totalValue = sortedPositions.reduce((sum, val) => sum + val, 0);
                  
                  if (totalValue === 0) return;

                  // Herfindahl-Index Berechnung (0 = sehr diversifiziert, 1 = sehr konzentriert)
                  const herfindahl = sortedPositions.reduce((sum, value) => {
                    const percentage = value / totalValue;
                    return sum + (percentage * percentage);
                  }, 0);

                  // Top 3 Positionen Prozentsatz
                  const top3Value = sortedPositions.slice(0, 3).reduce((sum, val) => sum + val, 0);
                  const top3Percentage = (top3Value / totalValue) * 100;

                  // Kategorisierung
                  let type: 'high' | 'medium' | 'low';
                  if (herfindahl > 0.2) type = 'high';
                  else if (herfindahl > 0.1) type = 'medium';
                  else type = 'low';

                  const investorNames: Record<string, string> = {
                    buffett: 'Warren Buffett',
                    ackman: 'Bill Ackman', 
                    smith: 'Terry Smith',
                    gates: 'Bill Gates',
                    marks: 'Howard Marks',
                    icahn: 'Carl Icahn'
                  };

                  concentrationData.push({
                    investor: investorNames[slug] || slug,
                    concentration: herfindahl,
                    top3Percentage,
                    totalPositions: sortedPositions.length,
                    type
                  });
                });

                // Sortieren nach Konzentration (höchste zuerst)
                concentrationData.sort((a, b) => b.concentration - a.concentration);

                return concentrationData.map((data, index) => (
                  <div
                    key={data.investor}
                    className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">{data.investor}</h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        data.type === 'high' ? 'bg-red-500/20 text-red-400' :
                        data.type === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {data.type === 'high' ? 'Konzentriert' :
                         data.type === 'medium' ? 'Ausgewogen' : 'Diversifiziert'}
                      </div>
                    </div>

                    {/* Concentration Meter */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">Konzentrations-Index</span>
                        <span className="text-white font-semibold">{(data.concentration * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            data.type === 'high' ? 'bg-red-500' :
                            data.type === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(data.concentration * 100 * 5, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Top 3 Holdings:</span>
                        <span className={`font-semibold ${
                          data.top3Percentage > 60 ? 'text-red-400' :
                          data.top3Percentage > 40 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {data.top3Percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Gesamt-Positionen:</span>
                        <span className="text-white font-semibold">{data.totalPositions}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </section>

          {/* NEU: Sektor-Analyse */}
          <section>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium mb-6">
                <BuildingOfficeIcon className="w-4 h-4" />
                Sektor-Analyse
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Investment
                <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent"> Sektoren</span>
              </h2>
              <p className="text-gray-400">
                Wie die Super-Investoren ihr Kapital auf verschiedene Wirtschaftssektoren verteilen
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topSectors.map((sector, index) => (
                <div
                  key={sector.sector}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{sector.sector}</h3>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Gesamt-Wert:</span>
                      <span className="text-yellow-400 font-semibold">
                        {formatCurrency(sector.value / 1000000000, 'USD', 1)}B
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Positionen:</span>
                      <span className="text-white font-semibold">{sector.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

         

          {/* Konsensus vs. Contrarian */}
          <section>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium mb-6">
                <EyeIcon className="w-4 h-4" />
                Investment-Strategie
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Konsensus vs.
                <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent"> Contrarian</span>
              </h2>
              <p className="text-gray-400">
                Aktien mit breitem Konsensus vs. unentdeckte Gems nur weniger Investoren
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Konsensus Picks */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <StarIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Konsensus Picks</h3>
                    <p className="text-sm text-gray-400">Von vielen Investoren gehalten</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {consensusPicks.map((item, index) => (
                    <div key={item.ticker} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                        <div>
                          <p className="text-white font-medium">{item.ticker}</p>
                          <p className="text-gray-500 text-xs">{nameMap[item.ticker]}</p>
                        </div>
                      </div>
                      <span className="text-green-400 text-sm font-semibold">
                        {item.count} Investoren
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contrarian Picks */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Contrarian Picks</h3>
                    <p className="text-sm text-gray-400">Hidden Gems weniger Investoren</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {contrarianPicks.map((item, index) => (
                    <div key={item.ticker} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                        <div>
                          <p className="text-white font-medium">{item.ticker}</p>
                          <p className="text-gray-500 text-xs">{nameMap[item.ticker]}</p>
                        </div>
                      </div>
                      <span className="text-cyan-400 text-sm font-semibold">
                        {item.count} Investoren
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Geographic Exposure */}
          <section>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-6">
                <GlobeAltIcon className="w-4 h-4" />
                Geographic Exposure
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Globale
                <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent"> Diversifikation</span>
              </h2>
              <p className="text-gray-400">
                Verteilung zwischen US-amerikanischen und internationalen Investments
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* US Exposure */}
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeDasharray={`${usPercentage}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-400">{usPercentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">🇺🇸 US-Märkte</h3>
                    <p className="text-blue-400 font-semibold">
                      {formatCurrency(usValue / 1000000000, 'USD', 1)}B
                    </p>
                  </div>

                  {/* International Exposure */}
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray={`${intlPercentage}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-green-400">{intlPercentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">🌍 International</h3>
                    <p className="text-green-400 font-semibold">
                      {formatCurrency(internationalValue / 1000000000, 'USD', 1)}B
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}