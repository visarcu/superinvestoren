// /api/portfolio/resolve-isins/route.ts
// ISIN → Ticker Symbol Auflösung über FMP API Search

import { NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

export async function POST(request: Request) {
  try {
    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const { isins } = await request.json()

    if (!Array.isArray(isins) || isins.length === 0) {
      return NextResponse.json({ error: 'ISINs Array erforderlich' }, { status: 400 })
    }

    // Maximal 50 ISINs pro Request
    const limitedISINs = isins.slice(0, 50)

    const results: Record<string, { symbol: string; name: string } | null> = {}

    // FMP API für jede ISIN abfragen
    for (const isin of limitedISINs) {
      try {
        const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(isin)}&limit=5&apikey=${FMP_API_KEY}`
        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()

          if (Array.isArray(data) && data.length > 0) {
            // Bestes Ergebnis: Bevorzuge Listings an NYSE/NASDAQ, dann XETRA/London
            const preferredExchanges = ['NASDAQ', 'NYSE', 'XETRA', 'LSE', 'EURONEXT']
            let bestMatch = data[0]

            for (const item of data) {
              const exchange = (item.exchangeShortName || '').toUpperCase()
              if (preferredExchanges.some(pe => exchange.includes(pe))) {
                bestMatch = item
                break
              }
            }

            results[isin] = {
              symbol: bestMatch.symbol,
              name: bestMatch.name,
            }
          } else {
            results[isin] = null
          }
        } else {
          results[isin] = null
        }

        // Rate Limiting: 200ms Pause zwischen Requests
        if (limitedISINs.indexOf(isin) < limitedISINs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch {
        results[isin] = null
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('ISIN resolve error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der ISIN-Auflösung' },
      { status: 500 }
    )
  }
}
