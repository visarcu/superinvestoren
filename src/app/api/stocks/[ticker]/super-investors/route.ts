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
    return `${(value / 1_000_000_000_000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bio. $`
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mrd. $`
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio. $`
  }
  return `${(value / 1_000).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K $`
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-DE').format(num)
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function getPeriodFromDate(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
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

      // Skip if position has been completely sold (shares = 0 or value < $100K)
      if (mergedPosition.shares <= 0 || mergedPosition.value < 100000) {
        return
      }

      // Calculate percentage of portfolio
      const totalPortfolioValue = latest.positions.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
      const portfolioPercentage = totalPortfolioValue > 0 ? (mergedPosition.value / totalPortfolioValue) * 100 : 0

      // Use the same logic as individual investor pages to calculate correct changes
      let trend = 'stable'
      let changeValue = 0
      let changeShares = 0
      let changeSharePercentage = 0
      let isNewPosition = false
      
      if (snapshots.length >= 2) {
        const previous = snapshots[snapshots.length - 2]?.data
        if (previous?.positions) {
          // Use the same merging logic as individual investor pages
          const prevPositions = previous.positions.filter((p: any) => getTicker(p) === ticker)
          const prevValue = prevPositions.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
          const prevShares = prevPositions.reduce((sum: number, p: any) => sum + (p.shares || 0), 0)
          
          console.log(`📊 ${investorInfo?.name} (${ticker}) - Prev: ${prevShares} shares, Current: ${mergedPosition.shares} shares`)
          
          // Check if this is a completely new position
          if (prevShares === 0 && mergedPosition.shares > 0) {
            isNewPosition = true
            trend = 'new'
          } else if (prevShares > 0) {
            changeValue = mergedPosition.value - prevValue
            changeShares = mergedPosition.shares - prevShares
            changeSharePercentage = prevShares > 0 ? (changeShares / prevShares) * 100 : 0
            
            // Use more precise threshold - only significant changes >1% of shares AND minimum threshold
            const shareChangePercent = Math.abs(changeSharePercentage)
            const minShareThreshold = Math.max(1000, prevShares * 0.001) // 0.1% or min 1000 shares
            
            console.log(`📊 ${investorInfo?.name} (${ticker}) - Change: ${changeShares} shares (${changeSharePercentage.toFixed(2)}%)`)
            
            // Only consider it activity if there's a real change above threshold
            if (Math.abs(changeShares) >= minShareThreshold && shareChangePercent >= 1.0) {
              trend = changeShares > 0 ? 'increasing' : 'decreasing'
            } else {
              // No significant activity - it's stable
              trend = 'stable'
              changeValue = 0
              changeShares = 0
              changeSharePercentage = 0
            }
          }
        } else if (mergedPosition.value > 1000000) {
          // No previous data available, but has significant value
          isNewPosition = true
          trend = 'new'
        }
      } else if (mergedPosition.value > 1000000) {
        // Only one snapshot available
        isNewPosition = true
        trend = 'new'
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
          changeShares,
          changeSharePercentage,
          isNewPosition,
          lastUpdated: latest.date,
          quarter: getPeriodFromDate(latest.date),
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
    const newPositions = superInvestorPositions.filter(pos => pos.position.isNewPosition).length

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
        newPositions,
        formattedTotalValue: formatMarketCap(totalValue),
        formattedAveragePosition: formatMarketCap(averagePosition)
      },
      positions: superInvestorPositions.map(pos => ({
        ...pos,
        position: {
          ...pos.position,
          formattedValue: formatMarketCap(pos.position.value),
          formattedShares: formatNumber(pos.position.shares),
          formattedPortfolioPercentage: `${pos.position.portfolioPercentage.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
          formattedChangeValue: pos.position.isNewPosition ? 'Neu' : (
            // Show share percentage change if it's significant and shares changed
            Math.abs(pos.position.changeSharePercentage) >= 1.0 && pos.position.changeShares !== 0
              ? `${formatPercentage(pos.position.changeSharePercentage)} Aktien`
              // Show value change if shares didn't change but value did
              : pos.position.changeValue !== 0 && Math.abs(pos.position.changeValue) >= 100000
                ? `${pos.position.changeValue >= 0 ? '+' : ''}${formatMarketCap(Math.abs(pos.position.changeValue))} Wert`
                : '0% Änderung'
          )
        }
      }))
    }

    console.log(`✅ Super investor data calculated for ${ticker}: ${totalPositions} investors, ${formatMarketCap(totalValue)} total value`)
    
    // Debug: Show who has what trend for AAPL
    if (ticker === 'AAPL') {
      const trends = superInvestorPositions.map(p => `${p.investor.name}: ${p.position.trend}`).join(', ')
      console.log(`📈 AAPL Trends: ${trends}`)
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
