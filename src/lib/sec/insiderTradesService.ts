// src/lib/sec/insiderTradesService.ts
// SEC Form 4 Insider Trades Parser
// 100% eigene Daten von SEC EDGAR – kein FMP, kein externer Provider
// https://www.sec.gov/cgi-bin/browse-edgar?type=4

import { getCIK } from './cikMapping'

const EDGAR_UA = 'Finclue research@finclue.de'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InsiderTrade {
  ticker: string
  companyName: string
  insiderName: string
  insiderCik: string
  title: string
  isOfficer: boolean
  isDirector: boolean
  is10PctOwner: boolean
  transactionDate: string        // ISO date
  filingDate: string             // ISO date
  type: 'buy' | 'sell' | 'gift' | 'exercise' | 'other'
  transactionCode: string        // P=Purchase, S=Sale, G=Gift, M=Exercise, etc.
  shares: number
  pricePerShare: number | null
  totalValue: number | null
  sharesAfter: number | null
  securityType: string           // "Common Stock", "Options", etc.
  accessionNumber: string
  filingUrl: string
  source: 'sec-form4'
}

// ─── Form 4 XML Parser ─────────────────────────────────────────────────────

function parseForm4Xml(xml: string, filingDate: string, accession: string, cik: string): InsiderTrade[] {
  const trades: InsiderTrade[] = []

  // Simple XML parsing without dependencies
  const getTag = (str: string, tag: string): string => {
    const match = str.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'))
    return match ? match[1].trim() : ''
  }

  const getNestedTag = (str: string, parent: string, child: string): string => {
    const parentMatch = str.match(new RegExp(`<${parent}[^>]*>[\\s\\S]*?</${parent}>`, 'i'))
    if (!parentMatch) return ''
    return getTag(parentMatch[0], child)
  }

  // Issuer info
  const issuerMatch = xml.match(/<issuer[\s\S]*?<\/issuer>/i)
  const ticker = issuerMatch ? getTag(issuerMatch[0], 'issuerTradingSymbol').toUpperCase() : ''
  const companyName = issuerMatch ? getTag(issuerMatch[0], 'issuerName') : ''

  // Reporting owner info
  const ownerMatch = xml.match(/<reportingOwner[\s\S]*?<\/reportingOwner>/i)
  let insiderName = '', insiderCik = '', title = ''
  let isOfficer = false, isDirector = false, is10PctOwner = false

  if (ownerMatch) {
    const ownerStr = ownerMatch[0]
    const idMatch = ownerStr.match(/<reportingOwnerId[\s\S]*?<\/reportingOwnerId>/i)
    if (idMatch) {
      insiderName = getTag(idMatch[0], 'rptOwnerName')
      insiderCik = getTag(idMatch[0], 'rptOwnerCik')
    }
    const relMatch = ownerStr.match(/<reportingOwnerRelationship[\s\S]*?<\/reportingOwnerRelationship>/i)
    if (relMatch) {
      title = getTag(relMatch[0], 'officerTitle')
      isOfficer = getTag(relMatch[0], 'isOfficer') === '1' || getTag(relMatch[0], 'isOfficer') === 'true'
      isDirector = getTag(relMatch[0], 'isDirector') === '1' || getTag(relMatch[0], 'isDirector') === 'true'
      is10PctOwner = getTag(relMatch[0], 'isTenPercentOwner') === '1' || getTag(relMatch[0], 'isTenPercentOwner') === 'true'
    }
  }

  // Non-derivative transactions (stock buys/sells)
  const txMatches = xml.matchAll(/<nonDerivativeTransaction[\s\S]*?<\/nonDerivativeTransaction>/gi)
  for (const txMatch of txMatches) {
    const tx = txMatch[0]

    const txDate = getNestedTag(tx, 'transactionDate', 'value')
    const txCode = getNestedTag(tx, 'transactionCoding', 'transactionCode')
    const shares = parseFloat(getNestedTag(tx, 'transactionShares', 'value')) || 0
    const price = parseFloat(getNestedTag(tx, 'transactionPricePerShare', 'value')) || null
    const acqDisp = getNestedTag(tx, 'transactionAcquiredDisposedCode', 'value')
    const sharesAfter = parseFloat(getNestedTag(tx, 'sharesOwnedFollowingTransaction', 'value')) || null
    const securityType = getNestedTag(tx, 'securityTitle', 'value') || 'Common Stock'

    // Map transaction codes to types
    let type: InsiderTrade['type'] = 'other'
    if (txCode === 'P') type = 'buy'
    else if (txCode === 'S') type = 'sell'
    else if (txCode === 'G') type = 'gift'
    else if (txCode === 'M' || txCode === 'C') type = 'exercise'
    else if (acqDisp === 'A') type = 'buy'
    else if (acqDisp === 'D') type = 'sell'

    if (shares <= 0) continue

    const accClean = accession.replace(/-/g, '')
    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accClean}/${accession}-index.htm`

    trades.push({
      ticker,
      companyName,
      insiderName,
      insiderCik,
      title,
      isOfficer,
      isDirector,
      is10PctOwner,
      transactionDate: txDate || filingDate,
      filingDate,
      type,
      transactionCode: txCode,
      shares,
      pricePerShare: price,
      totalValue: price && shares ? Math.round(price * shares) : null,
      sharesAfter,
      securityType,
      accessionNumber: accession,
      filingUrl,
      source: 'sec-form4',
    })
  }

  return trades
}

// ─── Fetch Insider Trades for a Ticker ──────────────────────────────────────

const cache = new Map<string, { data: InsiderTrade[]; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 Stunde

export async function getInsiderTrades(
  ticker: string,
  options: { limit?: number } = {}
): Promise<InsiderTrade[]> {
  const key = ticker.toUpperCase()
  const { limit = 50 } = options

  // Cache
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data.slice(0, limit)
  }

  // Get CIK
  const cik = await getCIK(key)
  if (!cik) return []

  try {
    // 1. Get recent Form 4 filings from submissions API
    const paddedCik = cik.padStart(10, '0')
    const res = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
      headers: { 'User-Agent': EDGAR_UA },
    })
    if (!res.ok) return []

    const data = await res.json()
    const recent = data.filings?.recent
    if (!recent?.form) return []

    // Find Form 4 filings (limit to recent ones for speed)
    const form4Filings: { accession: string; date: string; primaryDoc: string }[] = []
    for (let i = 0; i < recent.form.length && form4Filings.length < Math.min(limit * 2, 40); i++) {
      if (recent.form[i] === '4' || recent.form[i] === '4/A') {
        form4Filings.push({
          accession: recent.accessionNumber[i],
          date: recent.filingDate[i],
          primaryDoc: recent.primaryDocument[i],
        })
      }
    }

    if (form4Filings.length === 0) return []

    // 2. Parse each Form 4 XML
    const allTrades: InsiderTrade[] = []

    for (const filing of form4Filings) {
      try {
        const accClean = filing.accession.replace(/-/g, '')
        // Find the raw XML (not XSLT version)
        const xmlFilename = filing.primaryDoc.includes('xsl')
          ? filing.primaryDoc.replace(/xslF345X\d+\//, '')
          : filing.primaryDoc

        const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accClean}/${xmlFilename}`
        const xmlRes = await fetch(xmlUrl, { headers: { 'User-Agent': EDGAR_UA } })

        if (!xmlRes.ok) continue

        const xml = await xmlRes.text()
        const trades = parseForm4Xml(xml, filing.date, filing.accession, cik)
        allTrades.push(...trades)

        // Rate limit: SEC allows 10 req/sec
        await new Promise(r => setTimeout(r, 120))
      } catch {
        // Skip individual filing errors
      }
    }

    // Sort by date descending
    allTrades.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))

    // Cache
    cache.set(key, { data: allTrades, ts: Date.now() })

    return allTrades.slice(0, limit)
  } catch (error) {
    console.error(`[InsiderTrades] Error for ${key}:`, error)
    return []
  }
}
