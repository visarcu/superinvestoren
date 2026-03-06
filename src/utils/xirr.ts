// src/utils/xirr.ts - XIRR (Extended Internal Rate of Return) Berechnung

export interface Cashflow {
  amount: number  // negativ = Auszahlung (Kauf), positiv = Einnahme (Verkauf/aktueller Wert)
  date: Date
}

/**
 * Berechnet die XIRR (annualisierte Rendite) für unregelmäßige Cashflows.
 * Löst: Σ CFᵢ / (1 + r)^(tᵢ / 365.25) = 0
 *
 * @returns Annualisierte Rendite als Dezimalzahl (z.B. 0.12 = 12%) oder null bei Fehler
 */
export function calculateXIRR(cashflows: Cashflow[], guess: number = 0.1): number | null {
  if (cashflows.length < 2) return null

  const hasNeg = cashflows.some(cf => cf.amount < 0)
  const hasPos = cashflows.some(cf => cf.amount > 0)
  if (!hasNeg || !hasPos) return null

  // Minimale Haltedauer: 7 Tage (verhindert extreme annualisierte Werte)
  const dates = cashflows.map(cf => cf.date.getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const daysDiff = (maxDate - minDate) / (24 * 60 * 60 * 1000)
  if (daysDiff < 7) return null

  const d0 = minDate
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

  function npv(rate: number): number {
    return cashflows.reduce((sum, cf) => {
      const years = (cf.date.getTime() - d0) / MS_PER_YEAR
      return sum + cf.amount / Math.pow(1 + rate, years)
    }, 0)
  }

  function dnpv(rate: number): number {
    return cashflows.reduce((sum, cf) => {
      const years = (cf.date.getTime() - d0) / MS_PER_YEAR
      return sum - years * cf.amount / Math.pow(1 + rate, years + 1)
    }, 0)
  }

  // Newton-Raphson
  let rate = guess
  for (let i = 0; i < 100; i++) {
    const f = npv(rate)
    const df = dnpv(rate)
    if (Math.abs(df) < 1e-10) break
    const newRate = rate - f / df
    if (Math.abs(newRate - rate) < 1e-7) return newRate
    rate = newRate
    if (rate < -0.99) rate = -0.99
    if (rate > 10) rate = 10
  }

  // Fallback: Bisection
  let lo = -0.99
  let hi = 10
  if (npv(lo) < 0) [lo, hi] = [hi, lo] // npv(lo) soll positiv sein

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) lo = mid
    else hi = mid
    if (Math.abs(hi - lo) < 1e-7) return mid
  }

  return null
}
