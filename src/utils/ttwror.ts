// src/utils/ttwror.ts - True Time-Weighted Rate of Return (TTWROR)
// Eliminiert den Einfluss von Cashflow-Zeitpunkten auf die Rendite

export interface SubPeriod {
  date: string          // ISO date string
  portfolioValue: number // Portfoliowert VOR Cashflow an diesem Tag
  cashflow: number       // Kauf (positiv = Zufluss ins Portfolio), Verkauf (negativ = Abfluss)
}

/**
 * Berechnet die TTWROR (kumulative, zeitgewichtete Rendite).
 * Chain-Linking von Sub-Perioden-Returns:
 * TTWROR = (1+r₁) × (1+r₂) × ... × (1+rₙ) - 1
 * wobei rᵢ = (V_end - V_start - CF) / V_start
 *
 * @param subPeriods Array von Bewertungszeitpunkten mit Cashflows
 * @returns Kumulative Rendite als Dezimalzahl (z.B. 0.25 = 25%) oder null bei Fehler
 */
export function calculateTTWROR(subPeriods: SubPeriod[]): number | null {
  if (subPeriods.length < 2) return null

  let cumulativeReturn = 1

  for (let i = 1; i < subPeriods.length; i++) {
    const startValue = subPeriods[i - 1].portfolioValue + subPeriods[i - 1].cashflow
    const endValue = subPeriods[i].portfolioValue

    // Startkapital muss positiv sein
    if (startValue <= 0) continue

    const periodReturn = (endValue - startValue) / startValue
    cumulativeReturn *= (1 + periodReturn)
  }

  return cumulativeReturn - 1
}

/**
 * Annualisiert eine kumulative Rendite.
 * @param cumulativeReturn z.B. 0.25 = 25%
 * @param days Anzahl Tage der Haltedauer
 * @returns Annualisierte Rendite als Dezimalzahl oder null bei < 30 Tage
 */
export function annualizeTTWROR(cumulativeReturn: number, days: number): number | null {
  if (days < 30) return null
  const years = days / 365.25
  return Math.pow(1 + cumulativeReturn, 1 / years) - 1
}
