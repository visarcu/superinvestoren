// /api/portfolio/resolve-isins/route.ts
// ISIN → Ticker Symbol Auflösung über OpenFIGI API (primär) + FMP API (Fallback)

import { NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

// OpenFIGI exchCode → FMP-kompatibler Ticker-Suffix
// Priorität für deutsche Broker: XETRA zuerst, dann US, dann andere
const EXCHANGE_SUFFIX_MAP: Record<string, string> = {
  // Deutsche Börsen
  'GR': '.DE',   // XETRA / Frankfurt
  'GY': '.DE',   // XETRA (Bloomberg-Kürzel)
  'GF': '.DE',   // Frankfurt
  // US-Börsen
  'US': '',      // NYSE/NASDAQ (kein Suffix)
  'UN': '',      // NYSE
  'UQ': '',      // NASDAQ
  'UW': '',      // NASDAQ
  'UA': '',      // AMEX
  'UP': '',      // NYSE Arca
  // UK
  'LN': '.L',   // London Stock Exchange
  'LS': '.L',   // London (alternative)
  // Europa
  'FP': '.PA',  // Euronext Paris
  'NA': '.AS',  // Euronext Amsterdam
  'BB': '.BR',  // Euronext Brussels
  'IM': '.MI',  // Borsa Italiana / Milano
  'SM': '.MC',  // Bolsa de Madrid
  'SE': '.ST',  // Stockholm (NASDAQ OMX)
  'DC': '.CO',  // Copenhagen
  'NO': '.OL',  // Oslo
  'FH': '.HE',  // Helsinki
  'SW': '.SW',  // SIX Swiss Exchange
  'VX': '.SW',  // SIX (alternative)
  'AV': '.VI',  // Wiener Börse
  // Asien
  'JT': '.T',   // Tokyo Stock Exchange
  'HK': '.HK',  // Hong Kong
  'AU': '.AX',  // ASX (Australian)
  'SP': '.SI',  // Singapore
  'KS': '.KS',  // Korea
  // Kanada
  'CT': '.TO',  // Toronto
  'CN': '.TO',  // Toronto (alternative)
}

// Priorität: Für deutsche Broker bevorzugen wir XETRA, dann US
const EXCHANGE_PRIORITY: string[] = [
  'GR', 'GY', 'GF',           // XETRA / Frankfurt zuerst
  'US', 'UN', 'UQ', 'UW', 'UA', 'UP',  // US-Börsen
  'LN', 'LS',                  // London
  'FP', 'NA', 'BB',           // Euronext
  'IM', 'SM', 'SE', 'DC', 'NO', 'FH', // Weitere EU
  'SW', 'VX', 'AV',           // Schweiz / Österreich
  'JT', 'HK', 'AU',           // Asien-Pazifik
  'CT', 'CN',                  // Kanada
]

interface OpenFIGIResult {
  figi: string
  securityType?: string
  marketSector?: string
  ticker: string
  name: string
  exchCode: string
  compositeFIGI?: string
  securityType2?: string
}

interface OpenFIGIResponse {
  data?: OpenFIGIResult[]
  error?: string
  warning?: string
}

/**
 * OpenFIGI Batch-Anfrage (max 100 ISINs pro Request)
 * Kostenlos ohne API-Key: 25 Jobs / 6 Sek
 * Mit API-Key: 250 Jobs / 6 Sek
 */
async function resolveViaOpenFIGI(
  isins: string[]
): Promise<Record<string, { symbol: string; name: string } | null>> {
  const results: Record<string, { symbol: string; name: string } | null> = {}

  // OpenFIGI erlaubt max 100 ISINs pro Batch-Request
  const batchSize = 100
  for (let i = 0; i < isins.length; i += batchSize) {
    const batch = isins.slice(i, i + batchSize)

    const requestBody = batch.map(isin => ({
      idType: 'ID_ISIN',
      idValue: isin,
    }))

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      // Optional: API-Key für höhere Rate Limits
      const apiKey = process.env.OPENFIGI_API_KEY
      if (apiKey) {
        headers['X-OPENFIGI-APIKEY'] = apiKey
      }

      const response = await fetch('https://api.openfigi.com/v3/mapping', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        console.error(`OpenFIGI API error: ${response.status} ${response.statusText}`)
        // Alle ISINs in diesem Batch als null markieren
        for (const isin of batch) {
          results[isin] = null
        }
        continue
      }

      const data: OpenFIGIResponse[] = await response.json()

      // Jedes Response-Element entspricht dem ISIN an derselben Position
      for (let j = 0; j < batch.length; j++) {
        const isin = batch[j]
        const response = data[j]

        if (response?.error || !response?.data || response.data.length === 0) {
          results[isin] = null
          continue
        }

        // Bestes Match nach Exchange-Priorität wählen
        const bestMatch = pickBestMatch(response.data)

        if (bestMatch) {
          const suffix = EXCHANGE_SUFFIX_MAP[bestMatch.exchCode] ?? ''
          const fmpSymbol = bestMatch.ticker + suffix

          results[isin] = {
            symbol: fmpSymbol,
            name: bestMatch.name,
          }
        } else {
          results[isin] = null
        }
      }

      // Rate Limiting: 6 Sekunden Pause nach jedem Batch (ohne API-Key)
      if (!process.env.OPENFIGI_API_KEY && i + batchSize < isins.length) {
        await new Promise(resolve => setTimeout(resolve, 6500))
      }
    } catch (error) {
      console.error('OpenFIGI fetch error:', error)
      for (const isin of batch) {
        if (!(isin in results)) results[isin] = null
      }
    }
  }

  return results
}

/**
 * Bestes Match aus OpenFIGI Ergebnissen wählen.
 * Bevorzugt XETRA > US > London nach Exchange-Priorität.
 * Filtert Market Sector "Equity" und "Govt" bevorzugt.
 */
function pickBestMatch(matches: OpenFIGIResult[]): OpenFIGIResult | null {
  if (matches.length === 0) return null

  // Nur Common Stock, ETF, und REIT bevorzugen, andere auch erlauben
  const preferred = matches.filter(m =>
    !m.securityType2 ||
    ['Common Stock', 'ETP', 'ETF', 'REIT', 'Depositary Receipt', 'Open-End Fund', 'Closed-End Fund', 'Mutual Fund'].includes(m.securityType2)
  )

  const candidates = preferred.length > 0 ? preferred : matches

  // Nach Exchange-Priorität sortieren
  let bestMatch: OpenFIGIResult | null = null
  let bestPriority = Infinity

  for (const match of candidates) {
    const priority = EXCHANGE_PRIORITY.indexOf(match.exchCode)
    if (priority !== -1 && priority < bestPriority) {
      bestPriority = priority
      bestMatch = match
    }
  }

  // Falls kein bekannter Exchange gefunden, ersten nehmen
  if (!bestMatch) {
    bestMatch = candidates[0]
    // Ticker-Suffix versuchen wenn Exchange nicht bekannt
    if (bestMatch && !(bestMatch.exchCode in EXCHANGE_SUFFIX_MAP)) {
      // Unbekannter Exchange — Ticker ohne Suffix zurückgeben
      // (FMP wird evtl. nicht funktionieren, aber besser als nichts)
    }
  }

  return bestMatch
}

/**
 * FMP API Fallback für einzelne ISINs die OpenFIGI nicht auflösen konnte
 */
async function resolveViaFMP(
  isins: string[]
): Promise<Record<string, { symbol: string; name: string } | null>> {
  if (!FMP_API_KEY) return {}

  const results: Record<string, { symbol: string; name: string } | null> = {}

  for (const isin of isins) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(isin)}&limit=5&apikey=${FMP_API_KEY}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
          // Bevorzuge Listings an XETRA, NYSE/NASDAQ, dann andere
          const preferredExchanges = ['XETRA', 'NASDAQ', 'NYSE', 'LSE', 'EURONEXT']
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

      // Rate Limiting: 200ms Pause
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch {
      results[isin] = null
    }
  }

  return results
}

export async function POST(request: Request) {
  try {
    const { isins } = await request.json()

    if (!Array.isArray(isins) || isins.length === 0) {
      return NextResponse.json({ error: 'ISINs Array erforderlich' }, { status: 400 })
    }

    // Maximal 200 ISINs pro Request (2x OpenFIGI Batch à 100)
    const limitedISINs = isins.slice(0, 200)

    // Phase 1: OpenFIGI als primärer Resolver (Batch-fähig, schnell)
    const openFIGIResults = await resolveViaOpenFIGI(limitedISINs)

    // Phase 2: Unaufgelöste ISINs via FMP versuchen
    const unresolvedAfterFIGI = limitedISINs.filter(
      isin => !openFIGIResults[isin]
    )

    let fmpResults: Record<string, { symbol: string; name: string } | null> = {}
    if (unresolvedAfterFIGI.length > 0 && FMP_API_KEY) {
      // FMP nur für maximal 20 ISINs um die Antwortzeit nicht zu sprengen
      const fmpBatch = unresolvedAfterFIGI.slice(0, 20)
      fmpResults = await resolveViaFMP(fmpBatch)
    }

    // Ergebnisse zusammenführen
    const results: Record<string, { symbol: string; name: string; source: string } | null> = {}

    for (const isin of limitedISINs) {
      if (openFIGIResults[isin]) {
        results[isin] = { ...openFIGIResults[isin]!, source: 'openfigi' }
      } else if (fmpResults[isin]) {
        results[isin] = { ...fmpResults[isin]!, source: 'fmp_api' }
      } else {
        results[isin] = null
      }
    }

    // Statistiken
    const resolvedCount = Object.values(results).filter(r => r !== null).length
    const openfigiCount = Object.values(results).filter(r => r?.source === 'openfigi').length
    const fmpCount = Object.values(results).filter(r => r?.source === 'fmp_api').length

    return NextResponse.json({
      results,
      stats: {
        total: limitedISINs.length,
        resolved: resolvedCount,
        unresolved: limitedISINs.length - resolvedCount,
        bySource: { openfigi: openfigiCount, fmp_api: fmpCount },
      },
    })
  } catch (error) {
    console.error('ISIN resolve error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der ISIN-Auflösung' },
      { status: 500 }
    )
  }
}
