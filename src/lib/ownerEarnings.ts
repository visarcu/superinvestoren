// src/lib/ownerEarnings.ts
// Owner Earnings nach Warren Buffett (Aktionärsbrief 1986, Anhang zu Scott Fetzer).
//
//   Owner Earnings = Nettogewinn + Abschreibungen − Erhaltungs-Capex
//
// Der Erhaltungs-Capex (was das Geschäft investieren muss, um Marktstellung und
// Absatzmenge zu halten) steht in keinem Abschluss. Er wird geschätzt, und zwar
// nach Bruce Greenwald:
//
//   Wachstums-Capex  = Ø(Sachanlagen / Umsatz, bis zu 5 Jahre) × Umsatzzuwachs   (≥ 0)
//   Erhaltungs-Capex = Capex − Wachstums-Capex                                    (≥ 0)
//
// Buffett spricht ausdrücklich vom *durchschnittlichen* jährlichen Capex. Deshalb wird
// der Erhaltungs-Capex über bis zu 3 Jahre geglättet. Sonst schwankt die Kennzahl mit
// jedem Ausreißer im Umsatzwachstum.
//
// Bewusst NICHT enthalten:
//   - Aktienvergütung (SBC): Sie ist im Nettogewinn bereits als Aufwand abgezogen und
//     wird nicht als „nicht zahlungswirksam" zurückaddiert. Buffett sieht sie als echte Kosten.
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

// ─── Aufbereitung der Daten aus /api/financial-data ──────────────────────────

/** Ausschnitt der Antwort von /api/financial-data/[ticker] (ADRs dort schon in Kurswährung). */
export interface FinancialDataPayload {
  incomeStatements?: Record<string, any>[]
  balanceSheets?: Record<string, any>[]
  cashFlows?: Record<string, any>[]
  keyMetrics?: Record<string, any>[]
  _currency?: { currency: string | null; convertedFrom: string | null }
}

/** Ein Geschäftsjahr mit allen Posten der Herleitung. */
export interface OwnerEarningsYear extends OwnerEarningsResult {
  /** Ende des Geschäftsjahres, z.B. "2026-06-30" */
  date: string | null
  netIncome: number | null
  depreciation: number | null
  capex: number | null
  freeCashFlow: number | null
}

/** FMP liefert fehlende Posten als 0. Für Umsatz, Capex & Co. heißt 0 deshalb "unbekannt". */
function known(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0 ? v : null
}

function statementYear(row: Record<string, any>): string {
  return String(row.calendarYear || String(row.date ?? '').slice(0, 4))
}

/** Owner Earnings je Geschäftsjahr, ältestes zuerst. */
export function ownerEarningsFromFinancialData(data: FinancialDataPayload): OwnerEarningsYear[] {
  const find = (rows: Record<string, any>[] | undefined, year: string) =>
    rows?.find(r => statementYear(r) === year) ?? {}

  const rows = (data.cashFlows ?? [])
    .map(cf => {
      const period = statementYear(cf)
      const income = find(data.incomeStatements, period)
      const balance = find(data.balanceSheets, period)
      const capex = known(cf.capitalExpenditure)
      return {
        period,
        date: typeof cf.date === 'string' ? cf.date : null,
        revenue: known(income.revenue),
        netIncome: known(income.netIncome),
        depreciation: known(cf.depreciationAndAmortizationFmp) ?? known(cf.depreciationAndAmortization),
        capex: capex === null ? null : Math.abs(capex),
        propertyPlantEquipment: known(balance.propertyPlantEquipmentNet),
        freeCashFlow: known(cf.freeCashFlow),
      }
    })
    .sort((a, b) => (yearOf(a.period) ?? 0) - (yearOf(b.period) ?? 0))

  return computeOwnerEarnings(rows).map((result, i) => ({
    ...result,
    date: rows[i].date,
    netIncome: rows[i].netIncome,
    depreciation: rows[i].depreciation,
    capex: rows[i].capex,
    freeCashFlow: rows[i].freeCashFlow,
  }))
}

/**
 * Jährliches Wachstum bis zum jüngsten Jahr, über bis zu 5 und mindestens 2 Jahre.
 * Nur zwischen positiven Werten definiert, sonst null.
 */
export function ownerEarningsGrowth(years: OwnerEarningsYear[]): { rate: number; years: number } | null {
  const valid = years.filter(y => y.ownerEarnings !== null)
  const latest = valid[valid.length - 1]
  if (!latest || (latest.ownerEarnings as number) <= 0) return null
  const latestYear = yearOf(latest.period)
  if (latestYear === null) return null

  for (let k = 5; k >= 2; k--) {
    const start = valid.find(y => yearOf(y.period) === latestYear - k)
    if (start && (start.ownerEarnings as number) > 0) {
      return { rate: Math.pow((latest.ownerEarnings as number) / (start.ownerEarnings as number), 1 / k) - 1, years: k }
    }
  }
  return null
}

/** Kurs/Owner Earnings zum Geschäftsjahresende, höchstens die letzten 5 Jahre mit positivem Wert. */
export function ownerEarningsMultiples(years: OwnerEarningsYear[], keyMetrics: Record<string, any>[] = []): number[] {
  const out: number[] = []
  for (const y of years) {
    const marketCap = known(keyMetrics.find(k => statementYear(k) === y.period)?.marketCap)
    if (marketCap !== null && y.ownerEarnings !== null && y.ownerEarnings > 0) out.push(marketCap / y.ownerEarnings)
  }
  return out.slice(-5)
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
