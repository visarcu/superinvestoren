// src/utils/ownershipHistory.ts

import { stocks } from '@/data/stocks'

export interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  ticker?: string
}

export interface Snapshot {
  quarter: string
  data: {
    date: string
    positions: Position[]
  }
}

export interface CompanyInfo {
  cusip: string
  ticker: string
  name: string
  displayName: string
}

export interface OwnershipHistoryPoint {
  quarter: string
  shares: number
  value: number
  portfolioPercentage: number
  exists: boolean
}

/**
 * Get clean company name without ticker redundancy
 */
export const getCleanCompanyName = (position: Position): string => {
  let name = position.name
  const ticker = position.ticker
  
  if (ticker && name) {
    // Remove ticker at the beginning if present
    if (name.startsWith(`${ticker} - `)) {
      return name.substring(ticker.length + 3)
    }
    if (name.startsWith(`${ticker} – `)) {
      return name.substring(ticker.length + 3)
    }
    // If name is exactly the ticker, use ticker
    if (name === ticker) {
      return ticker
    }
  }
  
  return name
}

/**
 * Get ticker for a position, either from position data or stocks lookup
 */
export const getTicker = (position: Position): string => {
  if (position.ticker) return position.ticker
  
  // Lookup in stocks data
  const stock = stocks.find(s => s.cusip === position.cusip)
  if (stock?.ticker) return stock.ticker
  
  // Fallback: derive from CUSIP
  return position.cusip.replace(/0+$/, '')
}

/**
 * Get all unique companies across all snapshots
 */
export const getAllCompanies = (snapshots: Snapshot[]): CompanyInfo[] => {
  const companiesMap = new Map<string, { ticker: string; name: string }>()
  
  snapshots.forEach(snapshot => {
    snapshot.data.positions.forEach(position => {
      if (!companiesMap.has(position.cusip)) {
        const ticker = getTicker(position)
        const cleanName = getCleanCompanyName(position)
        
        companiesMap.set(position.cusip, {
          ticker,
          name: cleanName
        })
      }
    })
  })
  
  return Array.from(companiesMap.entries())
    .map(([cusip, { ticker, name }]) => ({
      cusip,
      ticker,
      name,
      displayName: ticker !== name ? `${ticker} - ${name}` : name
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
}

/**
 * Calculate portfolio percentage for a position
 */
export const calculatePortfolioPercentage = (position: Position, totalValue: number): number => {
  return totalValue > 0 ? (position.value / totalValue) * 100 : 0
}

/**
 * Generate ownership history for a specific company (CUSIP)
 */
export const generateOwnershipHistory = (
  snapshots: Snapshot[], 
  selectedCusip: string
): OwnershipHistoryPoint[] => {
  return snapshots
    .map(snapshot => {
      const position = snapshot.data.positions.find(p => p.cusip === selectedCusip)
      const totalValue = snapshot.data.positions.reduce((sum, p) => sum + p.value, 0)
      
      return {
        quarter: snapshot.quarter,
        shares: position?.shares || 0,
        value: position?.value || 0,
        portfolioPercentage: position ? calculatePortfolioPercentage(position, totalValue) : 0,
        exists: !!position
      }
    })
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
}

/**
 * Get changes between two ownership points
 */
export const calculateOwnershipChanges = (
  current: OwnershipHistoryPoint, 
  previous: OwnershipHistoryPoint | null
) => {
  if (!previous) {
    return {
      sharesChange: current.shares,
      percentageChange: current.portfolioPercentage,
      isNew: current.exists,
      isSold: false
    }
  }
  
  return {
    sharesChange: current.shares - previous.shares,
    percentageChange: current.portfolioPercentage - previous.portfolioPercentage,
    isNew: !previous.exists && current.exists,
    isSold: previous.exists && !current.exists
  }
}

/**
 * Format currency values
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Format share numbers
 */
export const formatShares = (value: number): string => {
  return new Intl.NumberFormat('de-DE').format(value)
}

/**
 * Get period label from quarter string (e.g., "2024-Q3" -> "Q3 2024")
 */
export const formatQuarterLabel = (quarter: string): string => {
  const [year, q] = quarter.split('-')
  return `${q} ${year}`
}