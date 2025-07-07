// src/app/api/ownership/[ticker]/route.ts - PROFESSIONELLE VERSION
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 })
  }

  try {
    const apiKey = process.env.FMP_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    console.log(`🔍 [Ownership API] Loading data for ${ticker}`)

    // ✅ NUR INSTITUTIONAL HOLDERS (enthält bereits Mutual Funds)
    // ✅ PLUS OUTSTANDING SHARES FÜR KORREKTE BERECHNUNG
    const [instRes, sharesRes, quoteRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/institutional-holder/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/shares-float/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 86400 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      })
    ])
    
    let institutionalHoldings: any[] = []
    let outstandingShares = 0
    
    // Institutional Holdings
    if (instRes.ok) {
      institutionalHoldings = await instRes.json()
      console.log(`✅ [Ownership API] Institutional: ${institutionalHoldings.length} records`)
    } else {
      console.error(`❌ [Ownership API] Institutional failed: ${instRes.status}`)
    }
    
    // ✅ OUTSTANDING SHARES - MANDATORY FÜR PROFESSIONELLE BERECHNUNG
    if (sharesRes.ok) {
      try {
        const sharesData = await sharesRes.json()
        if (Array.isArray(sharesData) && sharesData.length > 0) {
          outstandingShares = sharesData[0]?.outstandingShares || sharesData[0]?.sharesOutstanding || 0
          console.log(`📊 [Ownership API] Outstanding Shares from shares-float: ${outstandingShares}`)
        }
      } catch (error) {
        console.warn('Shares-float parsing failed:', error)
      }
    }
    
    // Fallback: Quote API
    if (!outstandingShares && quoteRes.ok) {
      try {
        const quoteData = await quoteRes.json()
        if (Array.isArray(quoteData) && quoteData.length > 0) {
          outstandingShares = quoteData[0]?.sharesOutstanding || 0
          console.log(`📊 [Ownership API] Outstanding Shares from quote: ${outstandingShares}`)
        }
      } catch (error) {
        console.warn('Quote parsing failed:', error)
      }
    }

    // ❌ KEIN PROCESSING OHNE OUTSTANDING SHARES
    if (!outstandingShares || outstandingShares <= 0) {
      console.error(`❌ [Ownership API] No outstanding shares data available for ${ticker}`)
      return NextResponse.json({ 
        error: 'Outstanding shares data required for accurate calculations',
        message: 'Professional-grade ownership data requires outstanding shares information',
        ticker: ticker
      }, { status: 503 })
    }
    
    const processedData = processOwnershipDataProfessional(
      institutionalHoldings, 
      outstandingShares,
      ticker
    )
    
    return NextResponse.json({
      success: true,
      data: processedData,
      debug: {
        institutionalCount: institutionalHoldings.length,
        outstandingShares: outstandingShares,
        ticker: ticker,
        calculationMethod: 'Outstanding Shares Basis',
        dataQuality: 'Professional'
      }
    })

  } catch (error) {
    console.error(`❌ [Ownership API] Error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch ownership data',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function processOwnershipDataProfessional(
  institutional: any[], 
  outstandingShares: number,
  ticker: string
) {
  console.log(`🔧 [Ownership API] Professional processing for ${ticker}`)
  console.log(`📊 [Ownership API] Outstanding Shares: ${outstandingShares.toLocaleString()}`)
  
  // ✅ FIELD DETECTION
  const getSharesValue = (record: any): number => {
    const shares = record.sharesNumber || record.shares || record.numberOfShares || 
                   record.shareNumber || record.totalShares || record.sharesHeld || 
                   record.position || record.holdings || 0
    return Number(shares) || 0
  }

  const getHolderName = (record: any): string => {
    return record.holder || record.holderName || record.institutionName || 
           record.name || record.fundName || 'Unknown'
  }

  const getMarketValue = (record: any): number | null => {
    const value = record.value || record.marketValue || record.dollarValue || null
    return value ? Number(value) : null
  }

  // ✅ KATEGORISIERUNG DER INSTITUTIONAL HOLDERS
  const categorizeInstitution = (holderName: string): string => {
    const name = holderName.toLowerCase()
    
    // Mutual Funds
    if (name.includes('fund') || name.includes('mutual') || 
        name.includes('fidelity') || name.includes('vanguard') ||
        name.includes('invesco') || name.includes('t. rowe') ||
        name.includes('franklin') || name.includes('american funds')) {
      return 'Mutual Funds'
    }
    
    // ETFs
    if (name.includes('etf') || name.includes('spdr') || 
        name.includes('ishares') || name.includes('state street')) {
      return 'ETFs'
    }
    
    // Hedge Funds
    if (name.includes('hedge') || name.includes('capital') ||
        name.includes('partners') || name.includes('management')) {
      return 'Investment Advisors'
    }
    
    // Pension Funds
    if (name.includes('pension') || name.includes('retirement') ||
        name.includes('calpers') || name.includes('teachers')) {
      return 'Pension Funds'
    }
    
    // Insurance Companies
    if (name.includes('insurance') || name.includes('life') ||
        name.includes('prudential') || name.includes('metlife')) {
      return 'Insurance Companies'
    }
    
    return 'Other Institutions'
  }

  // 📊 PROCESS INSTITUTIONAL HOLDINGS
  const validHoldings = institutional
    .filter((h: any) => {
      const shares = getSharesValue(h)
      return shares && shares > 0
    })
    .map((h: any) => ({
      holder: getHolderName(h),
      sharesNumber: getSharesValue(h),
      value: getMarketValue(h),
      percentage: (getSharesValue(h) / outstandingShares) * 100,
      category: categorizeInstitution(getHolderName(h))
    }))
    .sort((a, b) => b.sharesNumber - a.sharesNumber)

  const topInstitutional = validHoldings.slice(0, 10)

  // ✅ BERECHNE KATEGORIEN BASIEREND AUF ECHTER KLASSIFIZIERUNG
  const categoryTotals = validHoldings.reduce((acc: any, holding: any) => {
    const category = holding.category
    if (!acc[category]) {
      acc[category] = { shares: 0, percentage: 0 }
    }
    acc[category].shares += holding.sharesNumber
    acc[category].percentage += holding.percentage
    return acc
  }, {})

  const totalInstitutionalShares = validHoldings.reduce((sum, h) => sum + h.sharesNumber, 0)
  const totalInstitutionalPercentage = (totalInstitutionalShares / outstandingShares) * 100

  // ✅ VERBLEIBENDES = 100% - INSTITUTIONAL %
  const remainingPercentage = Math.max(0, 100 - totalInstitutionalPercentage)
  const remainingShares = Math.max(0, outstandingShares - totalInstitutionalShares)

  // ✅ FINALE KATEGORIEN (wie Seeking Alpha)
  const categories = [
    ...Object.entries(categoryTotals).map(([name, data]: [string, any]) => ({
      name,
      value: data.shares,
      color: getCategoryColor(name),
      percentage: data.percentage
    })),
    {
      name: 'Öffentlich & Andere',
      value: remainingShares,
      color: '#6B7280',
      percentage: remainingPercentage
    }
  ]
    .filter((c: any) => c.percentage > 0.1) // Nur Kategorien >0.1%
    .sort((a: any, b: any) => b.percentage - a.percentage)

  console.log(`📊 [Ownership API] Total Institutional: ${totalInstitutionalPercentage.toFixed(2)}%`)
  console.log(`📊 [Ownership API] Public & Other: ${remainingPercentage.toFixed(2)}%`)
  console.log(`📊 [Ownership API] Categories: ${categories.length}`)

  // ✅ VALIDIERUNG: SUMME MUSS 100% SEIN
  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0)
  console.log(`✅ [Ownership API] Total percentage: ${totalPercentage.toFixed(2)}%`)

  if (Math.abs(totalPercentage - 100) > 0.1) {
    console.warn(`⚠️ [Ownership API] Percentage sum error: ${totalPercentage}%`)
  }

  return {
    topInstitutional,
    categories,
    totalInstitutionalShares,
    outstandingShares,
    summary: {
      institutionalPercentage: totalInstitutionalPercentage,
      publicPercentage: remainingPercentage,
      calculationBasis: 'Outstanding Shares',
      dataQuality: 'Professional',
      totalPercentageCheck: totalPercentage
    }
  }
}

function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    'Investmentfonds': '#3B82F6',
    'ETFs': '#10B981', 
    'Vermögensverwalter': '#F59E0B',
    'Pensionsfonds': '#8B5CF6',
    'Versicherungen': '#EF4444',
    'Andere Institutionen': '#6366F1',
    'Öffentlich & Andere': '#6B7280'
  }
  return colors[category] || '#9CA3AF'
}