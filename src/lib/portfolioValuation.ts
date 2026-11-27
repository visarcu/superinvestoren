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

export type EurRates = {
  usdToEurRate: number | null
  gbpToEurRate: number | null
  /** Weitere Quote-Währungen (JPY, CHF, CAD, AUD, …) → EUR pro Einheit */
  byCurrency?: Record<string, number | null>
}

// Kurs (Börsenwährung) in EUR umrechnen.
// EUR: unverändert · GBP (.L, kommt als GBX/Pence): ÷100 × Rate · USD: × Rate ·
// sonst (JPY/CHF/CAD/AUD …): × Rate aus byCurrency. Fehlt die Rate: null.
// Die Bewertung nimmt dann den Einstand, statt Pence als Euro (85-fach) oder
// einen JPY-Kurs unkonvertiert (~170-fach) zu zeigen.
export function convertPriceToEurStrict(
  rawPrice: number,
  currency: string,
  rates: EurRates
): number | null {
  if (currency === 'EUR') return rawPrice
  const rate =
    currency === 'USD' ? rates.usdToEurRate ?? rates.byCurrency?.USD ?? null
    : currency === 'GBP' ? rates.gbpToEurRate ?? rates.byCurrency?.GBP ?? null
    : rates.byCurrency?.[currency] ?? null
  if (!rate || rate <= 0) return null
  return currency === 'GBP' ? (rawPrice / 100) * rate : rawPrice * rate
}

/** Wie convertPriceToEurStrict, ohne Rate aber ein Näherungswert statt null (Pence wenigstens in Pfund) */
export function convertPriceToEur(
  rawPrice: number,
  currency: string,
  rates: EurRates
): number {
  const strict = convertPriceToEurStrict(rawPrice, currency, rates)
  if (strict !== null) return strict
  return currency === 'GBP' ? rawPrice / 100 : rawPrice
}

// EUR-Wechselkurs (EUR pro Einheit Fremdwährung) über die API-Route holen.
export async function fetchEurRate(from: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/exchange-rate?from=${from}&to=EUR`)
    if (res.ok) {
      const json = await res.json()
      if (json.rate && !isNaN(json.rate) && json.rate > 0) return Number(json.rate)
    }
  } catch { /* Fallback: keine Umrechnung */ }
  return null
}

/** Alle EUR-Raten für die vorkommenden Quote-Währungen parallel laden. */
export async function fetchEurRatesFor(currencies: Iterable<string>): Promise<EurRates> {
  const unique = [...new Set(currencies)].filter(c => c && c !== 'EUR')
  const entries = await Promise.all(
    unique.map(async currency => [currency, await fetchEurRate(currency)] as const)
  )
  const byCurrency: Record<string, number | null> = {}
  for (const [currency, rate] of entries) byCurrency[currency] = rate
  return {
    usdToEurRate: byCurrency['USD'] ?? null,
    gbpToEurRate: byCurrency['GBP'] ?? null,
    byCurrency,
  }
}

// Bewertet Holdings je Depot in EUR: Live-Kurs, sonst Einstandspreis, damit der
// Wert exakt dem Workspace entspricht.
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

  const rates = await fetchEurRatesFor(currencies)

  for (const h of holdings) {
    const qty = Number(h.quantity) || 0
    const purchasePrice = Number(h.purchase_price) || 0
    // Nur Live-Kurse: Der gespeicherte current_price wird auf der Website nie
    // aktualisiert; mit ihm widersprachen sich Seitenleiste und Kopfzahl, sobald
    // ein Kurs fehlte (dort gilt der Einstand, siehe valuateHolding).
    const live = liveQuotes.get(h.symbol)
    const rawPrice = live && live > 0 ? live : null

    // Marktwert je Anteil in EUR; ohne Kurs oder Wechselkurs Fallback auf den
    // Einstandspreis (bereits EUR)
    const priceEur =
      (rawPrice ? convertPriceToEurStrict(rawPrice, detectTickerCurrency(h.symbol), rates) : null) ?? purchasePrice

    const entry = result.get(h.portfolio_id) || { value: 0, cost: 0, count: 0 }
    entry.value += priceEur * qty
    entry.cost += purchasePrice * qty
    entry.count += 1
    result.set(h.portfolio_id, entry)
  }

  return result
}
