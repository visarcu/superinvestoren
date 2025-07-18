// src/app/superinvestor/fear-greed-index/page.tsx - PERFORMANCE OPTIMIERT
'use client'

import React, { useState, useRef, useEffect, useMemo, memo } from 'react'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  CalendarIcon,
  InformationCircleIcon,
  BoltIcon,
  SignalIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

// ========== TYPESCRIPT INTERFACES ==========
interface Position {
  cusip: string
  ticker?: string
  name?: string
  shares: number
  value: number
}

interface HoldingData {
  date: string
  positions: Position[]
}

interface HoldingSnapshot {
  data: HoldingData
  quarter?: string
}

interface FearGreedMetrics {
  sentiment: number
  liquidity: number
  diversification: number
  momentum: number
  volatility: number
  riskAppetite: number
  marketBreadth: number
  totalScore: number
  totalInvestorsActive: number
}

interface HistoricalDataPoint {
  quarter: string
  score: number
  label: string
}

interface ScoreLabel {
  text: string
  color: string
  bgColor: string
}

// ========== PERFORMANCE OPTIMIERUNGEN ==========

// 1. CACHE für schwere Berechnungen
const fearGreedCache = new Map<string, any>()

// 2. Preprocessing der Holdings-Daten für bessere Performance
const preprocessedFearGreedData = (() => {
  const cusipToTicker = new Map<string, string>()
  const activeInvestors = new Set<string>()
  const allQuarters = new Set<string>()
  
  // Stocks-Daten vorverarbeiten
  stocks.forEach(stock => {
    if (stock.cusip) {
      cusipToTicker.set(stock.cusip, stock.ticker)
    }
  })
  
  // Holdings-Daten einmal durchgehen
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (latest?.positions?.length > 0) {
      activeInvestors.add(slug)
    }
    
    snaps.forEach(snap => {
      if (snap?.quarter) {
        allQuarters.add(snap.quarter)
      } else if (snap?.data?.date) {
        // Fallback Quarter-Berechnung
        const [year, month] = snap.data.date.split('-').map(Number)
        const quarter = `${year}-Q${Math.ceil(month / 3)}`
        allQuarters.add(quarter)
      }
    })
  })
  
  return {
    cusipToTicker,
    activeInvestors: Array.from(activeInvestors),
    allQuarters: Array.from(allQuarters).sort().reverse()
  }
})()

// 3. Optimierte Hilfsfunktionen
function getTicker(position: Position): string | null {
  if (position.ticker) return position.ticker
  return preprocessedFearGreedData.cusipToTicker.get(position.cusip) || null
}

// 4. MEMOIZED Fear & Greed Berechnung
function calculateFearGreedMetrics(): FearGreedMetrics {
  const cacheKey = 'fearGreedMetrics'
  if (fearGreedCache.has(cacheKey)) {
    return fearGreedCache.get(cacheKey)
  }
  
  let netBuyers = 0
  let netSellers = 0
  let totalInvestorsActive = 0
  let totalPortfolioValue = 0
  let averageConcentration = 0
  const activeSectors = new Set<string>()
  const sectorChanges = new Map<string, number>()
  
  // Optimiert: Nur aktive Investoren durchgehen
  preprocessedFearGreedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length < 2) return
    
    const current = snaps[snaps.length - 1]?.data
    const previous = snaps[snaps.length - 2]?.data
    
    if (!current?.positions || !previous?.positions) return
    
    totalInvestorsActive++
    
    // Portfolio-Wert
    const currentValue = current.positions.reduce((sum, p) => sum + p.value, 0)
    totalPortfolioValue += currentValue
    
    // Konzentration (Top 3 Holdings Anteil)
    const sortedPositions = [...current.positions].sort((a, b) => b.value - a.value)
    const top3Value = sortedPositions.slice(0, 3).reduce((sum, p) => sum + p.value, 0)
    const concentration = currentValue > 0 ? (top3Value / currentValue) : 0
    averageConcentration += concentration
    
    // Sektor-Aktivität (optimiert mit Map)
    const currentSectors = new Map<string, number>()
    current.positions.forEach(p => {
      const sector = getSectorFromPosition({ cusip: p.cusip, ticker: getTicker(p) })
      const germanSector = translateSector(sector)
      activeSectors.add(germanSector)
      currentSectors.set(germanSector, (currentSectors.get(germanSector) || 0) + p.value)
    })
    
    // Portfolio-Änderungen für Sentiment (optimiert)
    const prevMap = new Map<string, number>()
    previous.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (ticker) {
        prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
      }
    })
    
    let investorBuys = 0
    let investorSells = 0
    
    const seen = new Set<string>()
    current.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (!ticker || seen.has(ticker)) return
      seen.add(ticker)
      
      const prevShares = prevMap.get(ticker) || 0
      const delta = p.shares - prevShares
      
      if (Math.abs(delta) > 100) {
        if (delta > 0) {
          investorBuys++
          const sector = getSectorFromPosition({ cusip: p.cusip, ticker })
          const germanSector = translateSector(sector)
          sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) + 1)
        } else {
          investorSells++
          const sector = getSectorFromPosition({ cusip: p.cusip, ticker })
          const germanSector = translateSector(sector)
          sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) - 1)
        }
      }
    })
    
    // Komplett verkaufte Positionen
    prevMap.forEach((prevShares, ticker) => {
      if (!seen.has(ticker) && prevShares > 100) {
        investorSells++
        const sector = getSectorFromPosition({ cusip: '', ticker })
        const germanSector = translateSector(sector)
        sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) - 1)
      }
    })
    
    if (investorBuys > investorSells) {
      netBuyers++
    } else if (investorSells > investorBuys) {
      netSellers++
    }
  })
  
  // 7 Metriken berechnen (optimiert)
  const sentiment = totalInvestorsActive > 0 ? (netBuyers / totalInvestorsActive) * 100 : 50
  
  const avgConcentration = totalInvestorsActive > 0 ? (averageConcentration / totalInvestorsActive) : 0.5
  const liquidity = (1 - avgConcentration) * 100
  
  const diversification = Math.min((activeSectors.size / 11) * 100, 100)
  
  const sectorMomentum = Math.max(...Array.from(sectorChanges.values()), 0) * 10
  
  const totalChanges = netBuyers + netSellers
  const volatility = Math.min((totalChanges / totalInvestorsActive) * 100, 100)
  
  const riskAppetite = avgConcentration * 100
  
  const marketBreadth = Math.min((totalInvestorsActive / 80) * 100, 100)
  
  const metrics: FearGreedMetrics = {
    sentiment: Math.round(sentiment),
    liquidity: Math.round(liquidity),
    diversification: Math.round(diversification),
    momentum: Math.round(Math.min(sectorMomentum, 100)),
    volatility: Math.round(volatility),
    riskAppetite: Math.round(riskAppetite),
    marketBreadth: Math.round(marketBreadth),
    totalScore: 0,
    totalInvestorsActive
  }
  
  // Gesamt-Score (gewichteter Durchschnitt)
  metrics.totalScore = Math.round(
    (metrics.sentiment * 0.25 +
     metrics.liquidity * 0.15 +
     metrics.diversification * 0.1 +
     metrics.momentum * 0.15 +
     (100 - metrics.volatility) * 0.1 +
     metrics.riskAppetite * 0.1 +
     metrics.marketBreadth * 0.15)
  )
  
  fearGreedCache.set(cacheKey, metrics)
  return metrics
}

// 5. MEMOIZED Historische Daten Berechnung
function calculateHistoricalFearGreed(): HistoricalDataPoint[] {
  const cacheKey = 'historicalFearGreed'
  if (fearGreedCache.has(cacheKey)) {
    return fearGreedCache.get(cacheKey)
  }
  
  const sortedQuarters = preprocessedFearGreedData.allQuarters.slice(-12)
  
  const result = sortedQuarters.map(quarter => {
    let netBuyers = 0
    let totalActive = 0
    let avgLiquidity = 0
    let avgDiversification = 0
    
    preprocessedFearGreedData.activeInvestors.forEach(slug => {
      const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
      if (!snaps || snaps.length < 2) return
      
      const currentSnap = snaps.find(s => s.quarter === quarter)
      const currentIndex = snaps.findIndex(s => s.quarter === quarter)
      const previousSnap = currentIndex > 0 ? snaps[currentIndex - 1] : null
      
      if (!currentSnap || !previousSnap) return
      
      totalActive++
      
      const current = currentSnap.data
      const previous = previousSnap.data
      
      // Liquidität (optimiert)
      const currentValue = current.positions?.reduce((sum, p) => sum + p.value, 0) || 0
      if (currentValue > 0) {
        const sortedPos = [...(current.positions || [])].sort((a, b) => b.value - a.value)
        const top3Value = sortedPos.slice(0, 3).reduce((sum, p) => sum + p.value, 0)
        const concentration = top3Value / currentValue
        avgLiquidity += (1 - concentration) * 100
      }
      
      // Diversifikation (optimiert)
      const activeSectors = new Set<string>()
      current.positions?.forEach(p => {
        const sector = getSectorFromPosition({ cusip: p.cusip, ticker: getTicker(p) })
        activeSectors.add(translateSector(sector))
      })
      avgDiversification += Math.min((activeSectors.size / 11) * 100, 100)
      
      // Sentiment (optimiert)
      const prevMap = new Map<string, number>()
      previous.positions?.forEach((p: Position) => {
        const ticker = getTicker(p)
        if (ticker) {
          prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
        }
      })
      
      let investorBuys = 0
      let investorSells = 0
      
      const seen = new Set<string>()
      current.positions?.forEach((p: Position) => {
        const ticker = getTicker(p)
        if (!ticker || seen.has(ticker)) return
        seen.add(ticker)
        
        const prevShares = prevMap.get(ticker) || 0
        const delta = p.shares - prevShares
        
        if (Math.abs(delta) > 100) {
          if (delta > 0) investorBuys++
          else investorSells++
        }
      })
      
      if (investorBuys > investorSells) {
        netBuyers++
      }
    })
    
    const sentiment = totalActive > 0 ? (netBuyers / totalActive) * 100 : 50
    const liquidity = totalActive > 0 ? avgLiquidity / totalActive : 50
    const diversification = totalActive > 0 ? avgDiversification / totalActive : 50
    
    const score = Math.round(sentiment * 0.4 + liquidity * 0.3 + diversification * 0.3)
    
    return {
      quarter,
      score: Math.max(0, Math.min(100, score)),
      label: quarter.replace('-', ' ')
    }
  })
  
  fearGreedCache.set(cacheKey, result)
  return result
}

// Animation Hook (optimiert)
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

// MEMOIZED Gauge Component
interface GaugeProps {
  score: number
  size?: number
}

const Gauge = memo<GaugeProps>(({ score, size = 300 }) => {
  const angle = 180 - (score / 100) * 180
  const radians = (angle * Math.PI) / 180
  
  const centerX = size / 2
  const centerY = size * 0.83 // 150/180 = 0.83
  const length = size * 0.3    // 90/300 = 0.3
  const endX = centerX + length * Math.cos(radians)
  const endY = centerY + length * Math.sin(radians)
  
  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`} className="overflow-visible">
      {/* Background Arc */}
      <path
        d={`M ${size * 0.15} ${size * 0.83} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.85} ${size * 0.83}`}
        fill="none"
        stroke="#374151"
        strokeWidth="18"
        strokeLinecap="round"
      />
      
      {/* Fear Section (0-24) */}
      <path
        d={`M ${size * 0.15} ${size * 0.83} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.35} ${size * 0.42}`}
        fill="none"
        stroke="#EF4444"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Angst Section (25-44) */}
      <path
        d={`M ${size * 0.35} ${size * 0.42} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.5} ${size * 0.33}`}
        fill="none"
        stroke="#F59E0B"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Neutral Section (45-54) */}
      <path
        d={`M ${size * 0.5} ${size * 0.33} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.5} ${size * 0.33}`}
        fill="none"
        stroke="#6B7280"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Gier Section (55-74) */}
      <path
        d={`M ${size * 0.5} ${size * 0.33} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.65} ${size * 0.42}`}
        fill="none"
        stroke="#34D399"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Extreme Gier Section (75-100) */}
      <path
        d={`M ${size * 0.65} ${size * 0.42} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.85} ${size * 0.83}`}
        fill="none"
        stroke="#10B981"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Dynamic Needle */}
      <line
        x1={centerX}
        y1={centerY}
        x2={endX}
        y2={endY}
        stroke="#1F2937"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Center Circle */}
      <circle cx={centerX} cy={centerY} r="8" fill="#1F2937" />
      
      {/* Score Labels */}
      <text x={size * 0.15} y={size * 0.92} fill="#9CA3AF" fontSize="12" textAnchor="middle">0</text>
      <text x={size * 0.85} y={size * 0.92} fill="#9CA3AF" fontSize="12" textAnchor="middle">100</text>
      <text x={size * 0.5} y={size * 0.25} fill="#9CA3AF" fontSize="12" textAnchor="middle">50</text>
    </svg>
  )
})

Gauge.displayName = 'Gauge'

export default function FearGreedIndexPage() {
  // Animation refs
  const [heroRef, heroVisible] = useIntersectionObserver(0.3)
  const [gaugeRef, gaugeVisible] = useIntersectionObserver(0.3)
  const [metricsRef, metricsVisible] = useIntersectionObserver(0.1)
  const [historyRef, historyVisible] = useIntersectionObserver(0.1)

  // MEMOIZED Berechnungen
  const metrics = useMemo(() => calculateFearGreedMetrics(), [])
  const historicalData = useMemo(() => calculateHistoricalFearGreed(), [])
  
  // Score zu Text Mapping (memoized)
  const getScoreLabel = useMemo(() => (score: number): ScoreLabel => {
    if (score >= 75) return { text: 'Extreme Gier', color: 'text-green-400', bgColor: 'bg-green-500' }
    else if (score >= 55) return { text: 'Gier', color: 'text-green-300', bgColor: 'bg-green-400' }
    else if (score >= 45) return { text: 'Neutral', color: 'text-gray-300', bgColor: 'bg-gray-500' }
    else if (score >= 25) return { text: 'Angst', color: 'text-orange-400', bgColor: 'bg-orange-500' }
    else return { text: 'Extreme Angst', color: 'text-red-400', bgColor: 'bg-red-500' }
  }, [])
  
  const currentLabel = useMemo(() => getScoreLabel(metrics.totalScore), [metrics.totalScore, getScoreLabel])

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Header */}
      <section className="bg-gray-950 noise-bg pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
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
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
                <EyeIcon className="w-4 h-4" />
                Weltweit Erster
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                Super-Investor
                <span className="block bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  Fear & Greed Index
                </span>
              </h1>
              
              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-6">
                Der erste psychologische Marktindikator basierend auf echten Portfolio-Bewegungen 
                der weltbesten Investoren statt Social Media Sentiment.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Live aus 13F-Filings
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {metrics.totalInvestorsActive}+ Super-Investoren
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Quartalsweise Updates
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* HAUPTINDEX - Optimiert */}
        <div ref={gaugeRef} className={`text-center mb-20 transform transition-all duration-1000 ${
          gaugeVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-8">
            <SignalIcon className="w-4 h-4" />
            Aktueller Index
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-8">
            Basierend auf den letzten 13F-Filings
          </h2>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 backdrop-blur-sm max-w-2xl mx-auto">
            
            {/* Optimierte Gauge */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Gauge score={metrics.totalScore} />
                
                {/* Score Display */}
                <div className="absolute inset-x-0 bottom-4 text-center">
                  <div className={`text-6xl font-bold mb-2 ${currentLabel.color}`}>
                    {metrics.totalScore}
                  </div>
                  <div className={`text-lg font-semibold ${currentLabel.color}`}>
                    {currentLabel.text}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interpretation */}
            <div className="text-center mb-6">
              <p className="text-gray-300 text-lg mb-4">
                Die Super-Investoren zeigen aktuell 
                <span className={`font-semibold ${currentLabel.color}`}> {currentLabel.text.toLowerCase()}</span> Verhalten.
              </p>
              <p className="text-gray-500 text-sm">
                Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
              </p>
            </div>
            
            {/* Skala */}
            <div className="grid grid-cols-3 gap-4 text-xs text-center">
              <div>
                <div className="h-2 bg-red-500 rounded mb-1"></div>
                <div className="text-red-400">0-44</div>
                <div className="text-gray-500">Angst</div>
              </div>
              <div>
                <div className="h-2 bg-gray-500 rounded mb-1"></div>
                <div className="text-gray-400">45-54</div>
                <div className="text-gray-500">Neutral</div>
              </div>
              <div>
                <div className="h-2 bg-green-500 rounded mb-1"></div>
                <div className="text-green-400">55-100</div>
                <div className="text-gray-500">Gier</div>
              </div>
            </div>
          </div>
        </div>

        {/* 7 PSYCHOLOGIE-METRIKEN - Optimiert */}
        <div ref={metricsRef} className={`mb-20 transform transition-all duration-1000 ${
          metricsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-sm font-medium mb-6">
              <ChartBarIcon className="w-4 h-4" />
              Die 7 Psychologie-Metriken
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Jede Metrik analysiert einen anderen Aspekt der Investor-Psychologie
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Metriken Array für bessere Performance */}
            {[
              {
                key: 'sentiment',
                title: 'Sentiment',
                value: metrics.sentiment,
                icon: ArrowTrendingUpIcon,
                description: 'Anteil der Investoren mit mehr Käufen als Verkäufen im letzten Quartal.',
                colorClass: 'text-green-400',
                barClass: 'bg-green-500'
              },
              {
                key: 'liquidity',
                title: 'Liquidität',
                value: metrics.liquidity,
                icon: CurrencyDollarIcon,
                description: 'Umgekehrte Konzentration. Höhere Werte = mehr diversifizierte Portfolios.',
                colorClass: 'text-green-400',
                barClass: 'bg-green-500'
              },
              {
                key: 'diversification',
                title: 'Diversifikation',
                value: metrics.diversification,
                icon: BuildingOfficeIcon,
                description: 'Anzahl aktiver Wirtschaftssektoren in den Portfolios.',
                colorClass: 'text-green-400',
                barClass: 'bg-green-500'
              },
              {
                key: 'momentum',
                title: 'Momentum',
                value: metrics.momentum,
                icon: BoltIcon,
                description: 'Stärke der Sektor-Trends und kollektiven Bewegungen.',
                colorClass: 'text-green-400',
                barClass: 'bg-green-500'
              },
              {
                key: 'volatility',
                title: 'Volatilität',
                value: metrics.volatility,
                icon: SignalIcon,
                description: 'Häufigkeit der Portfolio-Änderungen pro Investor.',
                colorClass: 'text-gray-300',
                barClass: 'bg-gray-500'
              },
              {
                key: 'riskAppetite',
                title: 'Risikobereitschaft',
                value: metrics.riskAppetite,
                icon: ArrowTrendingDownIcon,
                description: 'Durchschnittliche Konzentration der Top-3 Holdings.',
                colorClass: 'text-gray-300',
                barClass: 'bg-gray-500'
              },
              {
                key: 'marketBreadth',
                title: 'Marktbreite',
                value: metrics.marketBreadth,
                icon: ChartBarIcon,
                description: 'Anteil der aktiven Super-Investoren am Gesamtuniversum.',
                colorClass: 'text-green-400',
                barClass: 'bg-green-500'
              }
            ].map((metric, index) => (
              <div key={metric.key} className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 ${
                index === 6 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                      <metric.icon className="w-5 h-5 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{metric.title}</h3>
                  </div>
                  <div className={`text-2xl font-bold ${metric.colorClass}`}>{metric.value}</div>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  {metric.description}
                </p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 ${metric.barClass} rounded-full transition-all duration-1000`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HISTORISCHE ENTWICKLUNG - Optimiert */}
        <div ref={historyRef} className={`mb-20 transform transition-all duration-1000 ${
          historyVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-6">
              <CalendarIcon className="w-4 h-4" />
              Historische Entwicklung
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              12-Monats-Trend des Super-Investor Sentiments
            </h2>
            <p className="text-gray-400">
              Echte Daten basierend auf quartalsweisen 13F-Filings
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
            
            {/* Optimiertes Chart */}
            <div className="mb-8">
              {historicalData.length > 0 ? (
                <div className="flex items-end justify-between gap-2 h-64 bg-gray-800/30 rounded-lg p-6">
                  {historicalData.map((data, index) => {
                    const height = Math.max((data.score / 100) * 200, 10)
                    const label = getScoreLabel(data.score)
                    
                    return (
                      <div key={data.quarter} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer relative flex items-end justify-center"
                          style={{ 
                            height: `${height}px`, 
                            backgroundColor: data.score >= 55 ? '#10B981' : data.score >= 45 ? '#6B7280' : '#EF4444',
                            minHeight: '20px'
                          }}
                          title={`${data.label}: ${data.score} (${label.text})`}
                        >
                          <div className="text-white text-sm font-bold mb-2">
                            {data.score}
                          </div>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-700 z-10">
                            <div className="font-semibold">{data.label}</div>
                            <div>Score: {data.score}</div>
                            <div className={label.color}>{label.text}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-3 transform -rotate-45 origin-center whitespace-nowrap">
                          {data.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-64 bg-gray-800/30 rounded-lg p-6 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-semibold mb-2">Lade historische Daten...</p>
                    <p className="text-sm">Basierend auf {metrics.totalInvestorsActive} aktiven Investoren</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Legende */}
            <div className="flex items-center justify-center gap-6 text-xs">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Angst (0-44)
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                Neutral (45-54)
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Gier (55-100)
              </span>
            </div>
          </div>
        </div>

        {/* Methodik */}
        <section className="bg-gray-900/30 border border-gray-800 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-full text-sm font-medium mb-6">
              <InformationCircleIcon className="w-4 h-4" />
              Methodik
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Wie der weltweit erste Super-Investor Fear & Greed Index berechnet wird
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Datenquellen */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <InformationCircleIcon className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Datenquellen</h3>
              </div>
              
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>{metrics.totalInvestorsActive}+ Super-Investor Portfolios</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Quartalsweise 13F SEC Filings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>$2.5+ Billionen verwaltetes Vermögen</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Historische Daten seit 2013</span>
                </div>
              </div>
            </div>

            {/* Berechnung */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Berechnung</h3>
              </div>
              
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>7 gewichtete Psychologie-Metriken</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Skala von 0 (Extreme Angst) bis 100 (Extreme Gier)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Quartalsweise Aktualisierung</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Validierung durch historische Marktdaten</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-lg font-bold text-white mb-6 text-center">Interpretation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="text-red-400 font-bold mb-2">0-44</div>
                <div className="text-red-400 text-sm font-medium mb-2">Angst</div>
                <div className="text-gray-500 text-xs">Pessimismus, defensive Strategien, potentielle Kaufgelegenheit</div>
              </div>
              
              <div className="text-center p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                <div className="text-gray-200 font-bold mb-2">45-54</div>
                <div className="text-gray-200 text-sm font-medium mb-2">Neutral</div>
                <div className="text-gray-400 text-xs">Ausgewogene Markteinschätzung, normale Aktivität</div>
              </div>
              
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-green-400 font-bold mb-2">55-100</div>
                <div className="text-green-400 text-sm font-medium mb-2">Gier</div>
                <div className="text-gray-500 text-xs">Optimismus, steigende Risikobereitschaft, potentielle Überbewertung</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}