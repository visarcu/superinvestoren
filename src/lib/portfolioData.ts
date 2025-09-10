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

// All other functions that used NEXT_PUBLIC_FMP_API_KEY have been removed for security
// They should be replaced with secure API routes when needed