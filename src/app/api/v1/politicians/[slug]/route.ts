// GET /api/v1/politicians/[slug] — Einzelner Politiker mit allen Trades + Statistiken
// Quelle: STOCK Act Disclosures, eigene Daten
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import politicianIndex from '@/data/politician-trades/index.json'

interface Trade {
  disclosureYear: string; disclosureDate: string; transactionDate: string
  owner: string; ticker: string; assetDescription: string
  type: string; typeRaw: string; amount: string
  representative: string; district: string; link: string
  capitalGainsOver200USD: string; slug: string; state: string; chamber: string
}

interface IndexEntry {
  slug: string; name: string; chamber: string; state: string
  tradeCount: number; lastTradeDate: string; recentTickers: string[]
  bioguideId?: string; photoUrl?: string; party?: string
}

// Betrag-Range in Mittelwert umwandeln für Volumen-Schätzung
function amountMidpoint(amount: string): number {
  const ranges: Record<string, number> = {
    '$1,001 - $15,000': 8000,
    '$15,001 - $50,000': 32500,
    '$50,001 - $100,000': 75000,
    '$100,001 - $250,000': 175000,
    '$250,001 - $500,000': 375000,
    '$500,001 - $1,000,000': 750000,
    '$1,000,001 - $5,000,000': 3000000,
    '$5,000,001 - $25,000,000': 15000000,
    '$25,000,001 - $50,000,000': 37500000,
    'Over $50,000,000': 75000000,
  }
  return ranges[amount] || 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug?.toLowerCase()
  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 })
  }

  // Index-Eintrag finden
  const indexEntry = (politicianIndex as IndexEntry[]).find(p => p.slug === slug)
  if (!indexEntry) {
    return NextResponse.json({ error: `Politician '${slug}' not found` }, { status: 404 })
  }

  // Trade-Datei laden
  let trades: Trade[] = []
  try {
    const filePath = path.join(process.cwd(), 'src/data/politician-trades', `${slug}.json`)
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    trades = data.trades || []
  } catch {
    // Keine Trade-Datei vorhanden
  }

  // Statistiken berechnen
  const purchases = trades.filter(t => t.type === 'purchase')
  const sales = trades.filter(t => t.type === 'sale')
  const uniqueTickers = [...new Set(trades.map(t => t.ticker).filter(Boolean))]

  // Geschätztes Handelsvolumen
  const totalVolume = trades.reduce((sum, t) => sum + amountMidpoint(t.amount), 0)

  // Top Ticker nach Häufigkeit
  const tickerCounts: Record<string, { count: number; buys: number; sells: number; volume: number }> = {}
  for (const t of trades) {
    if (!t.ticker) continue
    if (!tickerCounts[t.ticker]) tickerCounts[t.ticker] = { count: 0, buys: 0, sells: 0, volume: 0 }
    tickerCounts[t.ticker].count++
    tickerCounts[t.ticker].volume += amountMidpoint(t.amount)
    if (t.type === 'purchase') tickerCounts[t.ticker].buys++
    else tickerCounts[t.ticker].sells++
  }
  const topTickers = Object.entries(tickerCounts)
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 15)
    .map(([ticker, data]) => ({ ticker, ...data }))

  // Hilfsfunktion: Jahr aus verschiedenen Datumsformaten extrahieren
  function extractYear(dateStr: string): string {
    if (!dateStr) return ''
    // YYYY-MM-DD
    if (/^\d{4}-/.test(dateStr)) return dateStr.slice(0, 4)
    // MM/DD/YYYY
    const parts = dateStr.split('/')
    if (parts.length === 3 && parts[2].length === 4) return parts[2]
    return dateStr.slice(0, 4)
  }

  // Trades nach Jahr
  const byYear: Record<string, { buys: number; sells: number; volume: number }> = {}
  for (const t of trades) {
    const year = extractYear(t.transactionDate) || t.disclosureYear
    if (!year || year.length !== 4) continue
    if (!byYear[year]) byYear[year] = { buys: 0, sells: 0, volume: 0 }
    byYear[year].volume += amountMidpoint(t.amount)
    if (t.type === 'purchase') byYear[year].buys++
    else byYear[year].sells++
  }
  const tradesByYear = Object.entries(byYear)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, data]) => ({ year, ...data, total: data.buys + data.sells }))

  // Datum normalisieren für Vergleich
  function normalizeDate(d: string): string {
    if (!d) return ''
    if (/^\d{4}-/.test(d)) return d // Already YYYY-MM-DD
    const parts = d.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    return d
  }

  // Letzter Trade
  const lastTrade = trades.length > 0
    ? trades.reduce((a, b) => normalizeDate(a.transactionDate) > normalizeDate(b.transactionDate) ? a : b)
    : null

  return NextResponse.json({
    slug: indexEntry.slug,
    name: indexEntry.name,
    chamber: indexEntry.chamber,
    state: indexEntry.state,
    party: indexEntry.party || null,
    photoUrl: indexEntry.photoUrl || null,
    bioguideId: indexEntry.bioguideId || null,

    // Statistiken
    stats: {
      totalTrades: trades.length,
      purchases: purchases.length,
      sales: sales.length,
      uniqueStocks: uniqueTickers.length,
      estimatedVolume: totalVolume,
      estimatedVolumeFormatted: totalVolume >= 1e6
        ? `$${(totalVolume / 1e6).toFixed(1)}M`
        : `$${(totalVolume / 1e3).toFixed(0)}K`,
      lastTradeDate: lastTrade ? normalizeDate(lastTrade.transactionDate) : null,
      firstTradeDate: trades.length > 0
        ? normalizeDate(trades.reduce((a, b) => normalizeDate(a.transactionDate) < normalizeDate(b.transactionDate) ? a : b).transactionDate)
        : null,
    },

    // Aggregationen
    topTickers,
    tradesByYear,

    // Alle Trades (sortiert nach Datum, neueste zuerst)
    trades: trades
      .sort((a, b) => normalizeDate(b.transactionDate).localeCompare(normalizeDate(a.transactionDate)))
      .map(t => ({
        transactionDate: normalizeDate(t.transactionDate),
        disclosureDate: normalizeDate(t.disclosureDate),
        ticker: t.ticker,
        asset: t.assetDescription,
        type: t.type,
        amount: t.amount,
        owner: t.owner,
        capitalGains: t.capitalGainsOver200USD === 'True',
        link: t.link,
      })),

    source: 'stock-act-disclosures',
    fetchedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
  })
}
