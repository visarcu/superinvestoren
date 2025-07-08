// src/app/superinvestor/fear-greed-index/page.tsx - FIXED mit echten Daten
'use client'

import React, { useState, useRef, useEffect } from 'react'
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

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

// ✅ ECHTE FEAR & GREED BERECHNUNG basierend auf 13F-Filings
function calculateFearGreedMetrics() {
  let netBuyers = 0
  let netSellers = 0
  let totalInvestorsActive = 0
  let totalPortfolioValue = 0
  let averageConcentration = 0
  let activeSectors = new Set<string>()
  let sectorChanges = new Map<string, number>()
  
  // Berechnungen basierend auf letztem vs vorletztem Quartal
  Object.values(holdingsHistory).forEach(snaps => {
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
    
    // Sektor-Aktivität
    current.positions.forEach(p => {
      const sector = getSectorFromPosition({ cusip: p.cusip, ticker: getTicker(p) })
      const germanSector = translateSector(sector)
      activeSectors.add(germanSector)
    })
    
    // Portfolio-Änderungen für Sentiment
    const prevMap = new Map<string, number>()
    previous.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (ticker) {
        prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
      }
    })
    
    let investorBuys = 0
    let investorSells = 0
    
    const seen = new Set<string>()
    current.positions.forEach((p: any) => {
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
  
  // 7 Metriken berechnen
  const sentiment = totalInvestorsActive > 0 ? (netBuyers / totalInvestorsActive) * 100 : 50
  
  // Liquidität (weniger Konzentration = mehr Liquidität)
  const avgConcentration = totalInvestorsActive > 0 ? (averageConcentration / totalInvestorsActive) : 0.5
  const liquidity = (1 - avgConcentration) * 100
  
  // Diversifikation (Anzahl aktiver Sektoren)
  const diversification = Math.min((activeSectors.size / 11) * 100, 100) // Max 11 Haupt-Sektoren
  
  // Momentum (Sektor-Stärke)
  const sectorMomentum = Math.max(...Array.from(sectorChanges.values()), 0) * 10
  
  // Volatilität (Anzahl Änderungen)
  const totalChanges = netBuyers + netSellers
  const volatility = Math.min((totalChanges / totalInvestorsActive) * 100, 100)
  
  // Risk Appetite (große Positionen)
  const riskAppetite = avgConcentration * 100
  
  // Market Breadth (aktive Investoren)
  const marketBreadth = Math.min((totalInvestorsActive / 80) * 100, 100) // Max 80 Investoren
  
  const metrics = {
    sentiment: Math.round(sentiment),
    liquidity: Math.round(liquidity),
    diversification: Math.round(diversification),
    momentum: Math.round(Math.min(sectorMomentum, 100)),
    volatility: Math.round(volatility),
    riskAppetite: Math.round(riskAppetite),
    marketBreadth: Math.round(marketBreadth)
  }
  
  // Gesamt-Score (gewichteter Durchschnitt)
  const totalScore = Math.round(
    (metrics.sentiment * 0.25 +
     metrics.liquidity * 0.15 +
     metrics.diversification * 0.1 +
     metrics.momentum * 0.15 +
     (100 - metrics.volatility) * 0.1 + // Niedrige Volatilität = besser
     metrics.riskAppetite * 0.1 +
     metrics.marketBreadth * 0.15)
  )
  
  return { ...metrics, totalScore, totalInvestorsActive }
}

// ✅ HISTORISCHE DATEN - echte Berechnung über alle Quartale
function calculateHistoricalFearGreed() {
  const allQuarters = new Set<string>()
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps) return
    snaps.forEach(snap => {
      if (snap.quarter) {
        allQuarters.add(snap.quarter)
      }
    })
  })
  
  const sortedQuarters = Array.from(allQuarters).sort()
  
  return sortedQuarters.slice(-12).map(quarter => {
    let netBuyers = 0
    let totalActive = 0
    let avgLiquidity = 0
    let avgDiversification = 0
    
    Object.values(holdingsHistory).forEach(snaps => {
      if (!snaps || snaps.length < 2) return
      
      const currentSnap = snaps.find(s => s.quarter === quarter)
      const currentIndex = snaps.findIndex(s => s.quarter === quarter)
      const previousSnap = currentIndex > 0 ? snaps[currentIndex - 1] : null
      
      if (!currentSnap || !previousSnap) return
      
      totalActive++
      
      const current = currentSnap.data
      const previous = previousSnap.data
      
      // Liquidität
      const currentValue = current.positions?.reduce((sum, p) => sum + p.value, 0) || 0
      const sortedPos = [...(current.positions || [])].sort((a, b) => b.value - a.value)
      const top3Value = sortedPos.slice(0, 3).reduce((sum, p) => sum + p.value, 0)
      const concentration = currentValue > 0 ? (top3Value / currentValue) : 0.5
      avgLiquidity += (1 - concentration) * 100
      
      // Diversifikation
      const activeSectors = new Set<string>()
      current.positions?.forEach(p => {
        const sector = getSectorFromPosition({ cusip: p.cusip, ticker: getTicker(p) })
        activeSectors.add(translateSector(sector))
      })
      avgDiversification += Math.min((activeSectors.size / 11) * 100, 100)
      
      // Sentiment
      const prevMap = new Map<string, number>()
      previous.positions?.forEach((p: any) => {
        const ticker = getTicker(p)
        if (ticker) {
          prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
        }
      })
      
      let investorBuys = 0
      let investorSells = 0
      
      const seen = new Set<string>()
      current.positions?.forEach((p: any) => {
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
    
    // Gewichteter Score
    const score = Math.round(
      sentiment * 0.4 + liquidity * 0.3 + diversification * 0.3
    )
    
    return {
      quarter,
      score: Math.max(0, Math.min(100, score)),
      label: quarter.replace('-', ' ')
    }
  })
}

export default function FearGreedIndexPage() {
  // Animation refs
  const [heroRef, heroVisible] = useIntersectionObserver(0.3);
  const [gaugeRef, gaugeVisible] = useIntersectionObserver(0.3);
  const [metricsRef, metricsVisible] = useIntersectionObserver(0.1);
  const [historyRef, historyVisible] = useIntersectionObserver(0.1);

  // Berechne aktuelle Metriken
  const metrics = calculateFearGreedMetrics()
  const historicalData = calculateHistoricalFearGreed()
  
  // Debug für historische Daten
  console.log('Historical data:', historicalData)
  console.log('Metrics:', metrics)
  
  // Score zu Text Mapping
  const getScoreLabel = (score: number) => {
    if (score >= 75) return { text: 'Extreme Gier', color: 'text-green-400', bgColor: 'bg-green-500' }
    else if (score >= 55) return { text: 'Gier', color: 'text-green-300', bgColor: 'bg-green-400' }
    else if (score >= 45) return { text: 'Neutral', color: 'text-gray-300', bgColor: 'bg-gray-500' }
    else if (score >= 25) return { text: 'Angst', color: 'text-orange-400', bgColor: 'bg-orange-500' }
    else return { text: 'Extreme Angst', color: 'text-red-400', bgColor: 'bg-red-500' }
  }
  
  const currentLabel = getScoreLabel(metrics.totalScore)

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
                  {metrics.totalInvestorsActive || 70}+ Super-Investoren
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

        {/* ✅ HAUPTINDEX - Korrekt synchronisierter Zeiger */}
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
            
            {/* ✅ FIXED Gauge mit dynamischem Zeiger */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg width="300" height="180" viewBox="0 0 300 180" className="overflow-visible">
                  
                  {/* Background Arc */}
                  <path
                    d="M 45 150 A 105 105 0 0 1 255 150"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                  
                  {/* Fear Section (0-24) */}
                  <path
                    d="M 45 150 A 105 105 0 0 1 105 75"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="18"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  
                  {/* Angst Section (25-44) */}
                  <path
                    d="M 105 75 A 105 105 0 0 1 150 60"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="18"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  
                  {/* Neutral Section (45-54) */}
                  <path
                    d="M 150 60 A 105 105 0 0 1 150 60"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="18"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  
                  {/* Gier Section (55-74) */}
                  <path
                    d="M 150 60 A 105 105 0 0 1 195 75"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="18"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  
                  {/* Extreme Gier Section (75-100) */}
                  <path
                    d="M 195 75 A 105 105 0 0 1 255 150"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="18"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  
                  {/* ✅ DYNAMISCHER Needle */}
                  {(() => {
                    const score = metrics.totalScore
                    
                    // Berechne Winkel: 0% = 180°, 100% = 0°
                    const angle = 180 - (score / 100) * 180
                    const radians = (angle * Math.PI) / 180
                    
                    // Berechne End-Koordinaten
                    const centerX = 150
                    const centerY = 150
                    const length = 90
                    const endX = centerX + length * Math.cos(radians)
                    const endY = centerY + length * Math.sin(radians)
                    
                    return (
                      <line
                        x1={centerX}
                        y1={centerY}
                        x2={endX}
                        y2={endY}
                        stroke="#1F2937"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    )
                  })()}
                  
                  {/* Center Circle */}
                  <circle cx="150" cy="150" r="8" fill="#1F2937" />
                  
                  {/* Score Labels */}
                  <text x="45" y="165" fill="#9CA3AF" fontSize="12" textAnchor="middle">0</text>
                  <text x="255" y="165" fill="#9CA3AF" fontSize="12" textAnchor="middle">100</text>
                  <text x="150" y="45" fill="#9CA3AF" fontSize="12" textAnchor="middle">50</text>
                </svg>
                
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
            
            {/* Skala - Rot/Grau/Grün */}
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

        {/* ✅ 7 PSYCHOLOGIE-METRIKEN */}
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
            
            {/* 1. Sentiment */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Sentiment</h3>
                </div>
                <div className="text-2xl font-bold text-green-400">{metrics.sentiment}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Anteil der Investoren mit mehr Käufen als Verkäufen im letzten Quartal.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.sentiment}%` }}
                ></div>
              </div>
            </div>

            {/* 2. Liquidität */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Liquidität</h3>
                </div>
                <div className="text-2xl font-bold text-green-400">{metrics.liquidity}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Umgekehrte Konzentration. Höhere Werte = mehr diversifizierte Portfolios.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.liquidity}%` }}
                ></div>
              </div>
            </div>

            {/* 3. Diversifikation */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Diversifikation</h3>
                </div>
                <div className="text-2xl font-bold text-green-400">{metrics.diversification}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Anzahl aktiver Wirtschaftssektoren in den Portfolios.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.diversification}%` }}
                ></div>
              </div>
            </div>

            {/* 4. Momentum */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Momentum</h3>
                </div>
                <div className="text-2xl font-bold text-green-400">{metrics.momentum}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Stärke der Sektor-Trends und kollektiven Bewegungen.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.momentum}%` }}
                ></div>
              </div>
            </div>

            {/* 5. Volatilität */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <SignalIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Volatilität</h3>
                </div>
                <div className="text-2xl font-bold text-gray-300">{metrics.volatility}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Häufigkeit der Portfolio-Änderungen pro Investor.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-gray-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.volatility}%` }}
                ></div>
              </div>
            </div>

            {/* 6. Risikobereitschaft */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <ArrowTrendingDownIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Risikobereitschaft</h3>
                </div>
                <div className="text-2xl font-bold text-gray-300">{metrics.riskAppetite}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Durchschnittliche Konzentration der Top-3 Holdings.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-gray-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.riskAppetite}%` }}
                ></div>
              </div>
            </div>

            {/* 7. Marktbreite */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Marktbreite</h3>
                </div>
                <div className="text-2xl font-bold text-green-400">{metrics.marketBreadth}</div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Anteil der aktiven Super-Investoren am Gesamtuniversum.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics.marketBreadth}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ HISTORISCHE ENTWICKLUNG mit echten Daten */}
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
            
            {/* Chart */}
            <div className="mb-8">
              {historicalData.length > 0 ? (
                <div className="flex items-end justify-between gap-2 h-64 bg-gray-800/30 rounded-lg p-6">
                  {historicalData.map((data, index) => {
                    const height = Math.max((data.score / 100) * 200, 10) // Höhe in Pixel
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
                          {/* Score Label on Bar */}
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
                    <p className="text-lg font-semibold mb-2">Berechne historische Daten...</p>
                    <p className="text-sm">Basierend auf {metrics.totalInvestorsActive || 0} aktiven Investoren</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Legende - Rot/Grau/Grün */}
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
                  <span>{metrics.totalInvestorsActive || 70}+ Super-Investor Portfolios</span>
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

          {/* Interpretation - Rot/Grau/Grün */}
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