// src/lib/portfolioData.ts
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

// Hole Firmenprofil-Daten von FMP API
export async function getStockProfiles(symbols: string[]): Promise<Map<string, StockProfile>> {
  const profiles = new Map<string, StockProfile>()
  
  try {
    // Batch request für alle Symbole
    const promises = symbols.map(async (symbol) => {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data && data[0]) {
          profiles.set(symbol, {
            symbol: data[0].symbol,
            companyName: data[0].companyName,
            sector: data[0].sector || 'Other',
            industry: data[0].industry || 'Other',
            country: data[0].country || 'United States',
            currency: data[0].currency || 'USD',
            marketCap: data[0].mktCap || 0,
            exchange: data[0].exchangeShortName || 'NASDAQ'
          })
        }
      }
    })
    
    await Promise.all(promises)
  } catch (error) {
    console.error('Error fetching stock profiles:', error)
  }
  
  return profiles
}

// Hole historische Dividenden-Daten
export async function getDividendHistory(symbol: string): Promise<DividendData[]> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    )
    
    if (response.ok) {
      const data: DividendHistoryResponse = await response.json()
      if (data.historical) {
        return data.historical.map(d => ({
          symbol: data.symbol,
          date: d.date,
          dividend: d.dividend,
          adjDividend: d.adjDividend,
          paymentDate: d.paymentDate,
          recordDate: d.recordDate,
          declarationDate: d.declarationDate
        }))
      }
    }
  } catch (error) {
    console.error(`Error fetching dividends for ${symbol}:`, error)
  }
  
  return []
}

// Hole Dividenden-Kalender (upcoming dividends)
export async function getDividendCalendar(): Promise<any[]> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_dividend_calendar?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    )
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Error fetching dividend calendar:', error)
  }
  
  return []
}

// Hole Key Metrics für Dividenden-Analyse
export async function getKeyMetrics(symbol: string): Promise<any> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    )
    
    if (response.ok) {
      const data = await response.json()
      return data[0] || {}
    }
  } catch (error) {
    console.error(`Error fetching key metrics for ${symbol}:`, error)
  }
  
  return {}
}

// Hole Financial Ratios für Payout Ratio etc.
export async function getFinancialRatios(symbol: string): Promise<any> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/ratios-ttm/${symbol}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    )
    
    if (response.ok) {
      const data = await response.json()
      return data[0] || {}
    }
  } catch (error) {
    console.error(`Error fetching ratios for ${symbol}:`, error)
  }
  
  return {}
}

// Berechne Sektor-Breakdown basierend auf echten Daten
export function calculateSectorBreakdown(
  holdings: Array<{ symbol: string; value: number }>,
  profiles: Map<string, StockProfile>
) {
  const sectorTotals = new Map<string, { value: number; holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const sector = profile?.sector || 'Other'
    
    const current = sectorTotals.get(sector) || { value: 0, holdings: [] }
    current.value += holding.value
    current.holdings.push(holding.symbol)
    sectorTotals.set(sector, current)
  })
  
  return Array.from(sectorTotals.entries()).map(([sector, data]) => ({
    sector,
    value: data.value,
    holdings: data.holdings,
    percentage: 0 // Will be calculated based on total
  }))
}

// Berechne Länder-Breakdown
export function calculateCountryBreakdown(
  holdings: Array<{ symbol: string; value: number }>,
  profiles: Map<string, StockProfile>
) {
  const countryTotals = new Map<string, { value: number; holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const country = profile?.country || 'Unknown'
    
    const current = countryTotals.get(country) || { value: 0, holdings: [] }
    current.value += holding.value
    current.holdings.push(holding.symbol)
    countryTotals.set(country, current)
  })
  
  return Array.from(countryTotals.entries()).map(([country, data]) => ({
    country,
    value: data.value,
    holdings: data.holdings,
    percentage: 0
  }))
}

// Berechne Market Cap Breakdown
export function calculateMarketCapBreakdown(
  holdings: Array<{ symbol: string; value: number }>,
  profiles: Map<string, StockProfile>
) {
  const capTotals = new Map<string, { value: number; holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const marketCap = profile?.marketCap || 0
    
    let category = 'Unknown'
    if (marketCap > 200_000_000_000) category = 'Mega Cap (>$200B)'
    else if (marketCap > 10_000_000_000) category = 'Large Cap ($10B-$200B)'
    else if (marketCap > 2_000_000_000) category = 'Mid Cap ($2B-$10B)'
    else if (marketCap > 300_000_000) category = 'Small Cap ($300M-$2B)'
    else if (marketCap > 0) category = 'Micro Cap (<$300M)'
    
    const current = capTotals.get(category) || { value: 0, holdings: [] }
    current.value += holding.value
    current.holdings.push(holding.symbol)
    capTotals.set(category, current)
  })
  
  return Array.from(capTotals.entries()).map(([category, data]) => ({
    category,
    value: data.value,
    holdings: data.holdings,
    percentage: 0
  }))
}

// Währungs-Breakdown
export function calculateCurrencyBreakdown(
  holdings: Array<{ symbol: string; value: number }>,
  profiles: Map<string, StockProfile>,
  cashPosition: number
) {
  const currencyTotals = new Map<string, { value: number; holdings: string[] }>()
  
  holdings.forEach(holding => {
    const profile = profiles.get(holding.symbol)
    const currency = profile?.currency || 'USD'
    
    const current = currencyTotals.get(currency) || { value: 0, holdings: [] }
    current.value += holding.value
    current.holdings.push(holding.symbol)
    currencyTotals.set(currency, current)
  })
  
  // Add cash position (assume USD)
  if (cashPosition > 0) {
    const current = currencyTotals.get('USD') || { value: 0, holdings: [] }
    current.value += cashPosition
    current.holdings.push('Cash')
    currencyTotals.set('USD', current)
  }
  
  return Array.from(currencyTotals.entries()).map(([currency, data]) => ({
    currency,
    value: data.value,
    holdings: data.holdings,
    percentage: 0
  }))
}

// Dividend Forecast basierend auf historischen Daten
export async function calculateDividendForecast(
  holdings: Array<{ symbol: string; quantity: number }>,
  months: number = 12
): Promise<Array<{ month: string; year: number; estimated: number; confirmed: number }>> {
  const forecast: Array<{ month: string; year: number; estimated: number; confirmed: number }> = []
  const currentDate = new Date()
  
  // Hole historische Dividenden für alle Holdings
  const dividendHistories = new Map<string, DividendData[]>()
  
  for (const holding of holdings) {
    const history = await getDividendHistory(holding.symbol)
    if (history.length > 0) {
      dividendHistories.set(holding.symbol, history)
    }
  }
  
  // Berechne forecast für jeden Monat
  for (let i = 0; i < months; i++) {
    const forecastDate = new Date(currentDate)
    forecastDate.setMonth(forecastDate.getMonth() + i)
    
    let monthlyEstimate = 0
    let monthlyConfirmed = 0
    
    // Für jede Aktie, schätze Dividende basierend auf historischem Muster
    dividendHistories.forEach((history, symbol) => {
      const holding = holdings.find(h => h.symbol === symbol)
      if (!holding) return
      
      // Finde Dividenden aus dem gleichen Monat in vorherigen Jahren
      const sameMonthDividends = history.filter(d => {
        const divDate = new Date(d.paymentDate)
        return divDate.getMonth() === forecastDate.getMonth()
      })
      
      if (sameMonthDividends.length > 0) {
        // Nutze Durchschnitt der letzten Jahre
        const avgDividend = sameMonthDividends.slice(0, 3).reduce((sum, d) => sum + d.adjDividend, 0) / Math.min(sameMonthDividends.length, 3)
        const estimatedAmount = avgDividend * holding.quantity
        
        // Wenn innerhalb der nächsten 3 Monate und bereits angekündigt
        if (i < 3 && sameMonthDividends[0] && new Date(sameMonthDividends[0].declarationDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
          monthlyConfirmed += estimatedAmount
        } else {
          monthlyEstimate += estimatedAmount
        }
      }
    })
    
    forecast.push({
      month: forecastDate.toLocaleDateString('en-US', { month: 'short' }),
      year: forecastDate.getFullYear(),
      estimated: monthlyEstimate,
      confirmed: monthlyConfirmed
    })
  }
  
  return forecast
}

// Dividend Safety Score Berechnung
export async function calculateDividendSafetyScore(symbol: string): Promise<{
  score: number
  factors: {
    payoutRatio: number
    earningsStability: number
    freeCashFlow: number
    debtLevel: number
    dividendHistory: number
  }
}> {
  const metrics = await getKeyMetrics(symbol)
  const ratios = await getFinancialRatios(symbol)
  const dividendHistory = await getDividendHistory(symbol)
  
  // Berechne einzelne Faktoren (0-100)
  const payoutRatio = ratios.payoutRatioTTM 
    ? Math.max(0, Math.min(100, 100 - Math.abs(ratios.payoutRatioTTM - 0.5) * 200))
    : 50
    
  const earningsStability = metrics.peRatioTTM && metrics.peRatioTTM > 0 && metrics.peRatioTTM < 50
    ? 80
    : 40
    
  const freeCashFlow = metrics.freeCashFlowPerShareTTM > 0 ? 90 : 30
  
  const debtLevel = ratios.debtEquityRatioTTM 
    ? Math.max(0, Math.min(100, 100 - ratios.debtEquityRatioTTM * 20))
    : 50
    
  const dividendHistoryScore = dividendHistory.length > 20 ? 95 : dividendHistory.length * 4
  
  // Gesamtscore
  const score = (payoutRatio + earningsStability + freeCashFlow + debtLevel + dividendHistoryScore) / 5
  
  return {
    score,
    factors: {
      payoutRatio,
      earningsStability,
      freeCashFlow,
      debtLevel,
      dividendHistory: dividendHistoryScore
    }
  }
}