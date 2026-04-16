// /api/portfolio/historical-prices
// Holt historische Schlusskurse für {symbol, date}-Paare — wird primär für
// Depotübertrag-Transaktionen genutzt, bei denen die Broker-Abrechnung keinen
// Einstandskurs mitliefert (ING ist hier der Hauptfall). Als Einstandskurs
// nehmen wir dann den Close am Transfer-Datum (oder nächst-früheren Börsentag).
//
// Request:
//   POST { items: [{ symbol: 'VGWL.DE', date: '2024-10-17' }, ...] }
// Response:
//   { results: { 'VGWL.DE|2024-10-17': 128.55, ... } }
// Nicht gefundene Paare fehlen im results-Objekt (kein Fehler).

import { NextResponse } from 'next/server'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'

const FMP_API_KEY = process.env.FMP_API_KEY

// GBP→EUR Rate für die historische Umrechnung — approximativ.
// Genau genug für Einstandspreis-Zwecke (kleinerer Fehler als die Monatsvola).
const GBP_EUR_RATE = 1.17

interface HistoricalEntry {
  date: string
  close: number
}

interface RequestItem {
  symbol: string
  date: string // ISO YYYY-MM-DD
}

/**
 * Holt den Schlusskurs für ein Symbol an einem spezifischen Datum.
 * Wenn der Tag kein Handelstag war, nehmen wir den nächsten früheren Close.
 *
 * Wir fetchen eine Range von +-14 Tagen um das Datum, so treffen wir auch
 * lange Wochenenden/Feiertage sicher. FMP-Historical-Endpoints sind robust,
 * liefern aber je nach Symbol unterschiedliche Formate zurück.
 */
async function fetchCloseForDate(symbol: string, date: string): Promise<number | null> {
  if (!FMP_API_KEY) return null

  // Range: date ± 14 Tage
  const target = new Date(date + 'T00:00:00Z')
  const from = new Date(target.getTime() - 14 * 86400_000).toISOString().slice(0, 10)
  const to = new Date(target.getTime() + 14 * 86400_000).toISOString().slice(0, 10)

  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const data = await r.json()

    const historical: HistoricalEntry[] | undefined = data?.historical
    if (!Array.isArray(historical) || historical.length === 0) return null

    // Historical ist absteigend sortiert (neueste zuerst). Wir suchen den
    // nächst-früheren Handelstag ≤ target.
    const targetIso = date
    let best: HistoricalEntry | null = null
    for (const e of historical) {
      if (e.date <= targetIso) {
        best = e
        break // absteigend sortiert → erster Treffer ist der neueste ≤ target
      }
    }
    // Fallback: wenn kein Tag ≤ target existiert, nimm den frühesten im Zeitfenster
    if (!best) best = historical[historical.length - 1]

    return typeof best?.close === 'number' && best.close > 0 ? best.close : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { items } = (await request.json()) as { items?: RequestItem[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ results: {} })
    }

    // Deduplizieren: ein FMP-Call pro Symbol, gibt historische Range zurück,
    // wir ziehen daraus mehrere Datums-Werte auf einmal. Das spart Calls bei
    // Usern mit vielen Transfers desselben ETFs an unterschiedlichen Tagen.
    const bySymbol = new Map<string, Set<string>>()
    for (const item of items) {
      if (!item.symbol || !item.date) continue
      if (!bySymbol.has(item.symbol)) bySymbol.set(item.symbol, new Set())
      bySymbol.get(item.symbol)!.add(item.date)
    }

    const results: Record<string, number> = {}

    // Pro Symbol einen Call mit ausreichend großer Range (um alle Datums abzudecken)
    for (const [symbol, dates] of bySymbol) {
      const sortedDates = [...dates].sort()
      const earliest = sortedDates[0]
      const latest = sortedDates[sortedDates.length - 1]

      const from = new Date(new Date(earliest + 'T00:00:00Z').getTime() - 14 * 86400_000)
        .toISOString()
        .slice(0, 10)
      const to = new Date(new Date(latest + 'T00:00:00Z').getTime() + 14 * 86400_000)
        .toISOString()
        .slice(0, 10)

      // Falls FMP für den XETRA-Ticker keine historischen Daten hat (VHYL.DE ist so
      // ein Fall), nutzen wir den kuratierten Alternativ-Ticker aus tickerFallbacks.ts.
      // Bei GBp-Preisen wird zusätzlich /100 × GBP-EUR-Rate gerechnet.
      const fallback = EXCHANGE_FALLBACKS[symbol]
      const fetchSymbol = fallback?.symbol || symbol
      const convert = (raw: number): number => {
        if (!fallback) return raw
        if (fallback.exchange === 'GBp') return (raw / 100) * GBP_EUR_RATE
        if (fallback.exchange === 'GBP') return raw * GBP_EUR_RATE
        return raw // EUR: direkt
      }

      const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(fetchSymbol)}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
      try {
        const r = await fetch(url)
        if (!r.ok) continue
        const data = await r.json()
        const historical: HistoricalEntry[] | undefined = data?.historical
        if (!Array.isArray(historical) || historical.length === 0) {
          // Fallback: pro Datum einzeln — wenn die Range-Variante nichts liefert,
          // könnte das Symbol zu alt/klein sein. Dann probieren wir jeweils eng.
          for (const d of dates) {
            const close = await fetchCloseForDate(symbol, d)
            if (close !== null) results[`${symbol}|${d}`] = close
          }
          continue
        }

        // Pro angefragtem Datum den passenden Schlusskurs finden + ggf. umrechnen
        for (const d of dates) {
          let best: HistoricalEntry | null = null
          for (const e of historical) {
            if (e.date <= d) {
              best = e
              break
            }
          }
          if (!best) best = historical[historical.length - 1]
          if (typeof best?.close === 'number' && best.close > 0) {
            results[`${symbol}|${d}`] = convert(best.close)
          }
        }
      } catch {
        // FMP-Ausfall pro Symbol — Rest geht weiter, UI zeigt dann price=0
        continue
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('historical-prices error:', error)
    return NextResponse.json({ error: 'Fehler beim Abrufen historischer Kurse' }, { status: 500 })
  }
}
