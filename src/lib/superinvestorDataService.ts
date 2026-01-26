// src/lib/superinvestorDataService.ts - FIXED mit korrekten Typen
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

// KORRIGIERTE Typen basierend auf deiner tatsächlichen Datenstruktur
interface Position {
  name: string
  cusip: string
  shares: number
  value: number
  ticker?: string
  pctOfPortfolio?: number
}

interface QuarterData {
  form: string
  date: string
  period: string
  accession: string
  quarterKey: string
  positions: Position[]
  totalValue: number
  positionsCount: number
}

// Holdings History Structure (wie sie tatsächlich ist)
interface HoldingsSnapshot {
  data: QuarterData
}

interface HoldingsHistory {
  [investorSlug: string]: HoldingsSnapshot[]
}

interface EnhancedPortfolioData {
  investor: string
  latestQuarter: QuarterData
  previousQuarter: QuarterData | null  // BACK TO NULL for compatibility
  totalValue: number
  positionsCount: number
  topHoldings: Array<{
    name: string
    ticker?: string
    cusip: string
    value: number
    shares: number
    portfolioPercentage: number
    quarterlyChange?: {
      type: 'new' | 'increased' | 'decreased' | 'unchanged'
      sharesDelta: number
      percentChange: number
    }
  }>
  portfolioChanges: {
    newPositions: Position[]
    increasedPositions: Array<Position & { sharesDelta: number; percentChange: number }>
    decreasedPositions: Array<Position & { sharesDelta: number; percentChange: number }>
    closedPositions: Array<Position & { previousValue: number }>
  }
  sectorAllocation: Record<string, number>
  performanceMetrics: {
    quarterlyReturn?: number
    avgPositionSize: number
    concentration: number
    turnover?: number
  }
}

// Type guard für holdingsHistory
function isValidHoldingsHistory(data: any): data is HoldingsHistory {
  return data && typeof data === 'object'
}

// Hilfsfunktion: Ticker aus CUSIP/Name ermitteln
function findTicker(position: Position): string | undefined {
  // 1. Direkt aus Position
  if (position.ticker) return position.ticker

  // 2. Aus stocks Datenbank via CUSIP
  const stockByCusip = stocks.find(s => s.cusip === position.cusip)
  if (stockByCusip?.ticker) return stockByCusip.ticker

  // 3. Aus stocks Datenbank via Name-Match
  const stockByName = stocks.find(s =>
    s.name.toLowerCase().includes(position.name.toLowerCase()) ||
    position.name.toLowerCase().includes(s.name.toLowerCase())
  )
  if (stockByName?.ticker) return stockByName.ticker

  // 4. Fallback: CUSIP ohne trailing zeros
  return position.cusip.replace(/0+$/, '')
}

// Vereinfachtes Sektor-Mapping
const sectorMapping: Record<string, string> = {
  // Technology
  'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
  'AMZN': 'Technology', 'META': 'Technology', 'NVDA': 'Technology', 'ORCL': 'Technology',
  'CRM': 'Technology', 'ADBE': 'Technology', 'NFLX': 'Technology', 'TSM': 'Technology',

  // Financial Services
  'AXP': 'Financial Services', 'BAC': 'Financial Services', 'WFC': 'Financial Services',
  'JPM': 'Financial Services', 'BRK.B': 'Financial Services', 'V': 'Financial Services',
  'MA': 'Financial Services', 'GS': 'Financial Services', 'MS': 'Financial Services',

  // Consumer Goods
  'KO': 'Consumer Goods', 'PG': 'Consumer Goods', 'WMT': 'Consumer Goods',
  'HD': 'Consumer Goods', 'MCD': 'Consumer Goods', 'COST': 'Consumer Goods',

  // Healthcare
  'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare', 'ABBV': 'Healthcare',
  'LLY': 'Healthcare', 'TMO': 'Healthcare', 'ABT': 'Healthcare',

  // Energy
  'CVX': 'Energy', 'XOM': 'Energy', 'COP': 'Energy',

  // Industrials
  'BA': 'Industrials', 'CAT': 'Industrials', 'GE': 'Industrials',

  // Real Estate
  'AMT': 'Real Estate', 'PLD': 'Real Estate',

  // Utilities
  'NEE': 'Utilities', 'DUK': 'Utilities',

  // Materials
  'LIN': 'Materials', 'APD': 'Materials'
}

function getSectorForTicker(ticker?: string): string {
  if (!ticker) return 'Other'
  return sectorMapping[ticker.toUpperCase()] || 'Other'
}

// HAUPTFUNKTION: Portfolio-Daten für AI aufbereiten
export function getEnhancedPortfolioData(
  investorSlug: string,
  quarterLimit: number = 2
): EnhancedPortfolioData | null {
  // Type-safe Zugriff auf holdingsHistory
  if (!isValidHoldingsHistory(holdingsHistory)) {
    console.error('Invalid holdingsHistory structure')
    return null
  }

  const snapshots = holdingsHistory[investorSlug] as HoldingsSnapshot[]

  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    console.warn(`No snapshots found for investor: ${investorSlug}`)
    return null
  }

  // Neueste und vorherige Quartale
  const latest = snapshots[snapshots.length - 1].data
  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2].data : null

  if (!latest || !latest.positions) {
    console.error(`Invalid latest quarter data for ${investorSlug}`)
    return null
  }

  // Portfolio-Änderungen berechnen
  const prevMap = new Map<string, number>()
  if (previous && previous.positions) {
    previous.positions.forEach(p => {
      prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares)
    })
  }

  // Merge duplicate CUSIPs (falls vorhanden)
  const mergedPositions = new Map<string, Position>()
  latest.positions.forEach(pos => {
    const existing = mergedPositions.get(pos.cusip)
    if (existing) {
      existing.shares += pos.shares
      existing.value += pos.value
    } else {
      mergedPositions.set(pos.cusip, { ...pos })
    }
  })

  const currentPositions = Array.from(mergedPositions.values())
  const totalValue = latest.totalValue || currentPositions.reduce((sum, p) => sum + p.value, 0)

  // Top Holdings mit Änderungen
  const topHoldings = currentPositions
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
    .map(pos => {
      const ticker = findTicker(pos)
      const portfolioPercentage = (pos.value / totalValue) * 100
      const prevShares = prevMap.get(pos.cusip) || 0
      const sharesDelta = pos.shares - prevShares

      let quarterlyChange: any = undefined
      if (previous) {
        if (prevShares === 0) {
          quarterlyChange = { type: 'new', sharesDelta, percentChange: 100 }
        } else if (sharesDelta > 0) {
          quarterlyChange = {
            type: 'increased',
            sharesDelta,
            percentChange: (sharesDelta / prevShares) * 100
          }
        } else if (sharesDelta < 0) {
          quarterlyChange = {
            type: 'decreased',
            sharesDelta,
            percentChange: (sharesDelta / prevShares) * 100
          }
        } else {
          quarterlyChange = { type: 'unchanged', sharesDelta: 0, percentChange: 0 }
        }
      }

      return {
        name: pos.name,
        ticker,
        cusip: pos.cusip,
        value: pos.value,
        shares: pos.shares,
        portfolioPercentage,
        quarterlyChange
      }
    })

  // Portfolio-Änderungen kategorisieren
  const newPositions: Position[] = []
  const increasedPositions: Array<Position & { sharesDelta: number; percentChange: number }> = []
  const decreasedPositions: Array<Position & { sharesDelta: number; percentChange: number }> = []

  currentPositions.forEach(pos => {
    const prevShares = prevMap.get(pos.cusip) || 0
    const sharesDelta = pos.shares - prevShares

    if (prevShares === 0 && pos.shares > 0) {
      newPositions.push(pos)
    } else if (sharesDelta > 0) {
      increasedPositions.push({
        ...pos,
        sharesDelta,
        percentChange: (sharesDelta / prevShares) * 100
      })
    } else if (sharesDelta < 0) {
      decreasedPositions.push({
        ...pos,
        sharesDelta,
        percentChange: (sharesDelta / prevShares) * 100
      })
    }
  })

  // Geschlossene Positionen
  const closedPositions: Array<Position & { previousValue: number }> = []
  if (previous && previous.positions) {
    previous.positions.forEach(prevPos => {
      const currentPos = currentPositions.find(p => p.cusip === prevPos.cusip)
      if (!currentPos) {
        closedPositions.push({
          ...prevPos,
          previousValue: prevPos.value
        })
      }
    })
  }

  // Sektor-Allokation
  const sectorAllocation: Record<string, number> = {}
  topHoldings.forEach(holding => {
    const sector = getSectorForTicker(holding.ticker)
    sectorAllocation[sector] = (sectorAllocation[sector] || 0) + holding.portfolioPercentage
  })

  // Performance Metriken
  const avgPositionSize = totalValue / Math.max(currentPositions.length, 1)  // FIXED: Vermeidung Division durch 0
  const top10Weight = topHoldings.slice(0, 10).reduce((sum, h) => sum + h.portfolioPercentage, 0)

  let quarterlyReturn: number | undefined  // No explicit assignment
  if (previous && previous.totalValue && previous.totalValue > 0) {
    quarterlyReturn = ((totalValue - previous.totalValue) / previous.totalValue) * 100
  }

  return {
    investor: investorSlug,
    latestQuarter: latest,
    previousQuarter: previous,  // Now consistently undefined
    totalValue,
    positionsCount: currentPositions.length,
    topHoldings,
    portfolioChanges: {
      newPositions,
      increasedPositions,
      decreasedPositions,
      closedPositions
    },
    sectorAllocation,
    performanceMetrics: {
      quarterlyReturn,
      avgPositionSize,
      concentration: top10Weight
    }
  }
}

// Historical Performance Function
export function getHistoricalPerformance(
  investorSlug: string,
  periods: number = 8
): Array<{ quarter: string; value: number; return?: number }> {
  if (!isValidHoldingsHistory(holdingsHistory)) {
    return []
  }

  const snapshots = holdingsHistory[investorSlug] as HoldingsSnapshot[]

  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return []
  }

  const recentSnapshots = snapshots.slice(-periods)

  return recentSnapshots.map((snap, index) => {
    const data = snap.data
    const value = data.totalValue || data.positions.reduce((sum, p) => sum + p.value, 0)
    let quarterlyReturn: number | undefined

    if (index > 0) {
      const prevData = recentSnapshots[index - 1].data
      const prevValue = prevData.totalValue || prevData.positions.reduce((sum, p) => sum + p.value, 0)
      if (prevValue > 0) {
        quarterlyReturn = ((value - prevValue) / prevValue) * 100
      }
    }

    return {
      quarter: data.quarterKey || data.period,
      value,
      return: quarterlyReturn
    }
  })
}

// NEW: Summary of changes over the last X quarters
export function getRecentTransactionsSummary(investorSlug: string, count: number = 8): string {
  if (!isValidHoldingsHistory(holdingsHistory)) return ""
  const snapshots = (holdingsHistory[investorSlug] as HoldingsSnapshot[]) || []
  if (snapshots.length < 2) return ""

  let summary = ""
  const recent = snapshots.slice(-count)

  for (let i = recent.length - 1; i > 0; i--) {
    const current = recent[i].data
    const prev = recent[i - 1].data

    // Map filing names to actual fiscal periods for AI clarity
    // Filing in Feb (Q1) -> Data for Q4 Previous Year
    // Filing in May (Q2) -> Data for Q1
    // Filing in Aug (Q3) -> Data for Q2
    // Filing in Nov (Q4) -> Data for Q3
    let actualPeriod = current.quarterKey
    if (current.quarterKey?.includes('Q1')) actualPeriod = `Q4 ${parseInt(current.quarterKey) - 1} (Filing Feb)`
    if (current.quarterKey?.includes('Q2')) actualPeriod = `Q1 ${current.quarterKey.split('-')[0]} (Filing May)`
    if (current.quarterKey?.includes('Q3')) actualPeriod = `Q2 ${current.quarterKey.split('-')[0]} (Filing Aug)`
    if (current.quarterKey?.includes('Q4')) actualPeriod = `Q3 ${current.quarterKey.split('-')[0]} (Filing Nov)`

    summary += `--- ZEITRAUM: ${actualPeriod} ---\n`

    const prevMap = new Map()
    prev.positions.forEach(p => prevMap.set(p.cusip, p.shares))

    const currentMap = new Map()
    current.positions.forEach(p => currentMap.set(p.cusip, p.shares))

    // New Positions
    const newPos = current.positions.filter(p => !prevMap.has(p.cusip))
    if (newPos.length > 0) {
      summary += `NEU: ${newPos.map(p => p.name).join(', ')}\n`
    }

    // Closed Positions
    const closedPos = prev.positions.filter(p => !currentMap.has(p.cusip))
    if (closedPos.length > 0) {
      summary += `VERKAUFT (EXIT): ${closedPos.map(p => p.name).join(', ')}\n`
    }

    // Large Reductions/Increases (Significant ones)
    current.positions.forEach(p => {
      const pShares = prevMap.get(p.cusip)
      if (pShares) {
        const diff = (p.shares - pShares) / pShares
        if (diff > 0.05) summary += `ERHÖHT: ${p.name} (+${(diff * 100).toFixed(0)}%)\n`
        if (diff < -0.05) summary += `REDUZIERT: ${p.name} (${(diff * 100).toFixed(0)}%)\n`
      }
    })
    summary += "\n"
  }

  return summary
}

// Export für API Nutzung
export function preparePortfolioDataForAI(investorSlug: string): any {
  try {
    const portfolioData = getEnhancedPortfolioData(investorSlug)

    if (!portfolioData) {
      console.warn(`No portfolio data available for ${investorSlug}`)
      return null
    }

    const performanceHistory = getHistoricalPerformance(investorSlug)
    const transactionsHistory = getRecentTransactionsSummary(investorSlug)

    return {
      ...portfolioData,
      performanceHistory,
      transactionsHistory,
      // Zusätzliche Metadaten für AI
      lastUpdated: portfolioData.latestQuarter.date,
      dataSource: portfolioData.latestQuarter.form,
      filingAccession: portfolioData.latestQuarter.accession
    }
  } catch (error) {
    console.error(`Error preparing portfolio data for ${investorSlug}:`, error)
    return null
  }
}