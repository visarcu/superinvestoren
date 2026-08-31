// src/lib/portfolio/fundamentals.ts
// Aggregiert Fundamentaldaten eines Depots — gewichtet nach Positionswert.
//
// Reine Rechenlogik ohne I/O, damit sie unabhängig von der Datenquelle testbar bleibt.
// Die Kennzahlen selbst stammen aus SecFinancialPeriod (SEC XBRL bzw. eigene DAX-Daten),
// der Kurs aus der Notierungswährung der Position — beide müssen zueinander passen.

import type { SecFinancialPeriod, FinancialDataSource } from '@/lib/sec/secFinancialService'
import { isForeignFilerOverride } from '@/lib/sec/cikMapping'

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
  /**
   * Passen Notierungs- und Berichtswährung sicher zusammen?
   * Wenn nein, bleiben die kursbasierten Kennzahlen (KGV, KUV, FCF-Rendite) null.
   */
  priceCurrencyOk: boolean
  peRatio: number | null
  psRatio: number | null
  fcfYield: number | null
  netMargin: number | null
  revenueGrowth3y: number | null
  earningsGrowth3y: number | null
  netDebtToFcf: number | null
  dividendCoverage: number | null
  // Rohbausteine für die Look-Through-Aggregation (Berichtswährung, absolut).
  netDebt: number | null
  freeCashFlow: number | null
  /** Ausgeschüttete Dividenden als positiver Betrag; null, wenn keine gezahlt. */
  dividendsPaid: number | null
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

/**
 * Position mit Fundamentaldaten, die aber nicht in die kursbasierten
 * Kennzahlen (KGV, KUV, FCF-Rendite) einfließt — Margen, Wachstum und
 * Verschuldung werden weiterhin berücksichtigt.
 */
export interface RestrictedPosition {
  symbol: string
  name: string
  value: number
  reason: 'waehrung-unsicher'
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
    /** Abgedeckt, aber ohne kursbasierte Kennzahlen (Währung unsicher). */
    restricted: RestrictedPosition[]
  }
  positions: PositionFundamentals[]
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function isFinite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/** US-Aktienklassen wie BRK.B — Punkt-Suffix, aber kein Börsen-Suffix. */
const US_CLASS_SUFFIXES = new Set(['A', 'B', 'C'])

/** Börsen-Suffix (Yahoo-Notation, z.B. "BMW.DE" → "DE"); null bei US-Listing. */
function exchangeSuffix(symbol: string): string | null {
  const idx = symbol.lastIndexOf('.')
  if (idx < 0) return null
  const suffix = symbol.slice(idx + 1)
  return US_CLASS_SUFFIXES.has(suffix) ? null : suffix
}

/**
 * Kursbasierte Kennzahlen nur, wenn Notierungs- und Berichtswährung sicher
 * zusammenpassen. Ein genereller FX/ADR-Umrechner ist hier nicht möglich:
 * die Berichtswährung geht beim XBRL-Parsen verloren, ADR-Bezugsverhältnisse
 * (z.B. BP 1:6) kennen wir nicht. Londoner Kurse sind zudem in Pence (GBX).
 * Sicher sind deshalb nur:
 *   - US-Listing ohne Börsen-Suffix mit SEC-Daten, sofern kein Override auf
 *     einen ausländischen 20-F-Filer (siehe cikMapping)
 *   - .DE-Listing mit eigenen DAX-Daten (EUR/EUR)
 */
export function priceCurrencyMatches(symbol: string, source: FinancialDataSource): boolean {
  const normalized = symbol.toUpperCase().trim()
  const suffix = exchangeSuffix(normalized)
  if (source === 'finclue-manual') return suffix === 'DE'
  if (source === 'sec-xbrl') return suffix === null && !isForeignFilerOverride(normalized)
  return false
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

/**
 * Look-Through-Aggregation: gewichtete Summe der Zähler ÷ gewichtete Summe
 * der Nenner. Bewusst NICHT der gewichtete Mittelwert der Einzel-Verhältnisse:
 * den dominiert eine einzige Position mit Mini-Nenner (z.B. FCF nahe null).
 * Nenner müssen positiv sein — dieselbe Ausschlussregel wie je Position.
 */
function ratioOfSums(
  entries: Array<{ weight: number; numerator: number | null; denominator: number | null }>,
  totalValue: number,
): AggregatedMetric {
  const usable = entries.filter(
    e => isFinite(e.numerator) && isFinite(e.denominator) && e.denominator > 0 && e.weight > 0,
  )
  const weightSum = usable.reduce((sum, e) => sum + e.weight, 0)

  if (usable.length === 0 || weightSum === 0) {
    return { value: null, positions: 0, valueShare: 0 }
  }

  const numerator = usable.reduce((sum, e) => sum + e.weight * (e.numerator as number), 0)
  const denominator = usable.reduce((sum, e) => sum + e.weight * (e.denominator as number), 0)

  return {
    // denominator > 0 ist durch den Filter garantiert.
    value: numerator / denominator,
    positions: usable.length,
    valueShare: totalValue > 0 ? weightSum / totalValue : 0,
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
    priceCurrencyOk: priceCurrencyMatches(position.symbol, source),
    peRatio: null,
    psRatio: null,
    fcfYield: null,
    netMargin: null,
    revenueGrowth3y: null,
    earningsGrowth3y: null,
    netDebtToFcf: null,
    dividendCoverage: null,
    netDebt: null,
    freeCashFlow: null,
    dividendsPaid: null,
  }

  const annual = periods
    .filter(p => p.fiscalPeriod === 'FY')
    .sort((a, b) => b.fiscalYear - a.fiscalYear)

  const latest = annual[0]
  if (!latest) return base

  base.fiscalYear = latest.fiscalYear

  // Kursbasierte Kennzahlen nur bei sicherem Währungs-Match (siehe
  // priceCurrencyMatches) — sonst käme z.B. Pence ÷ USD-EPS heraus.
  if (base.priceCurrencyOk) {
    // Marktkapitalisierung: Kurs × ausstehende Aktien, beides in Notierungswährung.
    const marketCap =
      isFinite(position.price) && isFinite(latest.sharesOutstanding) && latest.sharesOutstanding > 0
        ? position.price * latest.sharesOutstanding
        : null

    base.peRatio = divide(position.price, latest.eps)
    base.psRatio = divide(marketCap, latest.revenue)
    base.fcfYield = divide(latest.freeCashFlow, marketCap)
  }

  base.netMargin = divide(latest.netIncome, latest.revenue)
  base.freeCashFlow = isFinite(latest.freeCashFlow) ? latest.freeCashFlow : null

  // Nettoverschuldung im Verhältnis zum Free Cashflow.
  // Bewusst nicht Net Debt / EBITDA: EBITDA liefern die SEC-Daten nicht,
  // und FCF ist für die Frage "wie schnell wäre die Schuld getilgt" ohnehin ehrlicher.
  //
  // Fehlender Debt-Tag trotz nachweislich geladener Bilanz gilt als schuldenfrei
  // (totalDebt = 0) — aber nur bei US-GAAP-Filern: dort ist der LongTermDebt-Tag
  // gemappt und sein Fehlen aussagekräftig. Für IFRS-20-F-Filer mappt der Parser
  // totalDebt nie, für manuelle DAX-Daten hieße Fehlen nur "noch nicht eingepflegt".
  const domesticSecFiler = source === 'sec-xbrl' && base.priceCurrencyOk
  const balanceSheetLoaded = isFinite(latest.totalAssets) && isFinite(latest.totalLiabilities)
  const totalDebt = isFinite(latest.totalDebt)
    ? latest.totalDebt
    : domesticSecFiler && balanceSheetLoaded
      ? 0
      : null

  if (totalDebt !== null) {
    base.netDebt = totalDebt - (isFinite(latest.cash) ? latest.cash : 0)
    if (isFinite(latest.freeCashFlow) && latest.freeCashFlow > 0) {
      base.netDebtToFcf = base.netDebt / latest.freeCashFlow
    }
  }

  // dividendsPaid kommt als Abfluss (negativ) aus der Kapitalflussrechnung.
  if (isFinite(latest.dividendsPaid) && latest.dividendsPaid !== 0) {
    base.dividendsPaid = Math.abs(latest.dividendsPaid)
    base.dividendCoverage = divide(latest.freeCashFlow, base.dividendsPaid)
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
    // Verhältniszahlen als Ratio-of-Sums (Look-Through): der gewichtete Schnitt
    // der Einzel-Ratios ließe Ausreißer mit Mini-Nenner dominieren.
    netDebtToFcf: ratioOfSums(
      positions.map(p => ({ weight: p.value, numerator: p.netDebt, denominator: p.freeCashFlow })),
      totalValue,
    ),
    dividendCoverage: ratioOfSums(
      positions.map(p => ({ weight: p.value, numerator: p.freeCashFlow, denominator: p.dividendsPaid })),
      totalValue,
    ),
    coverage: {
      coveredPositions: positions.length,
      totalPositions: positions.length + missing.length,
      coveredValue,
      totalValue,
      missing: [...missing].sort((a, b) => b.value - a.value),
      restricted: positions
        .filter(p => !p.priceCurrencyOk)
        .map(p => ({
          symbol: p.symbol,
          name: p.name,
          value: p.value,
          reason: 'waehrung-unsicher' as const,
        }))
        .sort((a, b) => b.value - a.value),
    },
    positions: [...positions].sort((a, b) => b.value - a.value),
  }
}
