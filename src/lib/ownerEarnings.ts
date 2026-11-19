// src/lib/ownerEarnings.ts
// Owner Earnings nach Warren Buffett (Aktionärsbrief 1986, Anhang zu Scott Fetzer).
//
//   Owner Earnings = Nettogewinn + Abschreibungen − Erhaltungs-Capex
//
// Der Erhaltungs-Capex (was das Geschäft investieren muss, um Marktstellung und
// Absatzmenge zu halten) steht in keinem Abschluss — er wird geschätzt, und zwar
// nach Bruce Greenwald:
//
//   Wachstums-Capex  = Ø(Sachanlagen / Umsatz, bis zu 5 Jahre) × Umsatzzuwachs   (≥ 0)
//   Erhaltungs-Capex = Capex − Wachstums-Capex                                    (≥ 0)
//
// Buffett spricht ausdrücklich vom *durchschnittlichen* jährlichen Capex. Deshalb wird
// der Erhaltungs-Capex über bis zu 3 Jahre geglättet — sonst schwankt die Kennzahl mit
// jedem Ausreißer im Umsatzwachstum.
//
// Bewusst NICHT enthalten:
//   - Aktienvergütung (SBC): Sie ist im Nettogewinn bereits als Aufwand abgezogen und
//     wird nicht als „nicht zahlungswirksam" zurückaddiert — Buffett sieht sie als echte Kosten.
//   - Veränderung des Working Capital: in den SEC-Daten nicht sauber verfügbar und von
//     Jahr zu Jahr sehr volatil.
//
// Reine Rechenlogik ohne I/O.

/** Jahreswerte einer Periode, wie sie die Aktienseite aus den SEC-/ESEF-Daten kennt. */
export interface OwnerEarningsInput {
  /** Geschäftsjahr als String, z.B. "2025" */
  period: string
  revenue: number | null | undefined
  netIncome: number | null | undefined
  depreciation: number | null | undefined
  /** Investitionen in Sachanlagen — Vorzeichen egal, es wird der Betrag genommen. */
  capex: number | null | undefined
  /** Sachanlagen netto (Bilanz zum Periodenende) */
  propertyPlantEquipment: number | null | undefined
}

export interface OwnerEarningsResult {
  period: string
  /** null, wenn nicht seriös schätzbar (fehlende Daten oder kein Vorjahr) */
  ownerEarnings: number | null
  /** Geglätteter Erhaltungs-Capex, der in ownerEarnings eingeht */
  maintenanceCapex: number | null
  /** Wachstums-Capex dieses Jahres (ungeglättet) — für die Herleitung im UI */
  growthCapex: number | null
  /** Ø Sachanlagen/Umsatz, mit dem der Wachstums-Capex geschätzt wurde */
  capitalIntensity: number | null
  /** Anzahl Jahre, über die der Erhaltungs-Capex gemittelt wurde (1–3) */
  smoothingYears: number
}

/** Fenster für die Kapitalintensität (Sachanlagen/Umsatz) */
const INTENSITY_WINDOW_YEARS = 5
/** Fenster für die Glättung des Erhaltungs-Capex */
const MAINTENANCE_WINDOW_YEARS = 3

function num(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function yearOf(period: string): number | null {
  const y = parseInt(period, 10)
  return Number.isFinite(y) ? y : null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ─── Bewertungsbasis für den DCF-Rechner ─────────────────────────────────────

/** Jahresabschlüsse so, wie sie die /api/v1/financials-Endpunkte liefern. */
export interface OwnerEarningsStatements {
  income: { period: string; revenue?: number | null; netIncome?: number | null; eps?: number | null }[]
  balance: { period: string; propertyPlantEquipment?: number | null; sharesOutstanding?: number | null }[]
  cashflow: { period: string; depreciation?: number | null; capitalExpenditure?: number | null }[]
  /** Marktkapitalisierung zum Geschäftsjahresende, Schlüssel = Jahr des Periodenendes ("2025") */
  marketCapByYear?: Record<string, number>
}

export interface OwnerEarningsValuationBasis {
  /** Geschäftsjahr der jüngsten schätzbaren Owner Earnings */
  period: string
  ownerEarnings: number
  perShare: number
  /** Jährliches Wachstum (CAGR) als Dezimalzahl; null bei Vorzeichenwechsel oder zu kurzer Historie */
  growthRate: number | null
  growthYears: number
  /** Kurs/Owner Earnings zum jeweiligen Geschäftsjahresende (nur positive Owner Earnings) */
  historicalMultiples: { period: string; multiple: number }[]
}

/**
 * Owner Earnings je Aktie, Wachstum und historische Multiples für eine Bewertung.
 * Aktienzahl: verwässert aus Nettogewinn / verwässertem EPS desselben Jahres — dieselbe
 * Basis wie beim KGV. Nur wenn das nicht geht, die ausstehenden Aktien laut Bilanz.
 */
export function ownerEarningsValuationBasis(s: OwnerEarningsStatements): OwnerEarningsValuationBasis | null {
  const periods = s.cashflow.map(c => {
    const inc = s.income.find(i => i.period === c.period)
    const bal = s.balance.find(b => b.period === c.period)
    return {
      period: c.period,
      revenue: inc?.revenue,
      netIncome: inc?.netIncome,
      eps: inc?.eps,
      depreciation: c.depreciation,
      capex: c.capitalExpenditure,
      propertyPlantEquipment: bal?.propertyPlantEquipment,
      sharesOutstanding: bal?.sharesOutstanding,
    }
  })
  const results = computeOwnerEarnings(periods)

  const series = results
    .map((r, idx) => ({ ...r, input: periods[idx] }))
    .filter((r): r is typeof r & { ownerEarnings: number } => r.ownerEarnings !== null)
    .sort((a, b) => (yearOf(a.period) ?? 0) - (yearOf(b.period) ?? 0))
  if (series.length === 0) return null

  const latest = series[series.length - 1]
  const { netIncome, eps, sharesOutstanding } = latest.input
  let shares: number | null = null
  if (num(netIncome) && num(eps) && netIncome !== 0 && eps !== 0 && netIncome / eps > 0) {
    shares = netIncome / eps
  } else if (num(sharesOutstanding) && sharesOutstanding > 0) {
    shares = sharesOutstanding
  }
  if (shares === null) return null

  // Wachstum: über bis zu 5 Jahre, mindestens 2 — nur zwischen positiven Werten definiert
  const latestYear = yearOf(latest.period) as number
  let growthRate: number | null = null
  let growthYears = 0
  if (latest.ownerEarnings > 0) {
    for (let k = 5; k >= 2; k--) {
      const start = series.find(r => yearOf(r.period) === latestYear - k)
      if (start && start.ownerEarnings > 0) {
        growthRate = Math.pow(latest.ownerEarnings / start.ownerEarnings, 1 / k) - 1
        growthYears = k
        break
      }
    }
  }

  const historicalMultiples = s.marketCapByYear
    ? series
        .filter(r => r.ownerEarnings > 0 && num(s.marketCapByYear![r.period]) && s.marketCapByYear![r.period] > 0)
        .map(r => ({ period: r.period, multiple: s.marketCapByYear![r.period] / r.ownerEarnings }))
    : []

  return {
    period: latest.period,
    ownerEarnings: latest.ownerEarnings,
    perShare: latest.ownerEarnings / shares,
    growthRate,
    growthYears,
    historicalMultiples,
  }
}

/**
 * Berechnet Owner Earnings für eine Reihe von Geschäftsjahren.
 * Erwartet Jahresperioden; die Reihenfolge der Eingabe ist egal, das Ergebnis
 * hat dieselbe Reihenfolge wie die Eingabe.
 */
export function computeOwnerEarnings(periods: OwnerEarningsInput[]): OwnerEarningsResult[] {
  // Nach Jahr indexieren — Lücken in der Historie dürfen nicht als „Vorjahr" durchgehen.
  const byYear = new Map<number, OwnerEarningsInput>()
  for (const p of periods) {
    const y = yearOf(p.period)
    if (y !== null) byYear.set(y, p)
  }

  const intensity = (y: number): number | null => {
    const p = byYear.get(y)
    if (!p || !num(p.propertyPlantEquipment) || !num(p.revenue)) return null
    if (p.propertyPlantEquipment <= 0 || p.revenue <= 0) return null
    return p.propertyPlantEquipment / p.revenue
  }

  // Schritt 1: ungeglätteter Erhaltungs-Capex je Jahr (Greenwald)
  const raw = new Map<number, { maintenance: number; growth: number; intensity: number }>()
  for (const [y, p] of byYear) {
    const prev = byYear.get(y - 1)
    if (!num(p.capex) || !num(p.revenue) || !prev || !num(prev.revenue)) continue

    const ratios: number[] = []
    for (let k = 0; k < INTENSITY_WINDOW_YEARS; k++) {
      const r = intensity(y - k)
      if (r !== null) ratios.push(r)
    }
    const avgIntensity = average(ratios)
    if (avgIntensity === null) continue

    const capex = Math.abs(p.capex)
    // Schrumpfender Umsatz erzeugt keinen negativen Wachstums-Capex —
    // dann gilt der gesamte Capex als Erhaltung (konservativ).
    const growth = Math.min(capex, Math.max(0, avgIntensity * (p.revenue - prev.revenue)))
    raw.set(y, { maintenance: capex - growth, growth, intensity: avgIntensity })
  }

  // Schritt 2: glätten und Owner Earnings berechnen
  return periods.map(p => {
    const empty: OwnerEarningsResult = {
      period: p.period,
      ownerEarnings: null,
      maintenanceCapex: null,
      growthCapex: null,
      capitalIntensity: null,
      smoothingYears: 0,
    }
    const y = yearOf(p.period)
    if (y === null) return empty
    const current = raw.get(y)
    if (!current || !num(p.netIncome) || !num(p.depreciation)) return empty

    const window: number[] = []
    for (let k = 0; k < MAINTENANCE_WINDOW_YEARS; k++) {
      const r = raw.get(y - k)
      if (r) window.push(r.maintenance)
    }
    const maintenanceCapex = average(window) as number

    return {
      period: p.period,
      ownerEarnings: p.netIncome + Math.abs(p.depreciation) - maintenanceCapex,
      maintenanceCapex,
      growthCapex: current.growth,
      capitalIntensity: current.intensity,
      smoothingYears: window.length,
    }
  })
}
