// /api/portfolio/resolve-isins/route.ts
// ISIN → Ticker: 1) CUSIP lokal, 2) OpenFIGI API, 3) FMP API Fallback

import { NextResponse } from 'next/server'
import { stocks } from '@/data/stocks'

const FMP_API_KEY = process.env.FMP_API_KEY

// === CUSIP-Map aus stocks (server-seitig, wird nur einmal erstellt) ===
let _cusipMap: Map<string, { ticker: string; name: string }> | null = null

function getCUSIPMap(): Map<string, { ticker: string; name: string }> {
  if (_cusipMap) return _cusipMap
  _cusipMap = new Map()
  for (const stock of stocks) {
    if (stock.cusip) {
      _cusipMap.set(stock.cusip.toUpperCase(), { ticker: stock.ticker, name: stock.name })
    }
  }
  return _cusipMap
}

/**
 * ISINs lokal via CUSIP auflösen (server-seitig).
 * ISIN = Ländercode(2) + NSIN/CUSIP(9) + Prüfziffer(1)
 */
function resolveViaCUSIP(
  isins: string[]
): { resolved: Record<string, { symbol: string; name: string }>; unresolved: string[] } {
  const cusipMap = getCUSIPMap()
  const resolved: Record<string, { symbol: string; name: string }> = {}
  const unresolved: string[] = []

  for (const isin of isins) {
    if (isin.length !== 12) {
      unresolved.push(isin)
      continue
    }
    const cusip = isin.substring(2, 11).toUpperCase()
    const match = cusipMap.get(cusip)
    if (match) {
      resolved[isin] = { symbol: match.ticker, name: match.name }
    } else {
      unresolved.push(isin)
    }
  }

  return { resolved, unresolved }
}

// OpenFIGI exchCode → FMP-kompatibler Ticker-Suffix
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

// Exchange-Prioritäten je nach ISIN-Herkunftsland
// US-Aktien → US-Ticker (TGT statt DYH.DE), EU-ETFs → XETRA-Ticker
const US_EXCHANGE_PRIORITY: string[] = [
  'US', 'UN', 'UQ', 'UW', 'UA', 'UP',  // US-Börsen zuerst
  'GR', 'GY', 'GF',                      // XETRA / Frankfurt
  'LN', 'LS',                             // London
  'CT', 'CN',                             // Kanada
  'FP', 'NA', 'BB',                       // Euronext
  'IM', 'SM', 'SE', 'DC', 'NO', 'FH',   // Weitere EU
  'SW', 'VX', 'AV',                       // Schweiz / Österreich
]

const EU_EXCHANGE_PRIORITY: string[] = [
  'GR', 'GY', 'GF',                      // XETRA / Frankfurt zuerst
  'LN', 'LS',                             // London
  'FP', 'NA', 'BB',                       // Euronext
  'IM', 'SM', 'SE', 'DC', 'NO', 'FH',   // Weitere EU
  'SW', 'VX', 'AV',                       // Schweiz / Österreich
  'US', 'UN', 'UQ', 'UW', 'UA', 'UP',   // US-Börsen
  'CT', 'CN',                             // Kanada
]

const GB_EXCHANGE_PRIORITY: string[] = [
  'LN', 'LS',                             // London zuerst
  'GR', 'GY', 'GF',                      // XETRA
  'US', 'UN', 'UQ', 'UW', 'UA', 'UP',   // US
  'FP', 'NA', 'BB',                       // Euronext
]

// ISIN-Länderpräfix → Exchange-Priorität
// US/CA ISINs → US-Ticker, DE/IE/LU/FR/NL/AT ISINs → XETRA, GB ISINs → London
function getExchangePriority(isin: string): string[] {
  const country = isin.substring(0, 2).toUpperCase()

  switch (country) {
    case 'US':
    case 'CA':
      return US_EXCHANGE_PRIORITY
    case 'GB':
    case 'GG': // Guernsey
    case 'JE': // Jersey
      return GB_EXCHANGE_PRIORITY
    default:
      // DE, IE, LU, FR, NL, AT, CH, etc. → XETRA bevorzugen
      return EU_EXCHANGE_PRIORITY
  }
}

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
 * OpenFIGI Batch-Anfrage
 * Ohne API-Key: max 10 ISINs pro Request, max 5 Requests/Minute
 * Mit API-Key: max 100 ISINs pro Request, 25 Requests/6 Sek
 */
async function resolveViaOpenFIGI(
  isins: string[]
): Promise<Record<string, { symbol: string; name: string } | null>> {
  const results: Record<string, { symbol: string; name: string } | null> = {}
  const hasApiKey = !!process.env.OPENFIGI_API_KEY

  // Batch-Größe je nach Auth: 10 ohne Key, 100 mit Key
  const batchSize = hasApiKey ? 100 : 10
  // Pause zwischen Batches: 1.5s ohne Key, 300ms mit Key
  const batchDelay = hasApiKey ? 300 : 1500

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
        // Bei 429 (Rate Limit): warten und retry
        if (response.status === 429) {
          console.error('OpenFIGI rate limit hit, waiting 15s...')
          await new Promise(resolve => setTimeout(resolve, 15000))
          // Retry diesen Batch
          i -= batchSize
          continue
        }
        console.error(`OpenFIGI API error: ${response.status} ${response.statusText}`)
        for (const isin of batch) {
          results[isin] = null
        }
        continue
      }

      const data: OpenFIGIResponse[] = await response.json()

      for (let j = 0; j < batch.length; j++) {
        const isin = batch[j]
        const figiResponse = data[j]

        if (figiResponse?.error || !figiResponse?.data || figiResponse.data.length === 0) {
          results[isin] = null
          continue
        }

        const bestMatch = pickBestMatch(figiResponse.data, isin)

        if (bestMatch) {
          const suffix = EXCHANGE_SUFFIX_MAP[bestMatch.exchCode] ?? ''
          // FMP nutzt Bindestriche statt Schrägstriche (BRK-B statt BRK/B)
          const cleanTicker = bestMatch.ticker.replace(/\//g, '-')
          const fmpSymbol = cleanTicker + suffix

          results[isin] = {
            symbol: fmpSymbol,
            name: bestMatch.name,
          }
        } else {
          results[isin] = null
        }
      }

      // Rate Limiting zwischen Batches
      if (i + batchSize < isins.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelay))
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
 * Exchange-Priorität hängt vom ISIN-Herkunftsland ab:
 * - US ISINs → US-Ticker bevorzugen (TGT statt DYH.DE)
 * - DE/IE/LU ISINs → XETRA bevorzugen (VWCE.DE)
 * - GB ISINs → London bevorzugen (RKT.L)
 */
function pickBestMatch(matches: OpenFIGIResult[], isin: string): OpenFIGIResult | null {
  if (matches.length === 0) return null

  // Relevante Security Types und Exchanges filtern
  // X1 = OTC/Composite (RB/EUR etc.), nicht nützlich für FMP
  const preferred = matches.filter(m => {
    const typeOk = !m.securityType2 ||
      ['Common Stock', 'ETP', 'ETF', 'REIT', 'Depositary Receipt', 'Open-End Fund', 'Closed-End Fund', 'Mutual Fund'].includes(m.securityType2)
    const exchangeOk = m.exchCode !== 'X1'
    return typeOk && exchangeOk
  })

  const candidates = preferred.length > 0 ? preferred : matches
  const exchangePriority = getExchangePriority(isin)

  // Nach Exchange-Priorität das beste Match finden
  let bestMatch: OpenFIGIResult | null = null
  let bestPriority = Infinity

  for (const match of candidates) {
    const priority = exchangePriority.indexOf(match.exchCode)
    if (priority !== -1 && priority < bestPriority) {
      bestPriority = priority
      bestMatch = match
    }
  }

  // Falls kein bekannter Exchange gefunden, ersten mit bekanntem Exchange nehmen
  if (!bestMatch) {
    bestMatch = candidates.find(m => m.exchCode in EXCHANGE_SUFFIX_MAP) || candidates[0]
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

    // Maximal 200 ISINs pro Request
    const limitedISINs = isins.slice(0, 200)

    // Phase 1: CUSIP lokal (instant, ~9000 US-Aktien)
    const { resolved: cusipResolved, unresolved: afterCUSIP } = resolveViaCUSIP(limitedISINs)

    // Phase 2: OpenFIGI für restliche ISINs (EU-ETFs, UK-Aktien etc.)
    let openFIGIResults: Record<string, { symbol: string; name: string } | null> = {}
    if (afterCUSIP.length > 0) {
      openFIGIResults = await resolveViaOpenFIGI(afterCUSIP)
    }

    // Phase 3: FMP Fallback für Rest
    const unresolvedAfterFIGI = afterCUSIP.filter(isin => !openFIGIResults[isin])
    let fmpResults: Record<string, { symbol: string; name: string } | null> = {}
    if (unresolvedAfterFIGI.length > 0 && FMP_API_KEY) {
      const fmpBatch = unresolvedAfterFIGI.slice(0, 20)
      fmpResults = await resolveViaFMP(fmpBatch)
    }

    // Ergebnisse zusammenführen
    const results: Record<string, { symbol: string; name: string; source: string } | null> = {}

    for (const isin of limitedISINs) {
      if (cusipResolved[isin]) {
        results[isin] = { ...cusipResolved[isin], source: 'cusip_local' }
      } else if (openFIGIResults[isin]) {
        results[isin] = { ...openFIGIResults[isin]!, source: 'openfigi' }
      } else if (fmpResults[isin]) {
        results[isin] = { ...fmpResults[isin]!, source: 'fmp_api' }
      } else {
        results[isin] = null
      }
    }

    const resolvedCount = Object.values(results).filter(r => r !== null).length
    const cusipCount = Object.values(results).filter(r => r?.source === 'cusip_local').length
    const openfigiCount = Object.values(results).filter(r => r?.source === 'openfigi').length
    const fmpCount = Object.values(results).filter(r => r?.source === 'fmp_api').length

    return NextResponse.json({
      results,
      stats: {
        total: limitedISINs.length,
        resolved: resolvedCount,
        unresolved: limitedISINs.length - resolvedCount,
        bySource: { cusip_local: cusipCount, openfigi: openfigiCount, fmp_api: fmpCount },
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
