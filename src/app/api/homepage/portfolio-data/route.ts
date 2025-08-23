// API route for homepage portfolio showcase data
import { NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

interface PortfolioShowcase {
  name: string
  investor: string
  date: string
  filingId: string
  totalValue: string
  tickers: string
  holdings: Array<{
    ticker: string
    value: string
    percentage: string
  }>
}

export async function GET() {
  try {
    console.log('📊 Calculating homepage portfolio data...')
    
    const investorSlugs = ['buffett', 'ackman', 'marks']
    const portfolios: PortfolioShowcase[] = []

    const investorInfo: Record<string, { name: string; investor: string; filingId: string }> = {
      buffett: {
        name: 'Berkshire Hathaway Inc',
        investor: 'Warren Buffett',
        filingId: '1067983'
      },
      ackman: {
        name: 'Pershing Square Capital',
        investor: 'Bill Ackman',
        filingId: '1336528'
      },
      marks: {
        name: 'Oaktree Capital Management',
        investor: 'Howard Marks',
        filingId: '1549683'
      }
    }

    investorSlugs.forEach(slug => {
      const snapshots = holdingsHistory[slug]
      if (!snapshots || snapshots.length === 0) return

      const latest = snapshots[snapshots.length - 1].data
      
      // Merge positions by CUSIP
      const mergePositions = (raw: Array<{ cusip: string; shares: number; value: number; ticker?: string; name?: string }>) => {
        const map = new Map<string, { shares: number; value: number; ticker?: string; name?: string }>()
        raw.forEach(p => {
          const prev = map.get(p.cusip)
          if (prev) {
            prev.shares += p.shares
            prev.value += p.value
          } else {
            map.set(p.cusip, { 
              shares: p.shares, 
              value: p.value,
              ticker: p.ticker,
              name: p.name
            })
          }
        })
        return map
      }

      const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
        .map(([cusip, { shares, value, ticker: positionTicker, name: positionName }]) => {
          const stockData = stocks.find(s => s.cusip === cusip)
          
          let ticker = positionTicker || stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = positionName || stockData?.name || cusip
          
          return {
            cusip, 
            ticker, 
            name: displayName,
            shares, 
            value
          }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      const totalValue = latest.positions.reduce((sum, p) => sum + p.value, 0)
      const info = investorInfo[slug]

      if (info && mergedHoldings.length > 0) {
        const formatValue = (value: number): string => {
          if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)}B`
          } else if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(0)}M`
          }
          return `${(value / 1_000).toFixed(0)}K`
        }

        portfolios.push({
          name: info.name,
          investor: info.investor,
          date: latest.date,
          filingId: info.filingId,
          totalValue: formatValue(totalValue),
          tickers: mergedHoldings.map(h => h.ticker).join(', '),
          holdings: mergedHoldings.map(h => ({
            ticker: h.ticker,
            value: formatValue(h.value),
            percentage: ((h.value / totalValue) * 100).toFixed(1)
          }))
        })
      }
    })

    console.log(`✅ Homepage portfolio data calculated: ${portfolios.length} portfolios`)

    return NextResponse.json({ portfolios }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', // 1 hour cache
      }
    })
    
  } catch (error) {
    console.error('❌ Error calculating homepage portfolio data:', error)
    return NextResponse.json(
      { error: 'Failed to load homepage portfolio data' },
      { status: 500 }
    )
  }
}