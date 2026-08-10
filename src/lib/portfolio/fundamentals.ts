// src/lib/portfolio/fundamentals.ts
// Aggregiert Fundamentaldaten eines Depots — gewichtet nach Positionswert.
//
// Reine Rechenlogik ohne I/O, damit sie unabhängig von der Datenquelle testbar bleibt.
// Die Kennzahlen selbst stammen aus SecFinancialPeriod (SEC XBRL bzw. eigene DAX-Daten),
// der Kurs aus der Notierungswährung der Position — beide müssen zueinander passen.

import type { SecFinancialPeriod, FinancialDataSource } from '@/lib/sec/secFinancialService'

/** Eine Depotposition, so wie sie das Frontend kennt. */
export interface PositionInput {
  symbol: string
  name: string
  /** Positionswert in Anzeigewährung — nur zur Gewichtung, nie in Kennzahlen. */
  value: number
  /** Kurs in Notierungswährung — muss zur Berichtswährung der Fundamentaldaten passen. */
  price: number
}

/** Kennzahlen einer einzelnen Position. null = nicht sinnvoll berechenbar. */
export interface PositionFundamentals {
  symbol: string
  name: string
  value: number
  source: FinancialDataSource
  fiscalYear: number | null
  peRatio: number | null
  psRatio: number | null
  fcfYield: number | null
  netMargin: number | null
  revenueGrowth3y: number | null
  earningsGrowth3y: number | null
  netDebtToFcf: number | null
  dividendCoverage: number | null
}

/** Ein aggregierter Wert plus die Angabe, worauf er beruht. */
export interface AggregatedMetric {
  value: number | null
  /** Anzahl Positionen, die zu dieser Kennzahl beitragen konnten. */
  positions: number
  /** Anteil des Depotwerts, der zu dieser Kennzahl beitragen konnte (0..1). */
  valueShare: number
}

export interface MissingPosition {
  symbol: string
  name: string
  value: number
  reason: 'keine-fundamentaldaten' | 'kein-kurs'
}

export interface PortfolioFundamentals {
  peRatio: AggregatedMetric
  psRatio: AggregatedMetric
  fcfYield: AggregatedMetric
  netMargin: AggregatedMetric
  revenueGrowth3y: AggregatedMetric
  earningsGrowth3y: AggregatedMetric
  netDebtToFcf: AggregatedMetric
  dividendCoverage: AggregatedMetric
  coverage: {
    coveredPositions: number
    totalPositions: number
    coveredValue: number
    totalValue: number
    missing: MissingPosition[]
  }
  positions: PositionFundamentals[]
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function isFinite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/** Division, die bei 0, null oder Unendlich sauber null liefert. */
function divide(a: number | null | undefined, b: number | null | undefined): number | null {
  if (!isFinite(a) || !isFinite(b) || b === 0) return null
  const result = a / b
  return Number.isFinite(result) ? result : null
}

/**
 * Jährliche Wachstumsrate (CAGR).
 * Bei Null- oder Negativwerten am Anfang oder Ende nicht definiert — dann null.
 * Ein Wachstum "von -2 Mrd Verlust auf +1 Mrd Gewinn" ist keine Prozentzahl.
 */
export function cagr(first: number | null, last: number | null, years: number): number | null {
  if (!isFinite(first) || !isFinite(last) || years <= 0) return null
  if (first <= 0 || last <= 0) return null
  return Math.pow(last / first, 1 / years) - 1
}

/**
 * Gewichteter Mittelwert über die Positionen, bei denen die Kennzahl vorhanden ist.
 * Die Gewichte werden auf genau diese Teilmenge normiert.
 */
function weightedMean(
  entries: Array<{ weight: number; value: number | null }>,
  totalValue: number,
): AggregatedMetric {
  const usable = entries.filter(e => isFinite(e.value) && e.weight > 0)
  const weightSum = usable.reduce((sum, e) => sum + e.weight, 0)

  if (usable.length === 0 || weightSum === 0) {
    return { value: null, positions: 0, valueShare: 0 }
  }

  const value = usable.reduce((sum, e) => sum + e.weight * (e.value as number), 0) / weightSum
  return {
    value,
    positions: usable.length,
    valueShare: totalValue > 0 ? weightSum / totalValue : 0,
  }
}

/**
 * Gewichtetes Verhältnis für Bewertungsmultiplikatoren (KGV, KUV, KCV).
 *
 * Bewusst NICHT der arithmetische Mittelwert der Einzel-KGVs: der überschätzt
 * das Depot systematisch, weil eine einzelne teure Position mit KGV 200 den
 * Schnitt sprengt. Stattdessen wird über die Kehrwerte gemittelt (Gewinnrendite)
 * und am Ende zurückgedreht — das entspricht "Summe Marktwert / Summe Gewinn"
 * und ist die Methode, die auch Indexanbieter für Index-KGVs verwenden.
 */
function weightedRatio(
  entries: Array<{ weight: number; value: number | null }>,
  totalValue: number,
): AggregatedMetric {
  const inverted = entries.map(e => ({
    weight: e.weight,
    // Nur positive Multiplikatoren sind sinnvoll invertierbar (Verlustjahre raus).
    value: isFinite(e.value) && e.value > 0 ? 1 / e.value : null,
  }))

  const meanInverse = weightedMean(inverted, totalValue)
  if (meanInverse.value === null || meanInverse.value === 0) {
    return { value: null, positions: meanInverse.positions, valueShare: meanInverse.valueShare }
  }

  return {
    value: 1 / meanInverse.value,
    positions: meanInverse.positions,
    valueShare: meanInverse.valueShare,
  }
}

// ─── Kennzahlen je Position ──────────────────────────────────────────────────

/**
 * Rechnet die Kennzahlen einer Position aus ihren Geschäftsjahren.
 * `periods` muss absteigend nach Geschäftsjahr sortiert sein (neuestes zuerst).
 */
export function computePositionFundamentals(
  position: PositionInput,
  periods: SecFinancialPeriod[],
  source: FinancialDataSource,
): PositionFundamentals {
  const base: PositionFundamentals = {
    symbol: position.symbol,
    name: position.name,
    value: position.value,
    source,
    fiscalYear: null,
    peRatio: null,
    psRatio: null,
    fcfYield: null,
    netMargin: null,
    revenueGrowth3y: null,
    earningsGrowth3y: null,
    netDebtToFcf: null,
    dividendCoverage: null,
  }

  const annual = periods
    .filter(p => p.fiscalPeriod === 'FY')
    .sort((a, b) => b.fiscalYear - a.fiscalYear)

  const latest = annual[0]
  if (!latest) return base

  base.fiscalYear = latest.fiscalYear

  // Marktkapitalisierung: Kurs × ausstehende Aktien, beides in Notierungswährung.
  const marketCap =
    isFinite(position.price) && isFinite(latest.sharesOutstanding) && latest.sharesOutstanding > 0
      ? position.price * latest.sharesOutstanding
      : null

  base.peRatio = divide(position.price, latest.eps)
  base.psRatio = divide(marketCap, latest.revenue)
  base.fcfYield = divide(latest.freeCashFlow, marketCap)
  base.netMargin = divide(latest.netIncome, latest.revenue)

  // Nettoverschuldung im Verhältnis zum Free Cashflow.
  // Bewusst nicht Net Debt / EBITDA: EBITDA liefern die SEC-Daten nicht,
  // und FCF ist für die Frage "wie schnell wäre die Schuld getilgt" ohnehin ehrlicher.
  if (isFinite(latest.totalDebt) && isFinite(latest.freeCashFlow) && latest.freeCashFlow > 0) {
    const netDebt = latest.totalDebt - (isFinite(latest.cash) ? latest.cash : 0)
    base.netDebtToFcf = netDebt / latest.freeCashFlow
  }

  // dividendsPaid kommt als Abfluss (negativ) aus der Kapitalflussrechnung.
  if (isFinite(latest.dividendsPaid) && latest.dividendsPaid !== 0) {
    base.dividendCoverage = divide(latest.freeCashFlow, Math.abs(latest.dividendsPaid))
  }

  // Wachstum über bis zu 3 Jahre — kürzer, wenn weniger Historie vorliegt.
  const oldest = annual[Math.min(3, annual.length - 1)]
  if (oldest && oldest.fiscalYear < latest.fiscalYear) {
    const span = latest.fiscalYear - oldest.fiscalYear
    base.revenueGrowth3y = cagr(oldest.revenue, latest.revenue, span)
    base.earningsGrowth3y = cagr(oldest.netIncome, latest.netIncome, span)
  }

  return base
}

// ─── Aggregation über das Depot ──────────────────────────────────────────────

export function aggregatePortfolioFundamentals(
  positions: PositionFundamentals[],
  missing: MissingPosition[],
): PortfolioFundamentals {
  const coveredValue = positions.reduce((sum, p) => sum + p.value, 0)
  const missingValue = missing.reduce((sum, p) => sum + p.value, 0)
  const totalValue = coveredValue + missingValue

  const pick = (key: keyof PositionFundamentals) =>
    positions.map(p => ({ weight: p.value, value: p[key] as number | null }))

  return {
    // Multiplikatoren über die Kehrwerte, siehe weightedRatio().
    peRatio: weightedRatio(pick('peRatio'), totalValue),
    psRatio: weightedRatio(pick('psRatio'), totalValue),
    // Renditen, Margen und Wachstumsraten sind additiv — normaler gewichteter Schnitt.
    fcfYield: weightedMean(pick('fcfYield'), totalValue),
    netMargin: weightedMean(pick('netMargin'), totalValue),
    revenueGrowth3y: weightedMean(pick('revenueGrowth3y'), totalValue),
    earningsGrowth3y: weightedMean(pick('earningsGrowth3y'), totalValue),
    netDebtToFcf: weightedMean(pick('netDebtToFcf'), totalValue),
    dividendCoverage: weightedMean(pick('dividendCoverage'), totalValue),
    coverage: {
      coveredPositions: positions.length,
      totalPositions: positions.length + missing.length,
      coveredValue,
      totalValue,
      missing: [...missing].sort((a, b) => b.value - a.value),
    },
    positions: [...positions].sort((a, b) => b.value - a.value),
  }
}
