// Erstelle eine neue Datei: src/utils/fearGreedIndex.ts

import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

// ✅ EINZIGE, ZENTRALE Fear & Greed Berechnung
export function calculateFearGreedIndex() {
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

// Historische Fear & Greed Daten
export function calculateHistoricalFearGreed() {
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