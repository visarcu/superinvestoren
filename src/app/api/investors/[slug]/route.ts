// API Route for individual investor data - replaces 38MB client-side imports
import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'
import cashPositions from '@/data/cashPositions'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

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

function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

function mergePositions(positions: any[]) {
  const map = new Map<string, { shares: number; value: number; ticker?: string; name?: string }>()
  
  positions.forEach(p => {
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
  
  return Array.from(map.entries()).map(([cusip, { shares, value, ticker: positionTicker, name: positionName }]) => {
    const stockData = stocks.find(s => s.cusip === cusip)
    
    let ticker = positionTicker || stockData?.ticker || cusip.replace(/0+$/, '')
    let displayName = positionName || stockData?.name || cusip
    
    return {
      cusip, 
      ticker, 
      name: displayName,
      shares, 
      value,
      percentage: 0 // Will be calculated later
    }
  })
}

function calculateSectorBreakdown(mergedHoldings: any[], totalValue: number) {
  const sectors = new Map<string, { value: number; count: number }>()
  
  mergedHoldings.forEach(holding => {
    const sector = getSectorFromPosition(holding, stocks)
    const translatedSector = translateSector(sector)
    
    const current = sectors.get(translatedSector) || { value: 0, count: 0 }
    sectors.set(translatedSector, {
      value: current.value + holding.value,
      count: current.count + 1
    })
  })
  
  return Array.from(sectors.entries())
    .map(([sector, { value, count }]) => ({
      sector,
      value,
      count,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
}

function calculateOwnershipHistory(snapshots: any[], ticker: string) {
  return snapshots
    .map(snapshot => {
      const positions = snapshot.data.positions.filter((p: any) => 
        getTicker(p) === ticker
      )
      
      const totalShares = positions.reduce((sum: number, p: any) => sum + p.shares, 0)
      const totalValue = positions.reduce((sum: number, p: any) => sum + p.value, 0)
      
      return {
        date: snapshot.data.date,
        shares: totalShares,
        value: totalValue,
        formatted: {
          date: new Date(snapshot.data.date).toLocaleDateString('de-DE'),
          shares: new Intl.NumberFormat('de-DE').format(totalShares),
          value: formatCurrency(totalValue)
        }
      }
    })
    .filter(entry => entry.shares > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function calculatePortfolioChanges(snapshots: any[]) {
  if (snapshots.length < 2) return []
  
  const current = snapshots[snapshots.length - 1]
  const previous = snapshots[snapshots.length - 2]
  
  const currentMap = new Map<string, number>()
  const currentValueMap = new Map<string, number>()
  const nameMap = new Map<string, string>()
  
  current.data.positions.forEach((p: any) => {
    const ticker = getTicker(p)
    if (!ticker) return
    
    currentMap.set(ticker, (currentMap.get(ticker) || 0) + p.shares)
    currentValueMap.set(ticker, (currentValueMap.get(ticker) || 0) + p.value)
    if (!nameMap.has(ticker)) {
      nameMap.set(ticker, getStockName(p))
    }
  })
  
  const previousMap = new Map<string, number>()
  previous.data.positions.forEach((p: any) => {
    const ticker = getTicker(p)
    if (!ticker) return
    previousMap.set(ticker, (previousMap.get(ticker) || 0) + p.shares)
  })
  
  const changes: any[] = []
  
  // Check for changes in current positions
  currentMap.forEach((currentShares, ticker) => {
    const previousShares = previousMap.get(ticker) || 0
    const delta = currentShares - previousShares
    const currentValue = currentValueMap.get(ticker) || 0
    
    if (Math.abs(delta) > 100 && currentValue > 1000000) { // Min 1M value
      let action: string
      let color: string
      
      if (previousShares === 0) {
        action = 'Gekauft'
        color = 'text-green-400'
      } else if (delta > 0) {
        action = 'Erhöht'
        color = 'text-green-400'
      } else {
        action = 'Reduziert'
        color = 'text-red-400'
      }
      
      changes.push({
        ticker,
        name: nameMap.get(ticker) || ticker,
        action,
        change: {
          shares: Math.abs(delta),
          value: currentValue,
          formatted: {
            shares: new Intl.NumberFormat('de-DE').format(Math.abs(delta)),
            value: formatCurrency(currentValue, 'USD', 1)
          }
        },
        color,
        sortValue: currentValue
      })
    }
  })
  
  // Check for completely sold positions
  previousMap.forEach((previousShares, ticker) => {
    if (!currentMap.has(ticker) && previousShares > 100) {
      const estimatedValue = previousShares * 100 // Rough estimate
      
      changes.push({
        ticker,
        name: nameMap.get(ticker) || ticker,
        action: 'Verkauft',
        change: {
          shares: previousShares,
          value: estimatedValue,
          formatted: {
            shares: new Intl.NumberFormat('de-DE').format(previousShares),
            value: formatCurrency(estimatedValue, 'USD', 1)
          }
        },
        color: 'text-red-400',
        sortValue: estimatedValue
      })
    }
  })
  
  return changes
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, 20)
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    console.log(`🔄 Loading investor data for: ${slug}`)
    
    // Find investor
    const investor = investors.find(inv => inv.slug === slug)
    if (!investor) {
      return NextResponse.json(
        { error: 'Investor not found' },
        { status: 404 }
      )
    }
    
    // Get holdings data
    const snapshots = holdingsHistory[slug as keyof typeof holdingsHistory]
    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({
        investor,
        holdings: [],
        totalValue: 0,
        cashPosition: 0,
        sectorBreakdown: [],
        portfolioChanges: [],
        snapshots: [],
        lastUpdated: new Date().toISOString()
      })
    }
    
    // Get latest snapshot
    const latestSnapshot = snapshots[snapshots.length - 1]
    const mergedHoldings = mergePositions(latestSnapshot.data.positions)
    const totalValue = mergedHoldings.reduce((sum, holding) => sum + holding.value, 0)
    
    // Calculate percentages
    mergedHoldings.forEach(holding => {
      holding.percentage = totalValue > 0 ? (holding.value / totalValue) * 100 : 0
    })
    
    // Sort by value
    mergedHoldings.sort((a, b) => b.value - a.value)
    
    // Get cash position  
    const cashPositionData = cashPositions[slug as keyof typeof cashPositions]
    const cashPosition = Array.isArray(cashPositionData) && cashPositionData.length > 0 
      ? cashPositionData[cashPositionData.length - 1].cash 
      : 0
    
    // Calculate sector breakdown
    const sectorBreakdown = calculateSectorBreakdown(mergedHoldings, totalValue)
    
    // Calculate portfolio changes
    const portfolioChanges = calculatePortfolioChanges(snapshots)
    
    // Format snapshots for frontend
    const formattedSnapshots = snapshots.map(snapshot => ({
      date: snapshot.data.date,
      totalValue: snapshot.data.positions.reduce((sum: number, p: any) => sum + p.value, 0),
      positionsCount: snapshot.data.positions.length,
      formatted: {
        date: new Date(snapshot.data.date).toLocaleDateString('de-DE'),
        totalValue: formatCurrency(snapshot.data.positions.reduce((sum: number, p: any) => sum + p.value, 0))
      }
    }))
    
    const result = {
      investor,
      holdings: mergedHoldings.map(holding => ({
        ...holding,
        formatted: {
          value: formatCurrency(holding.value, 'USD', 1),
          shares: new Intl.NumberFormat('de-DE').format(holding.shares),
          percentage: `${holding.percentage.toFixed(2)}%`
        }
      })),
      totalValue,
      cashPosition,
      sectorBreakdown,
      portfolioChanges,
      snapshots: formattedSnapshots,
      lastUpdated: latestSnapshot.data.date,
      // Helper function for ownership history
      getOwnershipHistory: (ticker: string) => calculateOwnershipHistory(snapshots, ticker),
      formatted: {
        totalValue: formatCurrency(totalValue),
        cashPosition: formatCurrency(cashPosition)
      }
    }
    
    console.log(`✅ Investor data loaded for ${slug}: ${mergedHoldings.length} holdings, ${formatCurrency(totalValue)} total value`)
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' // 30 min cache, 1 hour stale
      }
    })
    
  } catch (error) {
    console.error('❌ Error loading investor data:', error)
    return NextResponse.json(
      { error: 'Failed to load investor data' },
      { status: 500 }
    )
  }
}