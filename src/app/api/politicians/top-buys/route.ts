// src/app/api/politicians/top-buys/route.ts
// Aggregiert die meistgekauften Aktien von US-Kongressmitgliedern im letzten Quartal

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'src/data/politician-trades')
const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE = 'https://financialmodelingprep.com/api/v4'

interface PoliticianTrade {
  transactionDate: string
  disclosureDate: string
  ticker: string
  assetDescription: string
  type: string
  amount: string
  representative: string
  slug: string
}

export interface TopPoliticianBuy {
  ticker: string
  companyName: string
  politicianCount: number
  politicians: string[]
  totalValueMin: number
  totalValueMax: number
  transactionCount: number
}

// Parst eine Betragsspanne in Min/Max-Werte (USD)
function parseAmountRange(amount: string): { min: number; max: number } {
  if (!amount) return { min: 0, max: 0 }
  // Entferne $, Kommas und Leerzeichen
  const clean = amount.replace(/[\$,\s]/g, '')
  const match = clean.match(/(\d+)-(\d+)/)
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) }
  }
  // Einzelner Wert oder "over X"
  const single = clean.match(/over(\d+)/)
  if (single) {
    return { min: parseInt(single[1]), max: parseInt(single[1]) * 2 }
  }
  const num = parseInt(clean.replace(/\D/g, ''))
  return { min: num || 0, max: num || 0 }
}

function getQuarterCutoff(): string {
  // Letztes abgeschlossenes Quartal berechnen
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12

  // Aktuelles Quartal bestimmen, dann eins zurückgehen
  let cutoffYear = year
  let cutoffMonth: number

  if (month <= 3) {
    // Q1 aktuell -> Q4 letztes Jahr
    cutoffYear = year - 1
    cutoffMonth = 10 // Oktober
  } else if (month <= 6) {
    // Q2 aktuell -> Q1 dieses Jahr
    cutoffMonth = 1 // Januar
  } else if (month <= 9) {
    // Q3 aktuell -> Q2 dieses Jahr
    cutoffMonth = 4 // April
  } else {
    // Q4 aktuell -> Q3 dieses Jahr
    cutoffMonth = 7 // Juli
  }

  return `${cutoffYear}-${String(cutoffMonth).padStart(2, '0')}-01`
}

// FMP Senate-Trades laden (ergänzt lokale Daten mit neuesten Trades)
async function fetchFmpTrades(page: number): Promise<PoliticianTrade[]> {
  if (!FMP_API_KEY) return []
  try {
    const url = `${FMP_BASE}/senate-disclosure-rss-feed?page=${page}&apikey=${FMP_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return []
    const raw = await res.json()
    if (!Array.isArray(raw)) return []
    return raw.map((t: any) => ({
      transactionDate: t.transactionDate || '',
      disclosureDate: t.disclosureDate || '',
      ticker: t.ticker || '',
      assetDescription: t.assetDescription || '',
      type: t.type || '',
      amount: t.amount || '',
      representative: t.representative || '',
      slug: (t.representative || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
    }))
  } catch {
    return []
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return NextResponse.json({ topBuys: [] })
    }

    const cutoff = getQuarterCutoff()

    // Alle Politician-Dateien einlesen (außer index.json)
    const files = fs.readdirSync(DATA_DIR).filter(
      f => f.endsWith('.json') && f !== 'index.json'
    )

    // Ticker -> Aggregatdaten
    const tickerMap = new Map<string, {
      companyName: string
      politicians: Set<string>
      totalValueMin: number
      totalValueMax: number
      transactionCount: number
    }>()

    // Deduplizierung: Set von "transactionDate-ticker-type" Keys
    const seenTrades = new Set<string>()

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8')
        const data = JSON.parse(raw)
        const trades: PoliticianTrade[] = data.trades || []

        for (const trade of trades) {
          const date = trade.transactionDate || trade.disclosureDate
          if (!date || date < cutoff) continue

          const type = (trade.type || '').toLowerCase()
          if (!type.includes('purchase') && type !== 'buy') continue

          const ticker = trade.ticker?.trim()
          if (!ticker || ticker.length > 10 || ticker.includes(' ')) continue

          const politicianName = trade.representative || data.name || ''
          const dedupeKey = `${date}-${ticker}-${type}-${politicianName}`
          seenTrades.add(dedupeKey)

          const { min, max } = parseAmountRange(trade.amount || '')

          if (!tickerMap.has(ticker)) {
            tickerMap.set(ticker, {
              companyName: trade.assetDescription || ticker,
              politicians: new Set(),
              totalValueMin: 0,
              totalValueMax: 0,
              transactionCount: 0,
            })
          }

          const entry = tickerMap.get(ticker)!
          if (politicianName) entry.politicians.add(politicianName)
          entry.totalValueMin += min
          entry.totalValueMax += max
          entry.transactionCount++

          // Firmennamen aktualisieren wenn vorhanden
          if (trade.assetDescription && trade.assetDescription !== ticker) {
            entry.companyName = trade.assetDescription
          }
        }
      } catch {
        // Einzelne Datei-Fehler ignorieren
      }
    }

    // FMP-Trades mergen (neueste Trades die noch nicht lokal sind)
    const fmpPages = await Promise.all([fetchFmpTrades(0), fetchFmpTrades(1)])
    const fmpTrades = [...fmpPages[0], ...fmpPages[1]]

    for (const trade of fmpTrades) {
      const date = trade.transactionDate || trade.disclosureDate
      if (!date || date < cutoff) continue

      const type = (trade.type || '').toLowerCase()
      if (!type.includes('purchase') && type !== 'buy') continue

      const ticker = trade.ticker?.trim()
      if (!ticker || ticker.length > 10 || ticker.includes(' ')) continue

      const politicianName = trade.representative || ''
      const dedupeKey = `${date}-${ticker}-${type}-${politicianName}`
      if (seenTrades.has(dedupeKey)) continue
      seenTrades.add(dedupeKey)

      const { min, max } = parseAmountRange(trade.amount || '')

      if (!tickerMap.has(ticker)) {
        tickerMap.set(ticker, {
          companyName: trade.assetDescription || ticker,
          politicians: new Set(),
          totalValueMin: 0,
          totalValueMax: 0,
          transactionCount: 0,
        })
      }

      const entry = tickerMap.get(ticker)!
      if (politicianName) entry.politicians.add(politicianName)
      entry.totalValueMin += min
      entry.totalValueMax += max
      entry.transactionCount++

      if (trade.assetDescription && trade.assetDescription !== ticker) {
        entry.companyName = trade.assetDescription
      }
    }

    // Sortieren nach Anzahl einzigartiger Politiker, dann Transaktionen
    const sorted: TopPoliticianBuy[] = Array.from(tickerMap.entries())
      .map(([ticker, data]) => ({
        ticker,
        companyName: data.companyName,
        politicianCount: data.politicians.size,
        politicians: Array.from(data.politicians).slice(0, 5),
        totalValueMin: data.totalValueMin,
        totalValueMax: data.totalValueMax,
        transactionCount: data.transactionCount,
      }))
      .sort((a, b) => {
        if (b.politicianCount !== a.politicianCount) {
          return b.politicianCount - a.politicianCount
        }
        return b.transactionCount - a.transactionCount
      })
      .slice(0, 10)

    return NextResponse.json({
      topBuys: sorted,
      cutoff,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Politicians top-buys error:', err)
    return NextResponse.json({ topBuys: [] })
  }
}
