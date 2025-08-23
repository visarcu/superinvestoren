// src/app/superinvestor/page.tsx - PERFORMANCE OPTIMIERT
'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
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
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import InvestorAvatar from '@/components/InvestorAvatar'
import YouTubeCarousel from '@/components/YoutubeCarousel'
import { featuredVideos } from '@/data/videos'
import NewsletterSignup from '@/components/NewsletterSignup'
import SuperinvestorInfo from '@/components/SuperinvestorInfo'
import Logo from '@/components/Logo'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'


// Nur Hero Animation Hook
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

// Helper functions (gleich wie vorher)
function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
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

// MEMOIZED: Peek Positions - jetzt mit useMemo aufgerufen
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

// MEMOIZED: Fear & Greed Berechnung
function calculateFearGreedIndex() {
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
    const concentration = currentValue > 0 ? (top3Value / currentValue) : 0.5
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
  
  // Gesamt-Score (gewichteter Durchschnitt)
  const totalScore = Math.round(
    (sentiment * 0.25 +
     liquidity * 0.15 +
     diversification * 0.1 +
     sectorMomentum * 0.15 +
     (100 - volatility) * 0.1 + // Niedrige Volatilität = besser
     riskAppetite * 0.1 +
     marketBreadth * 0.15)
  )
  
  return totalScore
}

// MEMOIZED: Investment Pulse
function calculateInvestmentPulse() {
  let netBuyers = 0
  let netSellers = 0
  let totalPortfolioChanges = 0
  let totalInvestorsActive = 0
  const sectorChanges = new Map<string, number>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length < 2) return
    
    const current = snaps[snaps.length - 1]?.data
    const previous = snaps[snaps.length - 2]?.data
    
    if (!current?.positions || !previous?.positions) return
    
    totalInvestorsActive++
    
    // Portfolio-Änderungen zählen
    const prevMap = new Map<string, number>()
    previous.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (ticker) {
        prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
      }
    })
    
    let investorBuys = 0
    let investorSells = 0
    let investorChanges = 0
    
    const seen = new Set<string>()
    current.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (!ticker || seen.has(ticker)) return
      seen.add(ticker)
      
      const prevShares = prevMap.get(ticker) || 0
      const delta = p.shares - prevShares
      
      if (Math.abs(delta) > 100) { // Signifikante Änderung
        investorChanges++
        
        if (delta > 0) {
          investorBuys++
          
          // Sektor-Momentum berechnen
          const sector = getSectorFromPosition({
            cusip: p.cusip,
            ticker: ticker
          })
          const germanSector = translateSector(sector)
          sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) + 1)
        } else {
          investorSells++
          
          // Negative für Verkäufe
          const sector = getSectorFromPosition({
            cusip: p.cusip,
            ticker: ticker
          })
          const germanSector = translateSector(sector)
          sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) - 1)
        }
      }
    })
    
    // Komplett verkaufte Positionen
    prevMap.forEach((prevShares, ticker) => {
      if (!seen.has(ticker) && prevShares > 100) {
        investorSells++
        investorChanges++
        
        const sector = getSectorFromPosition({
          cusip: '',
          ticker: ticker
        })
        const germanSector = translateSector(sector)
        sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) - 1)
      }
    })
    
    totalPortfolioChanges += investorChanges
    
    // Netto-Sentiment: Mehr Käufe oder Verkäufe?
    if (investorBuys > investorSells) {
      netBuyers++
    } else if (investorSells > investorBuys) {
      netSellers++
    }
  })
  
  // Top 3 Hot/Cold Sektoren
  const sortedSectors = Array.from(sectorChanges.entries())
    .sort(([, a], [, b]) => b - a)
  
  const hotSectors = sortedSectors.slice(0, 3).filter(([, change]) => change > 0)
  const coldSectors = sortedSectors.slice(-3).filter(([, change]) => change < 0).reverse()
  
  const sentimentPercentage = totalInvestorsActive > 0 
    ? Math.round((netBuyers / totalInvestorsActive) * 100) 
    : 50
  
  return {
    netBuyers,
    netSellers,
    totalInvestorsActive,
    sentimentPercentage,
    totalPortfolioChanges,
    averageChanges: Math.round(totalPortfolioChanges / Math.max(totalInvestorsActive, 1)),
    hotSectors,
    coldSectors
  }
}

// MEMOIZED: Historische Fear & Greed Index Berechnung
function calculateHistoricalFearGreed() {
  // Sammle alle verfügbaren Quartale
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
    
    Object.values(holdingsHistory).forEach(snaps => {
      if (!snaps || snaps.length < 2) return
      
      const currentSnap = snaps.find(s => s.quarter === quarter)
      const currentIndex = snaps.findIndex(s => s.quarter === quarter)
      const previousSnap = currentIndex > 0 ? snaps[currentIndex - 1] : null
      
      if (!currentSnap || !previousSnap) return
      
      totalActive++
      
      const current = currentSnap.data
      const previous = previousSnap.data
      
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
          if (delta > 0) {
            investorBuys++
          } else {
            investorSells++
          }
        }
      })
      
      // Komplett verkaufte Positionen
      prevMap.forEach((prevShares, ticker) => {
        if (!seen.has(ticker) && prevShares > 100) {
          investorSells++
        }
      })
      
      if (investorBuys > investorSells) {
        netBuyers++
      }
    })
    
    const sentimentPercentage = totalActive > 0 ? Math.round((netBuyers / totalActive) * 100) : 50
    const fearGreedScore = Math.min(Math.max(sentimentPercentage + 10, 0), 100) // Leichte Anpassung für Realismus
    
    return {
      quarter,
      score: fearGreedScore,
      label: quarter.replace('-', ' ')
    }
  })
}



export default function SuperinvestorOverview() {
  // 1. ALLE STATE HOOKS ZUERST
  const [isLoading, setIsLoading] = useState(true)
  
  // 2. ALLE MEMOIZED BERECHNUNGEN
  const portfolioValue = useMemo(() => {
    const result: Record<string, number> = {}
    Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return
      const total = latest.positions.reduce((sum, p) => sum + p.value, 0)
      result[slug] = total
    })
    return result
  }, [])
  
  const pulseData = useMemo(() => calculateInvestmentPulse(), [])
  
  const trendingStocks = useMemo(() => {
    const buyCounts = new Map<string, number>();
    const sellCounts = new Map<string, number>();
    
    Object.values(holdingsHistory).forEach(snaps => {
      if (!snaps || snaps.length < 2) return;
      
      const recentSnaps = snaps.slice(-2);
      
      for (let i = 1; i < recentSnaps.length; i++) {
        const current = recentSnaps[i].data;
        const previous = recentSnaps[i - 1].data;
        
        if (!current?.positions || !previous?.positions) continue;
        
        const prevMap = new Map<string, number>();
        previous.positions.forEach((p: any) => {
          const ticker = getTicker(p);
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares);
          }
        });

        const seen = new Set<string>();
        current.positions.forEach((p: any) => {
          const ticker = getTicker(p);
          if (!ticker || seen.has(ticker)) return;
          seen.add(ticker);

          const prevShares = prevMap.get(ticker) || 0;
          const delta = p.shares - prevShares;

          if (delta > 0) {
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1);
          } else if (delta < 0 && prevShares > 0) {
            sellCounts.set(ticker, (sellCounts.get(ticker) || 0) + 1);
          }
        });

        prevMap.forEach((prevShares, ticker) => {
          if (!seen.has(ticker) && prevShares > 0) {
            sellCounts.set(ticker, (sellCounts.get(ticker) || 0) + 1);
          }
        });
      }
    });

    const topBuys = Array.from(buyCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 16);

    const topSells = Array.from(sellCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 16);

    const maxBuys = Math.max(...topBuys.map(([, count]) => count), 1);
    const maxSells = Math.max(...topSells.map(([, count]) => count), 1);
    
    return { topBuys, topSells, maxBuys, maxSells };
  }, [])
  
  const biggestTrades = useMemo(() => {
    const bigTrades: Array<{
      ticker: string;
      name: string;
      action: 'Gekauft' | 'Verkauft' | 'Erhöht' | 'Reduziert';
      change: string;
      investor: string;
      investorSlug: string;
      color: string;
      value: number;
    }> = [];

    Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
      if (!snaps || snaps.length < 2) return;
      
      const current = snaps[snaps.length - 1]?.data;
      const previous = snaps[snaps.length - 2]?.data;
      
      if (!current?.positions || !previous?.positions) return;

      const investorName = investors.find(inv => inv.slug === slug)?.name?.split('–')[0]?.trim() || 
                         slug.charAt(0).toUpperCase() + slug.slice(1);

      const currentMap = new Map<string, number>();
      const currentValueMap = new Map<string, number>();
      const nameMap = new Map<string, string>();
      
      current.positions.forEach(p => {
        const ticker = getTicker(p);
        if (!ticker) return;
        
        currentMap.set(ticker, (currentMap.get(ticker) || 0) + p.shares);
        currentValueMap.set(ticker, (currentValueMap.get(ticker) || 0) + p.value);
        if (!nameMap.has(ticker)) {
          nameMap.set(ticker, getStockName(p));
        }
      });

      const previousMap = new Map<string, number>();
      previous.positions.forEach(p => {
        const ticker = getTicker(p);
        if (!ticker) return;
        previousMap.set(ticker, (previousMap.get(ticker) || 0) + p.shares);
      });

      currentMap.forEach((currentShares, ticker) => {
        const previousShares = previousMap.get(ticker) || 0;
        const delta = currentShares - previousShares;
        const currentValue = currentValueMap.get(ticker) || 0;
        
        if (Math.abs(delta) > 1000 && currentValue > 100_000_000) {
          let action: 'Gekauft' | 'Verkauft' | 'Erhöht' | 'Reduziert';
          let color: string;
          
          if (previousShares === 0) {
            action = 'Gekauft';
            color = 'text-green-400';
          } else if (delta > 0) {
            action = 'Erhöht';
            color = 'text-green-400';
          } else {
            action = 'Reduziert';
            color = 'text-red-400';
          }

          const formattedValue = currentValue >= 1_000_000_000 
            ? `${(currentValue / 1_000_000_000).toFixed(1).replace('.', ',')} Mrd.` 
            : `${(currentValue / 1_000_000).toFixed(0)} Mio.`;

          bigTrades.push({
            ticker,
            name: nameMap.get(ticker) || ticker,
            action,
            change: formattedValue,
            investor: investorName,
            investorSlug: slug,
            color,
            value: currentValue
          });
        }
      });

      previousMap.forEach((previousShares, ticker) => {
        if (!currentMap.has(ticker) && previousShares > 1000) {
          const estimatedValue = previousShares * 100;
          
          if (estimatedValue > 100_000_000) {
            const formattedValue = estimatedValue >= 1_000_000_000 
              ? `${(estimatedValue / 1_000_000_000).toFixed(1).replace('.', ',')} Mrd.` 
              : `${(estimatedValue / 1_000_000).toFixed(0)} Mio.`;

            bigTrades.push({
              ticker,
              name: ticker,
              action: 'Verkauft',
              change: formattedValue,
              investor: investorName,
              investorSlug: slug,
              color: 'text-red-400',
              value: estimatedValue
            });
          }
        }
      });
    });

    return bigTrades.sort((a, b) => b.value - a.value).slice(0, 6);
  }, [])

  const highlighted = ['buffett', 'ackman', 'smith']

  const featuredInvestors = useMemo(() => {
    return investors
      .filter(i => highlighted.includes(i.slug))
      .concat(
        investors.filter(i => ['marks', 'tepper', 'klarman'].includes(i.slug))
      )
      .slice(0, 6)
      .map(inv => ({
        ...inv,
        peek: peekPositions(inv.slug),
        portfolioValue: portfolioValue[inv.slug] || 0
      }))
  }, [portfolioValue])

  // 3. ANIMATION HOOK
  const [heroRef, heroVisible] = useIntersectionObserver(0.3);

  // 4. SIDE EFFECTS (useEffect)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // 5. CONDITIONAL RETURNS
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black"> {/* Einheitlich schwarz */}
      
      {/* Hero Section - OHNE doppelte Überschrift */}
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
                <UserGroupIcon className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">{investors.length}+</div>
                <div className="text-sm text-gray-500">Top Investoren</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <CircleStackIcon className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">2,5 Billionen $</div>
                <div className="text-sm text-gray-500">Verwaltetes Vermögen</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">Q2 2025</div>
                <div className="text-sm text-gray-500">Letztes Update</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

{/* Top Investors Section - MODERNISIERT */}
<section className="py-24 px-4">
  <div className="max-w-7xl mx-auto">
    
    <div className="text-center mb-16">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full mb-6 border border-green-500/20">
        <TrophyIcon className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">Featured Investoren</span>
      </div>
      
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
        Die Top
        <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Performer</span>
      </h2>
    </div>
    
    {/* Investor Cards - CLEANER STYLE */}
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
          <h3 className="text-xl font-bold text-white text-center mb-2 group-hover:text-green-400 transition-colors">
            {inv.name.split('–')[0].trim()}
          </h3>
          
          {/* Portfolio Value */}
          <p className="text-center text-gray-400 mb-4">
            Portfolio: <span className="text-green-400 font-medium">
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
            <span className="inline-flex items-center gap-1 text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
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
        className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-green-500/25"
      >
        Alle {investors.length} Investoren durchsuchen
        <ArrowRightIcon className="w-5 h-5" />
      </Link>
      <p className="text-gray-500 text-sm mt-3">
        Erweiterte Filter, Suche und detaillierte Portfolio-Analysen
      </p>
    </div>
  </div>
</section>

      {/* TRENDING STOCKS SECTION mit Theme-Farben */}
      <section className="bg-[#0A0A0B]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-white-400 rounded-full text-sm font-medium mb-6" style={{ borderColor: 'var(--border-color)' }}>
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
            
            {/* HEATMAP mit Theme-Farben */}
            <div className="bg-[#161618] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#2A2A2A]">
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
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-green-400">Meist gekaufte Aktien</h4>
                      <span className="text-xs text-gray-500">({trendingStocks.topBuys.length} Aktien)</span>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {trendingStocks.topBuys.map(([ticker, count]) => {
                        const intensity = count / trendingStocks.maxBuys;
                        let bgColor = 'bg-green-500/20';
                        let textColor = 'text-green-300';
                        
                        if (intensity >= 0.8) {
                          bgColor = 'bg-green-500/80';
                          textColor = 'text-white';
                        } else if (intensity >= 0.6) {
                          bgColor = 'bg-green-500/60';
                          textColor = 'text-white';
                        } else if (intensity >= 0.4) {
                          bgColor = 'bg-green-500/40';
                          textColor = 'text-green-100';
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
                        );
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
                        const intensity = count / trendingStocks.maxSells;
                        let bgColor = 'bg-red-500/20';
                        let textColor = 'text-red-300';
                        
                        if (intensity >= 0.8) {
                          bgColor = 'bg-red-500/80';
                          textColor = 'text-white';
                        } else if (intensity >= 0.6) {
                          bgColor = 'bg-red-500/60';
                          textColor = 'text-white';
                        } else if (intensity >= 0.4) {
                          bgColor = 'bg-red-500/40';
                          textColor = 'text-red-100';
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
                        );
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

            {/* Größte Trades mit Theme-Farben */}
            <div className="bg-[#161618] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#2A2A2A] w-8 h-8 rounded-lg flex items-center justify-center">
  <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
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
          className="text-white font-medium text-sm hover:text-green-400 transition-colors"
        >
          {trade.ticker}
        </Link>
        <span className="text-gray-500 text-xs">
          {trade.action}
        </span>
      </div>
      <Link
        href={`/superinvestor/${trade.investorSlug}`}
        className="text-gray-500 text-xs hover:text-green-400 transition-colors"
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
                className="block text-center mt-4 text-green-400 hover:text-green-300 text-sm transition-colors"
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

{/* Investment-Pulse Sektion - KONSISTENTE FARBEN */}
<section className="py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <div className="text-center mb-16">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full mb-6 border border-green-500/20">
        <SignalIcon className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">Investment-Pulse</span>
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
      
      {/* 1. Netto-Sentiment - KONSISTENT */}
      <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Netto-Sentiment</h3>
            <p className="text-sm text-gray-500">Letztes Quartal</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${
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
              <span className="text-gray-400">Netto-Käufer:</span>
              <span className="text-green-400 font-semibold">{pulseData.netBuyers} Investoren</span>
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

      {/* 2. Sektor-Momentum - KONSISTENT */}
      <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <BuildingOfficeIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Sektor-Momentum</h3>
            <p className="text-sm text-gray-500">Beliebt vs Unbeliebt</p>
          </div>
        </div>
        
        {/* Rest bleibt gleich */}
      </div>

      {/* 3. Aktivitäts-Level - KONSISTENT */}
      <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <BoltIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Aktivitäts-Level</h3>
            <p className="text-sm text-gray-500">Portfolio-Bewegungen</p>
          </div>
        </div>
        
        {/* Rest bleibt gleich */}
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

  {/* 
<section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium mb-6" style={{ borderColor: 'var(--border-color)' }}>
              <EyeIcon className="w-4 h-4" />
              Weltweit Erster
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Super-Investor
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Fear & Greed Index</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Psychologischer Marktindikator basierend auf echten 13F-Filings statt Social Media
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)',  }} className=" rounded-2xl p-8 lg:p-12 backdrop-blur-sm relative overflow-hidden">
            
    
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5 rounded-2xl"></div>
            
            <div className="relative z-10">
              
    
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
                    
                     <path
                      d="M 30 100 A 70 70 0 0 1 170 100"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    
     
                    <path
                      d="M 30 100 A 70 70 0 0 1 90 45"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    
       
                    <path
                      d="M 90 45 A 70 70 0 0 1 110 45"
                      fill="none"
                      stroke="#6B7280" 
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    
   
                    <path
                      d="M 110 45 A 70 70 0 0 1 170 100"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    
         
                    {(() => {
                      // Berechne Winkel: 0% = 180°, 100% = 0°
                      const angle = 180 - (fearGreedScore / 100) * 180
                      const radians = (angle * Math.PI) / 180
                      
                      // Berechne End-Koordinaten
                      const centerX = 100
                      const centerY = 100
                      const length = 60
                      const endX = centerX + length * Math.cos(radians)
                      const endY = centerY + length * Math.sin(radians)
                      
                      return (
                        <line
                          x1={centerX}
                          y1={centerY}
                          x2={endX}
                          y2={endY}
                          stroke="#1F2937"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      )
                    })()}
                    
                       <circle cx="100" cy="100" r="5" fill="#1F2937" />
                  </svg>
                  

                  <div className="absolute inset-x-0 bottom-2 text-center">
                    <div className="text-4xl font-bold text-green-400 mb-1">
                      {fearGreedScore}
                    </div>
                    <div className="text-sm font-semibold text-green-400">
                      {(() => {
                        if (fearGreedScore >= 75) return 'Extreme Gier'
                        else if (fearGreedScore >= 55) return 'Gier'
                        else if (fearGreedScore >= 45) return 'Neutral'
                        else if (fearGreedScore >= 25) return 'Angst'
                        else return 'Extreme Angst'
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
         
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">Historische Entwicklung</h3>
                <p className="text-sm text-gray-400 text-center mb-4">
                  12-Monats-Trend des Super-Investor Sentiments
                </p>
                
                <div className="bg-[#2A2A2A]">
                  <div className="flex items-end justify-between gap-2 h-24">
                    {historicalData.map((data, index) => {
                      const height = Math.max((data.score / 100) * 100, 5) // Min 5% height
                      let color = '#6B7280' // Default grau
                      
                      if (data.score >= 75) color = '#10B981' // Grün für Gier
                      else if (data.score >= 55) color = '#34D399' // Hell-grün
                      else if (data.score >= 45) color = '#6B7280' // Grau für Neutral
                      else if (data.score >= 25) color = '#F59E0B' // Orange für Angst
                      else color = '#EF4444' // Rot für Extreme Angst
                      
                      return (
                        <div key={data.quarter} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer"
                            style={{ 
                              height: `${height}%`, 
                              backgroundColor: color,
                              minHeight: '8px'
                            }}
                            title={`${data.label}: ${data.score} (${data.score >= 75 ? 'Extreme Gier' : data.score >= 55 ? 'Gier' : data.score >= 45 ? 'Neutral' : data.score >= 25 ? 'Angst' : 'Extreme Angst'})`}
                          />
                          <div className="text-xs text-gray-500 mt-2 -rotate-45 origin-center whitespace-nowrap">
                            {data.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    Extreme Angst (0-24)
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    Neutral (45-54)
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Extreme Gier (75-100)
                  </span>
                </div>
              </div>
              
      
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">7</div>
                  <div className="text-sm text-gray-400">Psychologie-Metriken</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">{pulseData.totalInvestorsActive}+</div>
                  <div className="text-sm text-gray-400">Super-Investoren</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">$2.5B+</div>
                  <div className="text-sm text-gray-400">Verwaltetes Vermögen</div>
                </div>
              </div>
              
  
              <div className="text-center mb-8">
                <p className="text-gray-300 mb-4 leading-relaxed">
                  Der erste psychologische Marktindikator basierend auf echten Portfolio-Bewegungen 
                  der weltbesten Investoren. Analysiert Sentiment, Liquidität, Sektor-Allokation und mehr.
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Live aus 13F-Filings
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Quartalsweise Updates
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Keine Social Media Daten
                  </span>
                </div>
              </div>
              
     
              <div className="text-center">
                <Link
                  href="/superinvestor/fear-greed-index"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-semibold rounded-xl transition-colors duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
                >
                  <EyeIcon className="w-5 h-5" />
                  <span>Vollständige Analyse</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <p className="text-gray-500 text-sm mt-3">
                  Detaillierte Aufschlüsselung aller 7 Metriken
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
*/}
       {/* Video & Newsletter Section - REDESIGNED */}
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
        
        <div className="mt-6 text-center">
     
        </div>
      </div>

      {/* Right: Newsletter */}
      <div>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">Newsletter</h3>
        </div>
        
        <p className="text-gray-400 mb-8">
          Nie wieder ein <span className="text-green-400 font-semibold">13F-Filing</span> verpassen. 
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
                className="w-full px-4 py-3 bg-[#1A1A1D] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
              <button className="w-full px-4 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02]">
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