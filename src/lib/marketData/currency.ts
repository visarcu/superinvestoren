// src/lib/marketData/currency.ts
// Umrechnung zwischen Notierungswährungen.
//
// 'GBX' (Pence) ist keine eigene Währung, sondern GBP/100 — britische Kurse
// kommen bei allen drei Anbietern in Pence.

import { getExchangeRate } from '@/lib/exchangeRates'

const PENCE_FACTOR = 0.01

function split(currency: string): { base: string; factor: number } {
  const cur = (currency || '').toUpperCase()
  if (cur === 'GBX' || cur === 'GBP_PENCE' || cur === 'GBP-PENCE') {
    return { base: 'GBP', factor: PENCE_FACTOR }
  }
  return { base: cur, factor: 1 }
}

/**
 * Rechnet einen Betrag um. Gibt null zurück, wenn kein Kurs verfügbar ist —
 * eine unumgerechnete Zahl wäre schlimmer als gar keine, weil sie im Depot
 * als echter Wert erscheinen würde.
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (!Number.isFinite(amount)) return null

  const from = split(fromCurrency)
  const to = split(toCurrency)
  if (!from.base || !to.base) return null

  // In der Basiswährung rechnen (Pence → Pfund), dann zurück in die Zielnotation.
  const inBase = amount * from.factor

  if (from.base === to.base) return inBase / to.factor

  const rate = await getExchangeRate(from.base, to.base)
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    // Kein direktes Paar hinterlegt → Umweg über EUR versuchen.
    const [toEur, fromEur] = await Promise.all([
      getExchangeRate(from.base, 'EUR'),
      getExchangeRate('EUR', to.base),
    ])
    if (!toEur || !fromEur) return null
    return (inBase * toEur * fromEur) / to.factor
  }

  return (inBase * rate) / to.factor
}
