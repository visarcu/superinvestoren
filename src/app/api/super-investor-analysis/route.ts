// API route for super investor analysis - replaces 38MB client-side holdings import
import { NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

// Helper functions moved from client
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

export async function GET() {
  try {
    console.log('📊 Calculating super investor analysis server-side...')
    
    const MAINSTREAM_STOCKS = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
      'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
    ])

    // Calculate Hidden Gems
    const ownershipCount = new Map<string, { count: number; totalValue: number; name: string }>()

    Object.values(holdingsHistory).forEach((snaps: any) => {
      if (!snaps || snaps.length === 0) return
      
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return
      
      const seen = new Set<string>()
      latest.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        
        if (ticker && !seen.has(ticker) && !MAINSTREAM_STOCKS.has(ticker)) {
          seen.add(ticker)
          const current = ownershipCount.get(ticker)
          
          if (current) {
            current.count += 1
            current.totalValue += p.value
          } else {
            ownershipCount.set(ticker, {
              count: 1,
              totalValue: p.value,
              name: getStockName(p)
            })
          }
        }
      })
    })

    const hiddenGems = Array.from(ownershipCount.entries())
      .filter(([, data]) => data.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8)
      .map(([ticker, data]) => ({
        ticker,
        count: data.count,
        totalValue: data.totalValue,
        name: data.name
      }))

    // Calculate Recent Buys
    const buyCounts = new Map<string, { count: number; totalValue: number; name: string }>()
    
    Object.values(holdingsHistory).forEach((snaps: any) => {
      if (!snaps || snaps.length < 2) return
      
      const latest = snaps[snaps.length - 1]?.data
      const previous = snaps[snaps.length - 2]?.data
      
      if (!latest?.positions || !previous?.positions) return

      const prevTickers = new Set(
        previous.positions.map((p: any) => getTicker(p)).filter(Boolean)
      )

      const seen = new Set<string>()
      latest.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        if (!ticker || seen.has(ticker)) return
        
        const wasNewOrIncreased = !prevTickers.has(ticker) || 
          (previous.positions.find((prev: any) => getTicker(prev) === ticker)?.shares || 0) < p.shares
        
        if (wasNewOrIncreased) {
          seen.add(ticker)
          const current = buyCounts.get(ticker)
          
          if (current) {
            current.count += 1
            current.totalValue += p.value
          } else {
            buyCounts.set(ticker, {
              count: 1,
              totalValue: p.value,
              name: getStockName(p)
            })
          }
        }
      })
    })

    const recentBuys = Array.from(buyCounts.entries())
      .filter(([, data]) => data.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8)
      .map(([ticker, data]) => ({
        ticker,
        count: data.count,
        totalValue: data.totalValue,
        name: data.name
      }))

    console.log(`✅ Super investor analysis calculated: ${hiddenGems.length} hidden gems, ${recentBuys.length} recent buys`)

    return NextResponse.json({ 
      hiddenGems,
      recentBuys 
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // 30 min cache
      }
    })
    
  } catch (error) {
    console.error('❌ Error calculating super investor analysis:', error)
    return NextResponse.json(
      { error: 'Failed to load super investor analysis' },
      { status: 500 }
    )
  }
}