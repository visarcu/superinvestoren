// src/lib/superinvestorOverview.ts
// Server-only: Daten der Superinvestoren-Übersicht (/superinvestor). Wird direkt
// von der Server-Seite genutzt (SSR statt Ladebildschirm) und von /api/overview.

import holdingsHistory from '@/data/holdings'
import { investors } from '@/data/investors'
import { stocks } from '@/data/stocks'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'
import type { OverviewData } from '@/hooks/useOverviewData'

// Helper functions
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
      
      if (Math.abs(delta) > 100) {
        investorChanges++
        
        if (delta > 0) {
          investorBuys++
          
          const sector = getSectorFromPosition({
            cusip: p.cusip,
            ticker: ticker
          })
          const germanSector = translateSector(sector)
          sectorChanges.set(germanSector, (sectorChanges.get(germanSector) || 0) + 1)
        } else {
          investorSells++
          
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
    
    if (investorBuys > investorSells) {
      netBuyers++
    } else if (investorSells > investorBuys) {
      netSellers++
    }
  })
  
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

function calculateTrendingStocks() {
  const buyCounts = new Map<string, number>()
  const sellCounts = new Map<string, number>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length < 2) return
    
    const recentSnaps = snaps.slice(-2)
    
    for (let i = 1; i < recentSnaps.length; i++) {
      const current = recentSnaps[i].data
      const previous = recentSnaps[i - 1].data
      
      if (!current?.positions || !previous?.positions) continue
      
      const prevMap = new Map<string, number>()
      previous.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        if (ticker) {
          prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
        }
      })

      const seen = new Set<string>()
      current.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        if (!ticker || seen.has(ticker)) return
        seen.add(ticker)

        const prevShares = prevMap.get(ticker) || 0
        const delta = p.shares - prevShares

        if (delta > 0) {
          buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
        } else if (delta < 0 && prevShares > 0) {
          sellCounts.set(ticker, (sellCounts.get(ticker) || 0) + 1)
        }
      })

      prevMap.forEach((prevShares, ticker) => {
        if (!seen.has(ticker) && prevShares > 0) {
          sellCounts.set(ticker, (sellCounts.get(ticker) || 0) + 1)
        }
      })
    }
  })

  const topBuys = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 16)

  const topSells = Array.from(sellCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 16)

  const maxBuys = Math.max(...topBuys.map(([, count]) => count), 1)
  const maxSells = Math.max(...topSells.map(([, count]) => count), 1)
  
  return { topBuys, topSells, maxBuys, maxSells }
}

function calculateBiggestTrades() {
  const bigTrades: Array<{
    ticker: string;
    name: string;
    action: 'Gekauft' | 'Verkauft' | 'Erhöht' | 'Reduziert';
    change: string;
    investor: string;
    investorSlug: string;
    color: string;
    value: number;
  }> = []

  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length < 2) return
    
    const current = snaps[snaps.length - 1]?.data
    const previous = snaps[snaps.length - 2]?.data
    
    if (!current?.positions || !previous?.positions) return

    const investorName = investors.find(inv => inv.slug === slug)?.name?.split('–')[0]?.trim() || 
                       slug.charAt(0).toUpperCase() + slug.slice(1)

    const currentMap = new Map<string, number>()
    const currentValueMap = new Map<string, number>()
    const nameMap = new Map<string, string>()
    
    current.positions.forEach(p => {
      const ticker = getTicker(p)
      if (!ticker) return
      
      currentMap.set(ticker, (currentMap.get(ticker) || 0) + p.shares)
      currentValueMap.set(ticker, (currentValueMap.get(ticker) || 0) + p.value)
      if (!nameMap.has(ticker)) {
        nameMap.set(ticker, getStockName(p))
      }
    })

    const previousMap = new Map<string, number>()
    previous.positions.forEach(p => {
      const ticker = getTicker(p)
      if (!ticker) return
      previousMap.set(ticker, (previousMap.get(ticker) || 0) + p.shares)
    })

    currentMap.forEach((currentShares, ticker) => {
      const previousShares = previousMap.get(ticker) || 0
      const delta = currentShares - previousShares
      const currentValue = currentValueMap.get(ticker) || 0
      
      if (Math.abs(delta) > 1000 && currentValue > 100_000_000) {
        let action: 'Gekauft' | 'Verkauft' | 'Erhöht' | 'Reduziert'
        let color: string
        
        if (previousShares === 0) {
          action = 'Gekauft'
          color = 'text-brand-light'
        } else if (delta > 0) {
          action = 'Erhöht'
          color = 'text-brand-light'
        } else {
          action = 'Reduziert'
          color = 'text-red-400'
        }

        const formattedValue = currentValue >= 1_000_000_000 
          ? `${(currentValue / 1_000_000_000).toFixed(1).replace('.', ',')} Mrd.` 
          : `${(currentValue / 1_000_000).toFixed(0)} Mio.`

        bigTrades.push({
          ticker,
          name: nameMap.get(ticker) || ticker,
          action,
          change: formattedValue,
          investor: investorName,
          investorSlug: slug,
          color,
          value: currentValue
        })
      }
    })

    previousMap.forEach((previousShares, ticker) => {
      if (!currentMap.has(ticker) && previousShares > 1000) {
        const estimatedValue = previousShares * 100
        
        if (estimatedValue > 100_000_000) {
          const formattedValue = estimatedValue >= 1_000_000_000 
            ? `${(estimatedValue / 1_000_000_000).toFixed(1).replace('.', ',')} Mrd.` 
            : `${(estimatedValue / 1_000_000).toFixed(0)} Mio.`

          bigTrades.push({
            ticker,
            name: ticker,
            action: 'Verkauft',
            change: formattedValue,
            investor: investorName,
            investorSlug: slug,
            color: 'text-red-400',
            value: estimatedValue
          })
        }
      }
    })
  })

  return bigTrades.sort((a, b) => b.value - a.value).slice(0, 6)
}

const FEATURED_SLUGS = ['buffett', 'ackman', 'smith', 'marks', 'tepper', 'klarman']

let cached: { data: OverviewData; at: number } | null = null
const CACHE_MS = 60 * 60 * 1000

export function buildOverviewData(): OverviewData {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data

  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    portfolioValue[slug] = latest.positions.reduce((sum, p) => sum + p.value, 0)
  })

  // Nur die Felder, die die Seite braucht – investors[] enthält sonst auch
  // komplette Holdings-Listen, die unnötig ins HTML wandern würden.
  const featuredInvestors = FEATURED_SLUGS
    .map(slug => investors.find(i => i.slug === slug))
    .filter((inv): inv is (typeof investors)[number] => !!inv)
    .map(inv => ({
      slug: inv.slug,
      name: inv.name,
      imageUrl: inv.imageUrl ?? '',
      peek: peekPositions(inv.slug),
      portfolioValue: portfolioValue[inv.slug] || 0,
    }))

  const data: OverviewData = {
    portfolioValue,
    featuredInvestors,
    pulseData: calculateInvestmentPulse(),
    trendingStocks: calculateTrendingStocks(),
    biggestTrades: calculateBiggestTrades(),
    totalInvestors: investors.length,
    lastUpdated: new Date().toISOString(),
  }
  cached = { data, at: Date.now() }
  return data
}
