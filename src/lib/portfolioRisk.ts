// src/lib/portfolioRisk.ts
// Risiko-Kennzahlen (Sharpe, Sortino, Max Drawdown, Volatilität, Beta ...)
// aus einer täglichen Wealth-Index-Serie. Fürs Depot kommt die Serie aus der
// flow-bereinigten TWR-Kette, für Benchmarks aus den EUR-Preisserien, der
// risikofreie Zins aus der XEON-Kursserie (€STR-Overnight) — echte Daten,
// kein hartcodierter Zinssatz.
//
// Ehrlichkeits-Regel: Unter MIN_POINTS Handelstagen liefern wir null statt
// pseudo-präziser Zahlen (Lektion aus der TWR-Forensik: kleine Basis = Rauschen).

export interface SeriesPoint {
  date: string
  /** Wealth-Index oder Preis — nur Verhältnisse zählen */
  value: number
}

export interface RiskMeasures {
  periodDays: number
  annualizedReturnPct: number
  /** Gesamtrendite über das Serienfenster — fürs UI bei Fenstern < 1 Jahr */
  totalReturnPct: number
  volatilityPct: number
  downsideDeviationPct: number
  sharpe: number | null
  sortino: number | null
  calmar: number | null
  maxDrawdownPct: number
  maxDrawdownPeak: string
  maxDrawdownValley: string
  /** Monate bis neues Hoch nach dem Max Drawdown; null = noch nicht erholt */
  recoveryMonths: number | null
  /** Nur gesetzt, wenn eine Benchmark-Serie zum Vergleich übergeben wurde */
  beta: number | null
  positiveMonths: number
  negativeMonths: number
  meanMonthlyReturnPct: number
}

const TRADING_DAYS = 252
/** ~6 Monate Handelstage — darunter ist jede Kennzahl Rauschen */
const MIN_POINTS = 120

function sortSeries(series: SeriesPoint[]): SeriesPoint[] {
  return [...series]
    .filter(p => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Tagesrenditen als Map date→return (Basis: Vortagespunkt der Serie) */
function dailyReturns(sorted: SeriesPoint[]): Map<string, number> {
  const returns = new Map<string, number>()
  for (let i = 1; i < sorted.length; i++) {
    returns.set(sorted[i].date, sorted[i].value / sorted[i - 1].value - 1)
  }
  return returns
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1))
}

/** Annualisierte Rendite einer Serie über ihren Gesamtzeitraum (in %) */
export function annualizedReturnPct(series: SeriesPoint[]): number | null {
  const sorted = sortSeries(series)
  if (sorted.length < 2) return null
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000
  if (days < 30) return null
  const total = last.value / first.value
  return (Math.pow(total, 365.25 / days) - 1) * 100
}

/**
 * Kennzahlen einer Serie. `riskFreeAnnualPct` fließt in Sharpe/Sortino ein;
 * `benchmark` (optional) liefert Beta über die gemeinsamen Handelstage.
 */
export function computeRiskMeasures(
  series: SeriesPoint[],
  riskFreeAnnualPct: number | null,
  benchmark?: SeriesPoint[],
): RiskMeasures | null {
  const sorted = sortSeries(series)
  if (sorted.length < MIN_POINTS) return null

  const returnsByDate = dailyReturns(sorted)
  const returns = Array.from(returnsByDate.values())

  const annRet = annualizedReturnPct(sorted)
  if (annRet === null) return null

  // Volatilität & Downside Deviation (annualisiert)
  const vol = stdDev(returns) * Math.sqrt(TRADING_DAYS) * 100
  const rfDaily = riskFreeAnnualPct !== null ? riskFreeAnnualPct / 100 / TRADING_DAYS : 0
  const downside = returns.filter(r => r < rfDaily).map(r => r - rfDaily)
  const downsideDev =
    downside.length > 1
      ? Math.sqrt(downside.reduce((s, v) => s + v * v, 0) / returns.length) * Math.sqrt(TRADING_DAYS) * 100
      : 0

  const excess = riskFreeAnnualPct !== null ? annRet - riskFreeAnnualPct : annRet
  const sharpe = vol > 0.01 ? excess / vol : null
  const sortino = downsideDev > 0.01 ? excess / downsideDev : null

  // Max Drawdown mit Peak/Valley und Recovery
  let peakValue = sorted[0].value
  let peakDate = sorted[0].date
  let maxDD = 0
  let ddPeakDate = sorted[0].date
  let ddValleyDate = sorted[0].date
  for (const point of sorted) {
    if (point.value > peakValue) {
      peakValue = point.value
      peakDate = point.date
    }
    const dd = point.value / peakValue - 1
    if (dd < maxDD) {
      maxDD = dd
      ddPeakDate = peakDate
      ddValleyDate = point.date
    }
  }
  // Recovery: erster Tag nach dem Valley, an dem der alte Peak wieder erreicht ist
  let recoveryMonths: number | null = null
  if (maxDD < 0) {
    const peakVal = sorted.find(p => p.date === ddPeakDate)?.value ?? peakValue
    const afterValley = sorted.filter(p => p.date > ddValleyDate)
    const recovered = afterValley.find(p => p.value >= peakVal)
    if (recovered) {
      recoveryMonths = Math.max(
        1,
        Math.round(
          (new Date(recovered.date).getTime() - new Date(ddValleyDate).getTime()) / (30.44 * 86400000),
        ),
      )
    }
  }

  const calmar = maxDD < -0.001 ? annRet / Math.abs(maxDD * 100) : null

  // Beta über gemeinsame Handelstage
  let beta: number | null = null
  if (benchmark) {
    const benchReturns = dailyReturns(sortSeries(benchmark))
    const paired: [number, number][] = []
    for (const [date, r] of Array.from(returnsByDate.entries())) {
      const b = benchReturns.get(date)
      if (b !== undefined) paired.push([r, b])
    }
    if (paired.length >= MIN_POINTS / 2) {
      const meanP = mean(paired.map(p => p[0]))
      const meanB = mean(paired.map(p => p[1]))
      let cov = 0
      let varB = 0
      for (const [r, b] of paired) {
        cov += (r - meanP) * (b - meanB)
        varB += (b - meanB) ** 2
      }
      if (varB > 0) beta = cov / varB
    }
  }

  // Monatsrenditen: letzter Punkt je Monat
  const lastOfMonth = new Map<string, number>()
  for (const point of sorted) {
    lastOfMonth.set(point.date.slice(0, 7), point.value)
  }
  const monthKeys = Array.from(lastOfMonth.keys()).sort()
  const monthlyReturns: number[] = []
  for (let i = 1; i < monthKeys.length; i++) {
    monthlyReturns.push(lastOfMonth.get(monthKeys[i])! / lastOfMonth.get(monthKeys[i - 1])! - 1)
  }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  return {
    periodDays: Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000),
    annualizedReturnPct: Math.round(annRet * 100) / 100,
    totalReturnPct: Math.round((last.value / first.value - 1) * 10000) / 100,
    volatilityPct: Math.round(vol * 100) / 100,
    downsideDeviationPct: Math.round(downsideDev * 100) / 100,
    sharpe: sharpe !== null ? Math.round(sharpe * 100) / 100 : null,
    sortino: sortino !== null ? Math.round(sortino * 100) / 100 : null,
    calmar: calmar !== null ? Math.round(calmar * 100) / 100 : null,
    maxDrawdownPct: Math.round(maxDD * 10000) / 100,
    maxDrawdownPeak: ddPeakDate,
    maxDrawdownValley: ddValleyDate,
    recoveryMonths,
    beta: beta !== null ? Math.round(beta * 100) / 100 : null,
    positiveMonths: monthlyReturns.filter(r => r > 0).length,
    negativeMonths: monthlyReturns.filter(r => r < 0).length,
    meanMonthlyReturnPct: Math.round(mean(monthlyReturns) * 10000) / 100,
  }
}
