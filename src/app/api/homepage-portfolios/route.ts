// API Route für Homepage Portfolio Data
import { NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

export async function GET() {
  try {
    const investorSlugs = ['buffett', 'ackman', 'marks']
    const portfolios: Array<{
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
    }> = []

    investorSlugs.forEach(slug => {
      const snapshots = holdingsHistory[slug]
      if (!snapshots || snapshots.length === 0) return

      const latest = snapshots[snapshots.length - 1].data
      
      const mergePositions = (raw: { cusip: string; shares: number; value: number; ticker?: string; name?: string }[]) => {
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

      const investorInfo = {
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
          filingId: '1007478'
        }
      }

      const info = investorInfo[slug as keyof typeof investorInfo]
      if (!info) return

      portfolios.push({
        name: info.name,
        investor: info.investor,
        date: latest.date?.split('-').reverse().join('.') || 'September 29, 2024',
        filingId: info.filingId,
        totalValue: totalValue >= 1000000000 
          ? `${(totalValue / 1000000000).toFixed(0)} Mrd. $`
          : `${(totalValue / 1000000).toFixed(0)} Mio. $`,
        tickers: mergedHoldings.map(h => h.ticker).join(', '),
        holdings: mergedHoldings.map(holding => ({
          ticker: holding.ticker,
          value: `${(holding.value / 1000000).toFixed(1)}M`,
          percentage: ((holding.value / totalValue) * 100).toFixed(1)
        }))
      })
    })

    return NextResponse.json(portfolios, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
      }
    })
  } catch (error) {
    console.error('Homepage portfolios API error:', error)
    
    // Fallback data
    const fallbackData = [
      {
        name: 'Berkshire Hathaway Inc',
        investor: 'Warren Buffett',
        date: '29.09.2024',
        filingId: '1067983',
        totalValue: '266 Mrd. $',
        tickers: 'AAPL, BAC, AXP, KO',
        holdings: [
          { ticker: 'AAPL', value: '69.9B', percentage: '26.0' },
          { ticker: 'BAC', value: '31.7B', percentage: '12.0' },
          { ticker: 'AXP', value: '25.1B', percentage: '9.5' },
          { ticker: 'KO', value: '22.4B', percentage: '8.5' },
          { ticker: 'CVX', value: '18.6B', percentage: '7.0' }
        ]
      }
    ]
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    })
  }
}