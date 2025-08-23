// src/app/api/estimates/revisions/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY || 'KYadX7pZnaaP034Rb4GvLtWhoKvCNuaw'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase()
    
    // Fetch upgrades/downgrades from FMP as proxy for analyst activity
    const upgradesResponse = await fetch(
      `https://financialmodelingprep.com/api/v4/upgrades-downgrades-grading-company?company=${ticker}&apikey=${FMP_API_KEY}`
    )
    
    const currentEstimatesResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?limit=10&apikey=${FMP_API_KEY}`
    )

    if (!upgradesResponse.ok || !currentEstimatesResponse.ok) {
      throw new Error('Failed to fetch analyst data')
    }

    const upgradesData = await upgradesResponse.json()
    const estimatesData = await currentEstimatesResponse.json()

    // Transform upgrades/downgrades into revision-like data
    const revisionHistory = transformUpgradesToRevisions(upgradesData, estimatesData, ticker)
    const revisionSummary = calculateRevisionSummary(revisionHistory)

    return NextResponse.json({
      ticker,
      revisionHistory,
      revisionSummary,
      source: 'FMP API',
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching analyst revisions:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch analyst revision data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

interface UpgradeDowngrade {
  symbol: string
  publishedDate: string
  newsURL: string
  newsTitle: string
  newsBaseURL: string
  newsPublisher: string
  newGrade: string
  previousGrade: string
  gradingCompany: string
  action: string
}

interface EstimateRevision {
  date: string
  period: string
  epsEstimate: number
  epsPreviousEstimate: number
  epsChange: number
  epsChangePercent: number
  revenueEstimate: number
  revenuePreviousEstimate: number
  revenueChange: number
  revenueChangePercent: number
  analystCount: number
  action: 'upgrade' | 'downgrade' | 'initiate' | 'maintain'
  gradingCompany: string
  newGrade?: string
  previousGrade?: string
}

function transformUpgradesToRevisions(
  upgrades: UpgradeDowngrade[], 
  estimates: any[], 
  ticker: string
): EstimateRevision[] {
  const revisions: EstimateRevision[] = []
  
  // Sort upgrades by date (most recent first)
  const sortedUpgrades = upgrades
    .filter(u => u.symbol === ticker)
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
    .slice(0, 20) // Last 20 analyst actions

  sortedUpgrades.forEach((upgrade, index) => {
    // Get current estimates for context
    const currentEstimate = estimates[0] || {}
    const nextEstimate = estimates[1] || {}
    
    // Estimate impact based on grade change
    const gradeImpact = calculateGradeImpact(upgrade.previousGrade, upgrade.newGrade)
    
    // Base EPS and Revenue from current estimates
    const baseEps = currentEstimate.estimatedEpsAvg || 5.0
    const baseRevenue = currentEstimate.estimatedRevenueAvg || 50000000000
    
    // Apply grade impact to estimates
    const epsChange = baseEps * gradeImpact * 0.1 // 10% max impact
    const revenueChange = baseRevenue * gradeImpact * 0.05 // 5% max impact
    
    revisions.push({
      date: upgrade.publishedDate,
      period: `FY ${new Date().getFullYear()}`,
      epsEstimate: baseEps + epsChange,
      epsPreviousEstimate: baseEps,
      epsChange,
      epsChangePercent: (epsChange / baseEps) * 100,
      revenueEstimate: baseRevenue + revenueChange,
      revenuePreviousEstimate: baseRevenue,
      revenueChange,
      revenueChangePercent: (revenueChange / baseRevenue) * 100,
      analystCount: 1,
      action: determineAction(upgrade.action),
      gradingCompany: upgrade.gradingCompany,
      newGrade: upgrade.newGrade,
      previousGrade: upgrade.previousGrade
    })
  })

  return revisions
}

function calculateGradeImpact(previousGrade: string, newGrade: string): number {
  const gradeValues: { [key: string]: number } = {
    'Strong Buy': 5,
    'Buy': 4,
    'Outperform': 4,
    'Overweight': 4,
    'Hold': 3,
    'Neutral': 3,
    'Market Perform': 3,
    'Sell': 2,
    'Underperform': 2,
    'Underweight': 2,
    'Strong Sell': 1
  }
  
  const previousValue = gradeValues[previousGrade] || 3
  const newValue = gradeValues[newGrade] || 3
  
  return (newValue - previousValue) / 4 // Normalized to -1 to 1
}

function determineAction(action: string): 'upgrade' | 'downgrade' | 'initiate' | 'maintain' {
  const actionLower = action.toLowerCase()
  
  if (actionLower.includes('upgrade') || actionLower.includes('raise')) {
    return 'upgrade'
  } else if (actionLower.includes('downgrade') || actionLower.includes('lower')) {
    return 'downgrade'
  } else if (actionLower.includes('initiate') || actionLower.includes('start')) {
    return 'initiate'
  } else {
    return 'maintain'
  }
}

function calculateRevisionSummary(revisions: EstimateRevision[]) {
  // Filter to last 3 months
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  const recentRevisions = revisions.filter(r => 
    new Date(r.date) >= threeMonthsAgo
  )

  return {
    epsUpRevisions: recentRevisions.filter(r => r.epsChange > 0).length,
    epsDownRevisions: recentRevisions.filter(r => r.epsChange < 0).length,
    epsNoChange: recentRevisions.filter(r => r.epsChange === 0).length,
    revenueUpRevisions: recentRevisions.filter(r => r.revenueChange > 0).length,
    revenueDownRevisions: recentRevisions.filter(r => r.revenueChange < 0).length,
    revenueNoChange: recentRevisions.filter(r => r.revenueChange === 0).length,
    totalUpgrades: recentRevisions.filter(r => r.action === 'upgrade').length,
    totalDowngrades: recentRevisions.filter(r => r.action === 'downgrade').length,
    totalInitiations: recentRevisions.filter(r => r.action === 'initiate').length,
    lastUpdated: new Date().toISOString()
  }
}