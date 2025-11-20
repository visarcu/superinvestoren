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

      // Get historical data for trend and determine if truly "new"
      let trend = 'stable'
      let changeValue = 0
      let changeShares = 0
      let changeSharePercentage = 0
      let isNewPosition = false
      
      if (snapshots.length >= 2) {
        const previous = snapshots[snapshots.length - 2]?.data
        if (previous?.positions) {
          const prevPositions = previous.positions.filter((p: any) => getTicker(p) === ticker)
          const prevValue = prevPositions.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
          const prevShares = prevPositions.reduce((sum: number, p: any) => sum + (p.shares || 0), 0)
          
          // Check if this is a completely new position (no previous value)
          if (prevValue === 0 && mergedPosition.value > 5000000) {
            isNewPosition = true
            trend = 'new'
          } else if (prevValue > 0) {
            changeValue = mergedPosition.value - prevValue
            changeShares = mergedPosition.shares - prevShares
            changeSharePercentage = prevShares > 0 ? (changeShares / prevShares) * 100 : 0
            const changePercentage = (changeValue / prevValue) * 100
            const shareChangeMagnitude = Math.abs(changeSharePercentage)
            const shareCountMagnitude = Math.abs(changeShares)
            const percentThreshold = 1 // consider >=1% change in shares significant
            const shareCountThreshold = Math.max(prevShares * 0.01, 10000)
            
            // Debug logging for Apple/Buffett/Berkshire
            if (ticker === 'AAPL' && (investorInfo?.name?.toLowerCase().includes('buffett') || investorInfo?.name?.toLowerCase().includes('berkshire') || slug.includes('buffett') || slug.includes('berkshire'))) {
              console.log(`🔍 DEBUG ${investorInfo.name} (${ticker}):`, {
                currentValue: formatMarketCap(mergedPosition.value),
                previousValue: formatMarketCap(prevValue), 
                change: formatMarketCap(changeValue),
                changePercentage: changePercentage.toFixed(2) + '%',
                shareChange: changeShares.toLocaleString(),
                shareChangePercentage: changeSharePercentage.toFixed(2) + '%'
              })
            }
            
            const shareChangeSignificant = shareChangeMagnitude >= percentThreshold || shareCountMagnitude >= shareCountThreshold

            // Prioritize share-based classification
            if (shareChangeSignificant) {
              trend = changeShares > 0 ? 'increasing' : 'decreasing'
            }
            // Fallback to value-based classification for minor share fluctuations
            else if (changeValue > 0 && (changePercentage > 5 || changeValue > 500000000)) {
              trend = 'increasing'
            }
            // Any decrease >$100K counts as decreasing 
            else if (changeValue < -100000) {
              trend = 'decreasing'
            }
            // Otherwise stable
            else {
              trend = 'stable'
            }
            
            // Debug trend result for Buffett/Berkshire
            if (ticker === 'AAPL' && (investorInfo?.name?.toLowerCase().includes('buffett') || investorInfo?.name?.toLowerCase().includes('berkshire') || slug.includes('buffett') || slug.includes('berkshire'))) {
              console.log(`📊 ${investorInfo.name} trend result: ${trend}`)
            }
          }
        } else if (mergedPosition.value > 5000000) {
          // No previous data available, assume new
          isNewPosition = true
          trend = 'new'
        }
      } else if (mergedPosition.value > 5000000) {
        // Only one snapshot available, assume new
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
            pos.position.changeSharePercentage && pos.position.changeSharePercentage !== 0
              ? `${formatPercentage(pos.position.changeSharePercentage)} Aktien`
              : (pos.position.changeValue !== 0 && (pos.position.value - pos.position.changeValue) > 0)
                ? formatPercentage((pos.position.changeValue / (pos.position.value - pos.position.changeValue)) * 100)
                : '0%'
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
