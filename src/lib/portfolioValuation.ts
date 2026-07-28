// Zentrale Portfolio-Bewertung.
//
// Einzige Quelle der Wahrheit für „Kurs → EUR-Wert je Depot". Workspace
// (usePortfolio), Dashboard und Depot-Verwaltung nutzen dieselbe Logik, damit
// die angezeigten Depotwerte nicht mehr auseinanderlaufen.
//
// Wichtig: der in der DB gespeicherte `current_price` wird auf der Website nie
// aktualisiert (nur Mobile-App/Scripts schreiben ihn). Deshalb werden immer
// zuerst Live-Kurse verwendet und nur ersatzweise auf `current_price` bzw. den
// Einstandspreis zurückgefallen.

import { detectTickerCurrency } from '@/lib/fmp'

export type ValuationHolding = {
  portfolio_id: string
  symbol: string
  quantity: number
  purchase_price: number
  current_price?: number | null
}

export type DepotValuation = { value: number; cost: number; count: number }

// Kurs (Börsenwährung) in EUR umrechnen.
// EUR: unverändert · GBP (.L, kommt als GBX/Pence): ÷100 × Rate · USD: × Rate · sonst: unkonvertiert.
export function convertPriceToEur(
  rawPrice: number,
  currency: string,
  rates: { usdToEurRate: number | null; gbpToEurRate: number | null }
): number {
  if (currency === 'EUR') return rawPrice
  if (currency === 'GBP' && rates.gbpToEurRate) return (rawPrice / 100) * rates.gbpToEurRate
  if (currency === 'USD' && rates.usdToEurRate) return rawPrice * rates.usdToEurRate
  return rawPrice
}

// EUR-Wechselkurs (EUR pro Einheit Fremdwährung) über die API-Route holen.
export async function fetchEurRate(from: 'USD' | 'GBP'): Promise<number | null> {
  try {
    const res = await fetch(`/api/exchange-rate?from=${from}&to=EUR`)
    if (res.ok) {
      const json = await res.json()
      if (json.rate && !isNaN(json.rate) && json.rate > 0) return Number(json.rate)
    }
  } catch { /* Fallback: keine Umrechnung */ }
  return null
}

// Bewertet Holdings je Depot in EUR. Reihenfolge Live-Kurs → gespeicherter
// current_price → Einstandspreis, damit der Wert exakt dem Workspace entspricht.
export async function valuateHoldingsByPortfolio(
  holdings: ValuationHolding[]
): Promise<Map<string, DepotValuation>> {
  const result = new Map<string, DepotValuation>()
  if (holdings.length === 0) return result

  const symbols = new Set<string>()
  const currencies = new Set<string>()
  for (const h of holdings) {
    symbols.add(h.symbol)
    currencies.add(detectTickerCurrency(h.symbol))
  }

  // Live-Kurse für alle Symbole in einem Batch-Request
  const liveQuotes = new Map<string, number>()
  try {
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent([...symbols].join(','))}`)
    if (res.ok) {
      const quotes = await res.json()
      if (Array.isArray(quotes)) {
        for (const q of quotes) {
          if (q?.symbol && q.price > 0) liveQuotes.set(q.symbol, q.price)
        }
      }
    }
  } catch { /* Fallback: current_price / Einstand */ }

  const usdToEurRate = currencies.has('USD') ? await fetchEurRate('USD') : null
  const gbpToEurRate = currencies.has('GBP') ? await fetchEurRate('GBP') : null

  for (const h of holdings) {
    const qty = Number(h.quantity) || 0
    const purchasePrice = Number(h.purchase_price) || 0
    const live = liveQuotes.get(h.symbol)
    const stored = Number(h.current_price)
    const rawPrice = live && live > 0 ? live : stored && stored > 0 ? stored : null

    // Marktwert je Anteil in EUR; ohne Kurs Fallback auf Einstandspreis (bereits EUR)
    const priceEur = rawPrice
      ? convertPriceToEur(rawPrice, detectTickerCurrency(h.symbol), { usdToEurRate, gbpToEurRate })
      : purchasePrice

    const entry = result.get(h.portfolio_id) || { value: 0, cost: 0, count: 0 }
    entry.value += priceEur * qty
    entry.cost += purchasePrice * qty
    entry.count += 1
    result.set(h.portfolio_id, entry)
  }

  return result
}
