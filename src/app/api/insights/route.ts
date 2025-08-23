// API route for insights page data
import { NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

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
}

interface TopBuyItem {
  ticker: string
  count: number
  name: string
}

interface TopOwnedItem {
  ticker: string
  count: number
  name: string
}

interface BiggestInvestmentItem {
  ticker: string
  name: string
  value: number
  investor: string
}

interface SectorAnalysis {
  sector: string
  value: number
  count: number
  percentage: number
}

interface GeographicExposure {
  usValue: number
  internationalValue: number
  usPercentage: number
  intlPercentage: number
}

interface DataSourceStats {
  totalInvestors: number
  investorsWithData: number
  totalFilings: number
  filingsInPeriod: number
  lastUpdated: string
  quarters: string[]
}

// Helper functions
function getTicker(position: Position, cusipToTicker: Map<string, string>): string | null {
  if (position.ticker) return position.ticker
  return cusipToTicker.get(position.cusip) || null
}

function getStockName(position: Position, cusipToTicker: Map<string, string>, nameMap: Map<string, string>): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  
  const ticker = getTicker(position, cusipToTicker)
  if (ticker && nameMap.has(ticker)) {
    return nameMap.get(ticker)!
  }
  
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
}

function getPeriodFromDate(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1
  let reportY = year
  
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  
  return `Q${reportQ} ${reportY}`
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const selectedQuarters = url.searchParams.get('quarters')?.split(',') || []
    
    console.log('🧮 Calculating insights data for quarters:', selectedQuarters)
    
    // Build preprocessed data
    const tickerMap = new Map<string, string>()
    const nameMap = new Map<string, string>()
    const cusipToTicker = new Map<string, string>()
    
    stocks.forEach(stock => {
      if (stock.ticker && stock.cusip) {
        tickerMap.set(stock.cusip, stock.ticker)
        cusipToTicker.set(stock.cusip, stock.ticker)
        if (stock.name) {
          nameMap.set(stock.ticker, stock.name)
        }
      }
    })
    
    const activeInvestors = new Set<string>()
    const allQuarters = new Set<string>()
    
    Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
      if (!snaps || snaps.length === 0) return
      
      const latest = snaps[snaps.length - 1]?.data
      if (latest?.positions?.length > 0) {
        activeInvestors.add(slug)
      }
      
      snaps.forEach(snap => {
        if (snap?.data?.date) {
          const quarter = getPeriodFromDate(snap.data.date)
          allQuarters.add(quarter)
          
          snap.data.positions?.forEach((position: Position) => {
            const ticker = getTicker(position, cusipToTicker)
            if (ticker && position.name && !nameMap.has(ticker)) {
              nameMap.set(ticker, getStockName(position, cusipToTicker, nameMap))
            }
          })
        }
      })
    })
    
    const sortedQuarters = Array.from(allQuarters).sort().reverse()
    const quartersToAnalyze = selectedQuarters.length > 0 ? selectedQuarters : sortedQuarters.slice(0, 4)
    
    // Calculate insights data
    const buyCount = new Map<string, { count: number; name: string }>()
    const ownedCount = new Map<string, { count: number; name: string }>()
    const biggestInvestments: BiggestInvestmentItem[] = []
    const sectorTotals = new Map<string, { value: number; count: number }>()
    
    let totalPortfolioValue = 0
    let usValue = 0
    let internationalValue = 0
    let totalFilings = 0
    let filingsInPeriod = 0
    
    Object.entries(holdingsHistory).forEach(([investorSlug, snaps]) => {
      if (!snaps || snaps.length === 0) return
      
      totalFilings += snaps.length
      
      // Find relevant snapshots for selected quarters
      const relevantSnaps = snaps.filter(snap => {
        const quarter = getPeriodFromDate(snap.data.date)
        return quartersToAnalyze.includes(quarter)
      })
      
      if (relevantSnaps.length === 0) return
      filingsInPeriod += relevantSnaps.length
      
      // Analyze buy activity (compare consecutive quarters)
      for (let i = 1; i < relevantSnaps.length; i++) {
        const current = relevantSnaps[i].data
        const previous = relevantSnaps[i - 1].data
        
        const prevMap = new Map<string, number>()
        previous.positions?.forEach((p: Position) => {
          const ticker = getTicker(p, cusipToTicker)
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
          }
        })
        
        current.positions?.forEach((p: Position) => {
          const ticker = getTicker(p, cusipToTicker)
          if (!ticker) return
          
          const prevShares = prevMap.get(ticker) || 0
          if (p.shares > prevShares) { // Increased position
            const current = buyCount.get(ticker)
            if (current) {
              current.count += 1
            } else {
              buyCount.set(ticker, {
                count: 1,
                name: getStockName(p, cusipToTicker, nameMap)
              })
            }
          }
        })
      }
      
      // Analyze latest holdings for owned stocks and biggest investments
      const latestSnap = relevantSnaps[relevantSnaps.length - 1]
      if (latestSnap?.data?.positions) {
        latestSnap.data.positions.forEach((p: Position) => {
          const ticker = getTicker(p, cusipToTicker)
          if (!ticker) return
          
          totalPortfolioValue += p.value
          
          // Count owned stocks
          const current = ownedCount.get(ticker)
          if (current) {
            current.count += 1
          } else {
            ownedCount.set(ticker, {
              count: 1,
              name: getStockName(p, cusipToTicker, nameMap)
            })
          }
          
          // Track biggest investments
          if (p.value > 100_000_000) { // >100M positions
            biggestInvestments.push({
              ticker,
              name: getStockName(p, cusipToTicker, nameMap),
              value: p.value,
              investor: investorSlug
            })
          }
          
          // Sector analysis
          const sector = getSectorFromPosition(p, cusipToTicker)
          const translatedSector = translateSector(sector)
          const current_sector = sectorTotals.get(translatedSector)
          if (current_sector) {
            current_sector.value += p.value
            current_sector.count += 1
          } else {
            sectorTotals.set(translatedSector, { value: p.value, count: 1 })
          }
          
          // Geographic exposure (simplified)
          if (ticker && ['GOOGL', 'AAPL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BAC'].includes(ticker)) {
            usValue += p.value
          } else {
            internationalValue += p.value
          }
        })
      }
    })
    
    // Process results
    const topBuys: TopBuyItem[] = Array.from(buyCount.entries())
      .map(([ticker, data]) => ({ ticker, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    const topOwned: TopOwnedItem[] = Array.from(ownedCount.entries())
      .map(([ticker, data]) => ({ ticker, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    const sortedBiggestInvestments = biggestInvestments
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    
    const sectorAnalysis: SectorAnalysis[] = Array.from(sectorTotals.entries())
      .map(([sector, data]) => ({
        sector,
        value: data.value,
        count: data.count,
        percentage: (data.value / totalPortfolioValue) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    
    const geographicExposure: GeographicExposure = {
      usValue,
      internationalValue,
      usPercentage: (usValue / (usValue + internationalValue)) * 100,
      intlPercentage: (internationalValue / (usValue + internationalValue)) * 100
    }
    
    const dataSourceStats: DataSourceStats = {
      totalInvestors: Object.keys(holdingsHistory).length,
      investorsWithData: activeInvestors.size,
      totalFilings,
      filingsInPeriod,
      lastUpdated: new Date().toISOString(),
      quarters: sortedQuarters
    }
    
    const response = {
      topBuys,
      topOwned,
      biggestInvestments: sortedBiggestInvestments,
      sectorAnalysis,
      geographicExposure,
      dataSourceStats,
      totalPortfolioValue,
      quartersAnalyzed: quartersToAnalyze,
      lastUpdated: new Date().toISOString()
    }
    
    console.log(`✅ Insights data calculated: ${topBuys.length} top buys, ${topOwned.length} top owned`)
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // 30 min cache
      }
    })
    
  } catch (error) {
    console.error('❌ Error calculating insights data:', error)
    return NextResponse.json(
      { error: 'Failed to load insights data' },
      { status: 500 }
    )
  }
}