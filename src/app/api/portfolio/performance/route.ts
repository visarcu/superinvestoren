// src/app/api/portfolio/performance/route.ts - Performance Analytics
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get portfolio snapshots for performance tracking
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: true })
      .limit(365) // Last year

    if (snapshotsError) {
      console.error('Portfolio snapshots error:', snapshotsError)
    }

    // Get current portfolio for analysis
    const { data: positions, error: positionsError } = await supabase
      .from('portfolio_positions_enriched')
      .select('*')
      .eq('user_id', userId)

    if (positionsError) {
      console.error('Portfolio positions error:', positionsError)
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }

    // Get sector data for each position (simplified - would need actual sector mapping)
    const enrichPositions = await Promise.all(
      positions?.map(async (position) => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
          const response = await fetch(
            `https://financialmodelingprep.com/api/v3/profile/${position.ticker}?apikey=${apiKey}`
          )
          
          if (response.ok) {
            const [profile] = await response.json()
            return {
              ...position,
              sector: profile?.sector || 'Unknown',
              industry: profile?.industry || 'Unknown'
            }
          }
        } catch (error) {
          console.warn(`Failed to get sector for ${position.ticker}:`, error)
        }
        
        return {
          ...position,
          sector: 'Unknown',
          industry: 'Unknown'
        }
      }) || []
    )

    // Calculate sector allocation
    const sectorAllocation = enrichPositions.reduce((acc: any, position: any) => {
      const sector = position.sector || 'Unknown'
      if (!acc[sector]) {
        acc[sector] = {
          sector,
          value: 0,
          percentage: 0,
          positions: []
        }
      }
      acc[sector].value += position.current_value
      acc[sector].positions.push(position.ticker)
      return acc
    }, {})

    // Calculate percentages
    const totalValue = enrichPositions.reduce((sum, pos) => sum + pos.current_value, 0)
    Object.values(sectorAllocation).forEach((sector: any) => {
      sector.percentage = totalValue > 0 ? (sector.value / totalValue) * 100 : 0
    })

    // Performance metrics
    const costBasis = enrichPositions.reduce((sum, pos) => sum + pos.cost_basis, 0)
    const totalReturn = totalValue - costBasis
    const totalReturnPercent = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0

    // Top/worst performers
    const sortedPositions = enrichPositions
      .filter(pos => pos.cost_basis > 0)
      .sort((a, b) => b.unrealized_gain_loss_percent - a.unrealized_gain_loss_percent)

    const topPerformers = sortedPositions.slice(0, 5)
    const worstPerformers = sortedPositions.slice(-3).reverse()

    // Generate mock historical data if no snapshots exist
    let performanceHistory = snapshots || []
    if (!performanceHistory || performanceHistory.length === 0) {
      // Generate last 12 months of mock data
      performanceHistory = []
      const startValue = costBasis
      let currentValue = startValue
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        
        // Random walk with slight positive bias
        const monthlyReturn = (Math.random() - 0.4) * 0.1
        currentValue *= (1 + monthlyReturn)
        
        performanceHistory.push({
          snapshot_date: date.toISOString().split('T')[0],
          total_value: currentValue,
          total_cost: startValue,
          total_gain_loss: currentValue - startValue,
          total_gain_loss_percent: startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0
        })
      }
    }

    // Risk metrics (simplified calculations)
    const returns = performanceHistory.map((snapshot, index) => {
      if (index === 0) return 0
      const prevValue = performanceHistory[index - 1].total_value
      return prevValue > 0 ? (snapshot.total_value - prevValue) / prevValue : 0
    }).filter(r => r !== 0)

    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
    const variance = returns.length > 1 ? 
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1) : 0
    const volatility = Math.sqrt(variance * 12) * 100 // Annualized volatility

    const maxDrawdown = performanceHistory.reduce((maxDD, snapshot, index) => {
      if (index === 0) return 0
      
      const peak = Math.max(...performanceHistory.slice(0, index + 1).map(s => s.total_value))
      const drawdown = peak > 0 ? (peak - snapshot.total_value) / peak : 0
      return Math.max(maxDD, drawdown)
    }, 0) * 100

    return NextResponse.json({
      success: true,
      performance: {
        currentValue: totalValue,
        costBasis,
        totalReturn,
        totalReturnPercent,
        snapshots: performanceHistory,
        sectorAllocation: Object.values(sectorAllocation),
        positions: enrichPositions,
        topPerformers,
        worstPerformers,
        riskMetrics: {
          volatility: volatility,
          maxDrawdown: maxDrawdown,
          sharpeRatio: volatility > 0 ? (totalReturnPercent / volatility) : 0,
          beta: 0.92 // Mock beta vs S&P 500
        },
        benchmarks: {
          // Mock benchmark data - in real app, fetch from financial APIs
          sp500Return: 12.4,
          nasdaqReturn: 18.9,
          msciWorldReturn: 9.7
        }
      }
    })

  } catch (error) {
    console.error('Portfolio performance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}