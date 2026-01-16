// app/api/sector-performance/route.ts
import { NextResponse } from 'next/server'

// Deutsche Übersetzungen für Sektoren
const sectorTranslations: Record<string, string> = {
  'Technology': 'Technologie',
  'Healthcare': 'Gesundheit',
  'Financial Services': 'Finanzen',
  'Consumer Cyclical': 'Zyklischer Konsum',
  'Consumer Defensive': 'Basiskonsumgüter',
  'Industrials': 'Industrie',
  'Energy': 'Energie',
  'Utilities': 'Versorger',
  'Real Estate': 'Immobilien',
  'Basic Materials': 'Grundstoffe',
  'Communication Services': 'Kommunikation'
}

export async function GET() {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/sector-performance?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 300 } } // 5 Minuten Cache
    )

    if (!response.ok) {
      throw new Error('FMP API error')
    }

    const data = await response.json()

    // Formatiere und sortiere nach Performance
    const sectors = data
      .map((item: any) => {
        // Parse percentage string zu number (z.B. "-0.09359%" -> -0.09359)
        const changeStr = item.changesPercentage?.replace('%', '') || '0'
        const change = parseFloat(changeStr)

        return {
          sector: item.sector,
          sectorDE: sectorTranslations[item.sector] || item.sector,
          change: change,
          changeFormatted: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
        }
      })
      .sort((a: any, b: any) => b.change - a.change) // Beste Performance zuerst

    return NextResponse.json({ sectors }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' // 5 min cache
      }
    })
  } catch (error) {
    console.error('Sector performance error:', error)
    return NextResponse.json({ error: 'Failed to fetch sector performance' }, { status: 500 })
  }
}
