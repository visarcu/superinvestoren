// API route for ticker-specific super investor data
import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

// Helper functions
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

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)} Bio. $`
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} Mrd. $`
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)} Mio. $`
  }
  return `${(value / 1_000).toFixed(0)}K $`
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-DE').format(num)
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase()
    console.log(`📊 Calculating super investor data for ${ticker}...`)

    // Find stock info
    const stockInfo = stocks.find(s => s.ticker.toLowerCase() === ticker.toLowerCase())
    if (!stockInfo) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }

    // Calculate super investor positions
    const superInvestorPositions: any[] = []
    
    Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
      const investorInfo = investors.find(inv => inv.slug === slug)
      if (!investorInfo || !snapshots || snapshots.length === 0) return

      const latest = snapshots[snapshots.length - 1]?.data
      if (!latest?.positions) return

      // Find positions for this ticker (merge by CUSIP)
      const tickerPositions = latest.positions.filter((p: any) => {
        const posTicker = getTicker(p)
        return posTicker === ticker
      })

      if (tickerPositions.length === 0) return

      // Merge positions by CUSIP
      const mergedPosition = tickerPositions.reduce((acc: any, pos: any) => {
        acc.shares += pos.shares || 0
        acc.value += pos.value || 0
        return acc
      }, { shares: 0, value: 0, cusip: tickerPositions[0].cusip })

      // Calculate percentage of portfolio
      const totalPortfolioValue = latest.positions.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
      const portfolioPercentage = totalPortfolioValue > 0 ? (mergedPosition.value / totalPortfolioValue) * 100 : 0

      // Get historical data for trend
      let trend = 'stable'
      let changeValue = 0
      if (snapshots.length >= 2) {
        const previous = snapshots[snapshots.length - 2]?.data
        if (previous?.positions) {
          const prevPositions = previous.positions.filter((p: any) => getTicker(p) === ticker)
          const prevValue = prevPositions.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
          
          changeValue = mergedPosition.value - prevValue
          if (changeValue > prevValue * 0.05) trend = 'increasing'
          else if (changeValue < -prevValue * 0.05) trend = 'decreasing'
        }
      }

      superInvestorPositions.push({
        investor: {
          slug,
          name: investorInfo?.name || `Unknown (${slug})`,
          description: '', // investorInfo doesn't have description in current interface
          avatar: investorInfo?.imageUrl || `https://unavatar.io/${slug}`,
          aum: 0, // investorInfo doesn't have aum in current interface
        },
        position: {
          ticker,
          shares: mergedPosition.shares,
          value: mergedPosition.value,
          portfolioPercentage,
          trend,
          changeValue,
          lastUpdated: latest.date,
          quarter: `Q${Math.ceil(new Date(latest.date).getMonth() / 3)} ${new Date(latest.date).getFullYear()}`,
        }
      })
    })

    // Sort by position value
    superInvestorPositions.sort((a, b) => b.position.value - a.position.value)

    // Calculate summary statistics
    const totalPositions = superInvestorPositions.length
    const totalValue = superInvestorPositions.reduce((sum, pos) => sum + pos.position.value, 0)
    const averagePosition = totalPositions > 0 ? totalValue / totalPositions : 0
    const increasingTrends = superInvestorPositions.filter(pos => pos.position.trend === 'increasing').length
    const decreasingTrends = superInvestorPositions.filter(pos => pos.position.trend === 'decreasing').length

    const result = {
      ticker,
      stockInfo: {
        name: stockInfo.name,
        sector: stockInfo.sector,
        market: 'NASDAQ' // stockInfo doesn't have market in current interface
      },
      summary: {
        totalInvestors: totalPositions,
        totalValue,
        averagePosition,
        increasingTrends,
        decreasingTrends,
        formattedTotalValue: formatMarketCap(totalValue),
        formattedAveragePosition: formatMarketCap(averagePosition)
      },
      positions: superInvestorPositions.map(pos => ({
        ...pos,
        position: {
          ...pos.position,
          formattedValue: formatMarketCap(pos.position.value),
          formattedShares: formatNumber(pos.position.shares),
          formattedPortfolioPercentage: `${pos.position.portfolioPercentage.toFixed(2)}%`,
          formattedChangeValue: pos.position.changeValue !== 0 ? formatPercentage((pos.position.changeValue / (pos.position.value - pos.position.changeValue)) * 100) : '0%'
        }
      }))
    }

    console.log(`✅ Super investor data calculated for ${ticker}: ${totalPositions} investors, ${formatMarketCap(totalValue)} total value`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200', // 1 hour cache
      }
    })

  } catch (error) {
    console.error(`❌ Error calculating super investor data for ${params.ticker}:`, error)
    return NextResponse.json(
      { error: 'Failed to load super investor data' },
      { status: 500 }
    )
  }
}