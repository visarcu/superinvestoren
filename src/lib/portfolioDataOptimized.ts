// Optimized portfolio data fetcher - PERFORMANCE IMPROVEMENT
import { stocks } from '@/data/stocks'
import { getLatestHoldings, staticHoldings } from './holdingsAPI'

export interface OptimizedPortfolio {
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

// Performance-optimized version of getRealPortfolioData
export async function getOptimizedPortfolioData(): Promise<OptimizedPortfolio[]> {
  const investorSlugs = ['buffett', 'ackman', 'marks']
  const portfolios: OptimizedPortfolio[] = []

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
      filingId: '1086801'
    }
  } as const

  // Process each investor
  for (const slug of investorSlugs) {
    try {
      // Try optimized API call first
      const latestSnapshot = await getLatestHoldings(slug)
      
      if (!latestSnapshot?.data?.positions) {
        console.warn(`No data found for ${slug}, skipping`)
        continue
      }

      const latest = latestSnapshot.data

      // Merge positions by CUSIP (same logic as original)
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
      const info = investorInfo[slug as keyof typeof investorInfo]

      portfolios.push({
        name: info.name,
        investor: info.investor,
        date: latest.date,
        filingId: info.filingId,
        totalValue: `$${(totalValue / 1000000000).toFixed(1)}B`,
        tickers: mergedHoldings.map(h => h.ticker).join(', '),
        holdings: mergedHoldings.map(holding => ({
          ticker: holding.ticker,
          value: `$${(holding.value / 1000000).toFixed(0)}M`,
          percentage: `${((holding.value / totalValue) * 100).toFixed(1)}%`
        }))
      })

    } catch (error) {
      console.error(`Error processing ${slug}:`, error)
      // Continue with next investor instead of breaking
    }
  }

  return portfolios
}

// Fallback function that mirrors the original exactly
export function getFallbackPortfolioData(): OptimizedPortfolio[] {
  const investorSlugs = ['buffett', 'ackman', 'marks']
  const portfolios: OptimizedPortfolio[] = []

  investorSlugs.forEach(slug => {
    const snapshots = staticHoldings[slug as keyof typeof staticHoldings]
    if (!snapshots || snapshots.length === 0) return

    const latest = snapshots[snapshots.length - 1].data
    
    // ... (same logic as original getRealPortfolioData)
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
        filingId: '1086801'
      }
    } as const

    const info = investorInfo[slug as keyof typeof investorInfo]

    portfolios.push({
      name: info.name,
      investor: info.investor,
      date: latest.date,
      filingId: info.filingId,
      totalValue: `$${(totalValue / 1000000000).toFixed(1)}B`,
      tickers: mergedHoldings.map(h => h.ticker).join(', '),
      holdings: mergedHoldings.map(holding => ({
        ticker: holding.ticker,
        value: `$${(holding.value / 1000000).toFixed(0)}M`,
        percentage: `${((holding.value / totalValue) * 100).toFixed(1)}%`
      }))
    })
  })

  return portfolios
}