// src/lib/splitsService.ts
// Stock-Splits-Service: DB-First mit FMP-Refresh.
//
// Splits sind historisch immutable → einmal in DB gecached, nicht mehr neu holen.
// Refresh nur 1× pro Tag pro Symbol (in-memory Marker), um auch neue Splits
// mitzubekommen, ohne FMP bei jedem Request zu treffen.
//
// Quelle: FMP /stable/splits?symbol={TICKER} — Symbole in unserer Schreibweise
// (AAPL, SAP.DE), die FMP unverändert versteht.

import { prisma } from '@/lib/prisma'
import { fetchFmpSplits } from '@/lib/marketData/splits'

export interface StockSplit {
  symbol: string
  date: string // YYYY-MM-DD
  numerator: number
  denominator: number
  source: string
}

// In-memory: wann wurde welches Symbol zuletzt gegen FMP geprüft?
// Verhindert Refresh-Spam bei Tickern ohne Splits (DB ist dort leer, also kein
// Anker für Freshness-Check über fetchedAt).
const lastFetchAttempt = new Map<string, number>()
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function getStockSplits(symbol: string): Promise<StockSplit[]> {
  const sym = symbol.toUpperCase()

  const lastAttempt = lastFetchAttempt.get(sym) ?? 0
  const isFresh = Date.now() - lastAttempt < REFRESH_TTL_MS

  if (!isFresh) {
    await refreshFromFmp(sym)
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

async function refreshFromFmp(symbol: string): Promise<void> {
  if (!process.env.FMP_API_KEY) {
    console.warn('[splitsService] FMP_API_KEY not set, skipping refresh')
    return
  }

  try {
    const splits = await fetchFmpSplits(symbol)

    for (const entry of splits) {
      const ratio = toIntegerRatio(entry.numerator, entry.denominator)
      if (!ratio) continue

      const splitDate = new Date(entry.date)
      if (Number.isNaN(splitDate.getTime())) continue

      await prisma.stockSplit.upsert({
        where: {
          symbol_splitDate: { symbol, splitDate },
        },
        update: {
          numerator: ratio.numerator,
          denominator: ratio.denominator,
          source: 'fmp',
          fetchedAt: new Date(),
        },
        create: {
          symbol,
          splitDate,
          numerator: ratio.numerator,
          denominator: ratio.denominator,
          source: 'fmp',
        },
      })
    }
  } catch (err) {
    console.error(`[splitsService] refresh failed for ${symbol}:`, err)
  }
}

// Die DB speichert ganzzahlige Verhältnisse; FMP liefert vereinzelt Dezimalwerte
// (1.5/1) → auf ganze Zahlen skalieren (3/2).
function toIntegerRatio(numerator: number, denominator: number): { numerator: number; denominator: number } | null {
  if (!(numerator > 0) || !(denominator > 0)) return null
  for (let scale = 1; scale <= 10_000; scale *= 10) {
    const num = numerator * scale
    const den = denominator * scale
    if (Math.abs(num - Math.round(num)) < 1e-6 && Math.abs(den - Math.round(den)) < 1e-6) {
      return { numerator: Math.round(num), denominator: Math.round(den) }
    }
  }
  return null
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
