// src/lib/splitsService.ts
// Stock-Splits-Service: DB-First mit EODHD-Refresh.
//
// Splits sind historisch immutable → einmal in DB gecached, nicht mehr neu holen.
// Refresh nur 1× pro Tag pro Symbol (in-memory Marker), um auch neue Splits
// mitzubekommen, ohne EODHD bei jedem Request zu treffen.
//
// Quelle: EODHD /api/splits/{TICKER.EXCHANGE}
// Response: [{ date: "YYYY-MM-DD", split: "4.000000/1.000000" }, ...]

import { prisma } from '@/lib/prisma'
import { toEodhdSymbol } from '@/lib/eodhdService'

export interface StockSplit {
  symbol: string
  date: string // YYYY-MM-DD
  numerator: number
  denominator: number
  source: string
}

// In-memory: wann wurde welches Symbol zuletzt gegen EODHD geprüft?
// Verhindert Refresh-Spam bei Tickern ohne Splits (DB ist dort leer, also kein
// Anker für Freshness-Check über fetchedAt).
const lastFetchAttempt = new Map<string, number>()
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function getStockSplits(symbol: string): Promise<StockSplit[]> {
  const sym = symbol.toUpperCase()

  const lastAttempt = lastFetchAttempt.get(sym) ?? 0
  const isFresh = Date.now() - lastAttempt < REFRESH_TTL_MS

  if (!isFresh) {
    await refreshFromEodhd(sym)
    lastFetchAttempt.set(sym, Date.now())
  }

  const rows = await prisma.stockSplit.findMany({
    where: { symbol: sym },
    orderBy: { splitDate: 'desc' },
  })

  return rows.map((r) => ({
    symbol: r.symbol,
    date: r.splitDate.toISOString().slice(0, 10),
    numerator: r.numerator,
    denominator: r.denominator,
    source: r.source,
  }))
}

async function refreshFromEodhd(symbol: string): Promise<void> {
  const apiKey = process.env.EODHD_API_KEY
  if (!apiKey) {
    console.warn('[splitsService] EODHD_API_KEY not set, skipping refresh')
    return
  }

  const eodhdSymbol = toEodhdSymbol(symbol)
  const url = `https://eodhd.com/api/splits/${eodhdSymbol}?api_token=${apiKey}&fmt=json`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      console.warn(`[splitsService] EODHD ${res.status} for ${eodhdSymbol}`)
      return
    }
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return

    for (const entry of data) {
      const parsed = parseEodhdSplit(entry?.split)
      if (!parsed || !entry?.date) continue

      const splitDate = new Date(entry.date)
      if (Number.isNaN(splitDate.getTime())) continue

      await prisma.stockSplit.upsert({
        where: {
          symbol_splitDate: { symbol, splitDate },
        },
        update: {
          numerator: parsed.numerator,
          denominator: parsed.denominator,
          source: 'eodhd',
          fetchedAt: new Date(),
        },
        create: {
          symbol,
          splitDate,
          numerator: parsed.numerator,
          denominator: parsed.denominator,
          source: 'eodhd',
        },
      })
    }
  } catch (err) {
    console.error(`[splitsService] refresh failed for ${symbol}:`, err)
  }
}

// EODHD-Format "4.000000/1.000000" oder "4/1" → { numerator: 4, denominator: 1 }
function parseEodhdSplit(split: unknown): { numerator: number; denominator: number } | null {
  if (typeof split !== 'string') return null
  const parts = split.split('/')
  if (parts.length !== 2) return null
  const num = parseFloat(parts[0])
  const den = parseFloat(parts[1])
  if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0) return null
  return { numerator: Math.round(num), denominator: Math.round(den) }
}

/**
 * Kumulativer Split-Faktor zwischen zwei Daten.
 * Multipliziert numerator/denominator aller Splits in (fromDate, toDate].
 *
 * Use-Case: Historische Dividende vor fromDate auf heutige Split-Basis bringen.
 * z.B. AAPL Q-Div 2020 = $0.82, 4:1 Split Aug 2020 → adjusted = $0.82 / 4 = $0.205
 */
export async function getCumulativeSplitFactor(
  symbol: string,
  fromDate: Date,
  toDate: Date = new Date(),
): Promise<number> {
  const splits = await getStockSplits(symbol)
  let factor = 1
  for (const s of splits) {
    const sd = new Date(s.date)
    if (sd > fromDate && sd <= toDate) {
      factor *= s.numerator / s.denominator
    }
  }
  return factor
}
