// Finclue Data API v1 – Company Profile
// GET /api/v1/company/{ticker}

import { NextRequest, NextResponse } from 'next/server'
import { getCompanyProfile } from '@/lib/sec/companyProfileService'
import { resolveEUTicker, getEUCompanyInfo, resolveFMPTicker } from '@/lib/tickerResolver'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const profile = await getCompanyProfile(ticker)

    return NextResponse.json(profile, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (error) {
    // Kein SEC-Profil gefunden — EU-Ticker Fallback
    const euInfo = getEUCompanyInfo(ticker)
    if (euInfo) {
      // Versuche Finnhub-Profil für zusätzliche Daten
      let extra: any = {}
      try {
        const fmpTicker = resolveFMPTicker(ticker)
        const fmpKey = process.env.FMP_API_KEY
        if (fmpKey) {
          const res = await fetch(`https://financialmodelingprep.com/api/v3/profile/${fmpTicker}?apikey=${fmpKey}`, { next: { revalidate: 86400 } })
          if (res.ok) {
            const data = await res.json()
            const p = Array.isArray(data) ? data[0] : data
            if (p) extra = {
              description: p.description || null,
              sector: p.sector || null,
              industry: p.industry || null,
              website: p.website || null,
              logo: p.image || null,
              employees: p.fullTimeEmployees || null,
              ceo: p.ceo || null,
              ipoDate: p.ipoDate || null,
              marketCap: p.mktCap || null,
            }
          }
        }
      } catch {}

      return NextResponse.json({
        ticker,
        name: extra.name || euInfo.name,
        country: euInfo.country,
        currency: euInfo.currency,
        exchange: euInfo.exchange,
        sector: extra.sector || null,
        industry: extra.industry || null,
        description: extra.description || null,
        website: extra.website || null,
        logo: extra.logo || null,
        employees: extra.employees || null,
        ceo: extra.ceo || null,
        marketCap: extra.marketCap || null,
        source: 'eu-ticker-mapping',
      }, {
        headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' },
      })
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Kein CIK') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
