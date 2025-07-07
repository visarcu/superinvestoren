// src/app/api/employee-count/[ticker]/route.ts
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

    console.log(`🔍 [Employee Count API] Loading data for ${ticker}`)

    // ✅ NUR COMPANY PROFILE + KEY METRICS (echte Daten)
    const [profileRes, keyMetricsRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 86400 } // 24h cache
      }),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=15&apikey=${apiKey}`, {
        next: { revalidate: 86400 }
      })
    ])
    
    let currentEmployeeCount = 0
    let historicalData: any[] = []
    let companyProfile: any = null
    
    // Current Employee Count from Profile
    if (profileRes.ok) {
      const profileData = await profileRes.json()
      if (Array.isArray(profileData) && profileData.length > 0) {
        companyProfile = profileData[0]
        currentEmployeeCount = companyProfile.fullTimeEmployees || 0
        console.log(`✅ [Employee Count API] Current employees: ${currentEmployeeCount.toLocaleString()}`)
      }
    } else {
      console.error(`❌ [Employee Count API] Profile failed: ${profileRes.status}`)
    }
    
    // Historical Employee Count from Key Metrics ONLY (NO ESTIMATES)
    if (keyMetricsRes.ok) {
      const keyMetricsData = await keyMetricsRes.json()
      if (Array.isArray(keyMetricsData)) {
        historicalData = keyMetricsData
          .filter((item: any) => item.numberOfEmployees && item.numberOfEmployees > 0)
          .map((item: any) => ({
            year: item.calendarYear || item.date?.slice(0, 4) || '—',
            employeeCount: item.numberOfEmployees,
            date: item.date,
            source: 'key-metrics'
          }))
          .reverse() // Chronological order
          
        console.log(`✅ [Employee Count API] Real Key Metrics data: ${historicalData.length} years`)
      }
    } else {
      console.error(`❌ [Employee Count API] Key metrics failed: ${keyMetricsRes.status}`)
    }
    
    // ✅ PROFESSIONAL: Keine Schätzungen - nur echte Daten oder nichts
    console.log(`📊 [Employee Count API] Final data: ${historicalData.length} years of REAL data only`)
    
    // ✅ BERECHNE GROWTH METRICS nur wenn echte Daten vorhanden
    const employeeGrowth = calculateEmployeeGrowth(historicalData)
    
    // ✅ BESTIMME DATENQUALITÄT - NUR ECHTE DATEN
    const realDataCount = historicalData.length // Alle sind jetzt echt
    
    let dataQuality: string
    if (realDataCount >= 5) {
      dataQuality = 'excellent' // 5+ Jahre echte Daten
    } else if (realDataCount >= 3) {
      dataQuality = 'good' // 3-4 Jahre echte Daten  
    } else if (realDataCount >= 1) {
      dataQuality = 'fair' // 1-2 Jahre echte Daten
    } else {
      dataQuality = 'no-data' // Keine Daten verfügbar
    }
    
    return NextResponse.json({
      success: true,
      data: {
        currentEmployeeCount,
        historicalData,
        employeeGrowth,
        companyName: companyProfile?.companyName || ticker,
        industry: companyProfile?.industry || 'Unknown',
        dataQuality
      },
      debug: {
        ticker,
        profileEmployees: currentEmployeeCount,
        historicalYears: historicalData.length,
        realDataYears: realDataCount,
        dataSources: [...new Set(historicalData.map((d: any) => d.source))],
        qualityAssessment: dataQuality,
        professionalMode: 'only-real-data'
      }
    })

  } catch (error) {
    console.error(`❌ [Employee Count API] Error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch employee data',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function calculateEmployeeGrowth(data: any[]) {
  if (data.length < 2) return null
  
  const latest = data[data.length - 1]
  const previous = data[data.length - 2]
  
  if (!latest?.employeeCount || !previous?.employeeCount) return null
  
  const yearOverYear = ((latest.employeeCount - previous.employeeCount) / previous.employeeCount) * 100
  
  // 10-Year CAGR if available für langfristige Perspektive  
  let cagr = null
  if (data.length >= 10) {
    const oldest = data[data.length - 10]
    if (oldest?.employeeCount) {
      const years = parseInt(latest.year) - parseInt(oldest.year)
      cagr = (Math.pow(latest.employeeCount / oldest.employeeCount, 1 / years) - 1) * 100
    }
  } else if (data.length >= 5) {
    // Fallback: 5-Year CAGR wenn nicht genug Daten für 10 Jahre
    const oldest = data[data.length - 5]
    if (oldest?.employeeCount) {
      const years = parseInt(latest.year) - parseInt(oldest.year)
      cagr = (Math.pow(latest.employeeCount / oldest.employeeCount, 1 / years) - 1) * 100
    }
  }
  
  return {
    yearOverYear: Math.round(yearOverYear * 10) / 10, // 1 decimal
    cagr: cagr ? Math.round(cagr * 10) / 10 : null,
    trend: yearOverYear > 0 ? 'growing' : yearOverYear < 0 ? 'declining' : 'stable'
  }
}