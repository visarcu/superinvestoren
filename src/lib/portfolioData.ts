// src/lib/portfolioData.ts - SECURE VERSION using API routes only
import { supabase } from './supabaseClient'

interface StockProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  country: string
  currency: string
  marketCap: number
  exchange: string
}

interface DividendData {
  symbol: string
  date: string
  dividend: number
  adjDividend: number
  paymentDate: string
  recordDate: string
  declarationDate: string
  frequency?: string
}

interface DividendHistoryResponse {
  symbol: string
  historical: Array<{
    date: string
    label: string
    adjDividend: number
    dividend: number
    recordDate: string
    paymentDate: string
    declarationDate: string
  }>
}

// SECURE VERSION: Use API route instead of direct FMP calls
export async function getStockProfiles(symbols: string[]): Promise<Map<string, StockProfile>> {
  const profiles = new Map<string, StockProfile>()
  
  try {
    // Use secure batch API route
    const response = await fetch('/api/portfolio/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols }),
    })
    
    if (response.ok) {
      const data = await response.json()
      data.forEach((profile: StockProfile) => {
        profiles.set(profile.symbol, profile)
      })
    }
  } catch (error) {
    console.error('Error fetching stock profiles:', error)
  }
  
  return profiles
}

// SECURE VERSION: Use API route instead of direct FMP calls  
export async function getDividendHistory(symbol: string, startDate?: string): Promise<DividendHistoryResponse> {
  try {
    const url = `/api/dividends/${symbol}${startDate ? `?start=${startDate}` : ''}`
    const response = await fetch(url)
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Error fetching dividend history:', error)
  }
  
  return { symbol, historical: [] }
}

// Portfolio Breakdown Calculation Functions
interface Holding {
  symbol: string
  name: string
  value: number
  quantity: number
  purchase_price: number
}

interface BreakdownItem {
  name: string
  value: number
  percentage: number
  holdings: string[]
}

export async function calculateSectorBreakdown(
  holdings: Holding[],
  totalValue: number
): Promise<BreakdownItem[]> {
  if (!holdings || holdings.length === 0) return []
  
  const symbols = holdings.map(h => h.symbol)
  const profiles = await getStockProfiles(symbols)
  const sectorMap = new Map<string, { value: number, holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const sector = profile?.sector || 'Unknown'
    const existing = sectorMap.get(sector) || { value: 0, holdings: [] }
    
    sectorMap.set(sector, {
      value: existing.value + holding.value,
      holdings: [...existing.holdings, holding.symbol]
    })
  })
  
  return Array.from(sectorMap.entries()).map(([name, data]) => ({
    name,
    value: data.value,
    percentage: (data.value / totalValue) * 100,
    holdings: data.holdings
  })).sort((a, b) => b.value - a.value)
}

export async function calculateCountryBreakdown(
  holdings: Holding[],
  totalValue: number
): Promise<BreakdownItem[]> {
  if (!holdings || holdings.length === 0) return []
  
  const symbols = holdings.map(h => h.symbol)
  const profiles = await getStockProfiles(symbols)
  const countryMap = new Map<string, { value: number, holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const country = profile?.country || 'Unknown'
    const existing = countryMap.get(country) || { value: 0, holdings: [] }
    
    countryMap.set(country, {
      value: existing.value + holding.value,
      holdings: [...existing.holdings, holding.symbol]
    })
  })
  
  return Array.from(countryMap.entries()).map(([name, data]) => ({
    name,
    value: data.value,
    percentage: (data.value / totalValue) * 100,
    holdings: data.holdings
  })).sort((a, b) => b.value - a.value)
}

export async function calculateMarketCapBreakdown(
  holdings: Holding[],
  totalValue: number
): Promise<BreakdownItem[]> {
  if (!holdings || holdings.length === 0) return []
  
  const symbols = holdings.map(h => h.symbol)
  const profiles = await getStockProfiles(symbols)
  const capMap = new Map<string, { value: number, holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const marketCap = profile?.marketCap || 0
    
    let capCategory = 'Unknown'
    if (marketCap >= 200e9) capCategory = 'Large Cap (>$200B)'
    else if (marketCap >= 10e9) capCategory = 'Mid Cap ($10B-$200B)'  
    else if (marketCap >= 2e9) capCategory = 'Small Cap ($2B-$10B)'
    else if (marketCap > 0) capCategory = 'Micro Cap (<$2B)'
    
    const existing = capMap.get(capCategory) || { value: 0, holdings: [] }
    capMap.set(capCategory, {
      value: existing.value + holding.value,
      holdings: [...existing.holdings, holding.symbol]
    })
  })
  
  return Array.from(capMap.entries()).map(([name, data]) => ({
    name,
    value: data.value,
    percentage: (data.value / totalValue) * 100,
    holdings: data.holdings
  })).sort((a, b) => b.value - a.value)
}

export async function calculateCurrencyBreakdown(
  holdings: Holding[],
  totalValue: number
): Promise<BreakdownItem[]> {
  if (!holdings || holdings.length === 0) return []
  
  const symbols = holdings.map(h => h.symbol)
  const profiles = await getStockProfiles(symbols)
  const currencyMap = new Map<string, { value: number, holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const currency = profile?.currency || 'USD'
    const existing = currencyMap.get(currency) || { value: 0, holdings: [] }
    
    currencyMap.set(currency, {
      value: existing.value + holding.value,
      holdings: [...existing.holdings, holding.symbol]
    })
  })
  
  return Array.from(currencyMap.entries()).map(([name, data]) => ({
    name,
    value: data.value,
    percentage: (data.value / totalValue) * 100,
    holdings: data.holdings
  })).sort((a, b) => b.value - a.value)
}