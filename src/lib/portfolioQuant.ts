// src/lib/portfolioQuant.ts
// Quantitative Portfolio-Analysen (Premium): Korrelationsmatrix, Stresstests,
// Monte-Carlo-Projektion und Fama-French-Faktorregression.
//
// Alles reine Funktionen über Zeitreihen — die Daten (EUR-Preisserien je
// Position, TWR-Wealth-Index, Benchmark-Serien, Faktordaten) liefert die
// portfolio-history Route. Wie in portfolioRisk gilt die Ehrlichkeits-Regel:
// unter den Mindest-Datenmengen liefern wir null statt pseudo-präziser Zahlen.

export interface QuantSeriesPoint {
  date: string
  value: number
}

const TRADING_DAYS = 252
/** Mindest-Überlappung für eine Paar-Korrelation (~3 Monate Handelstage) */
const MIN_CORR_OBS = 60
/** Mindest-Historie für Monte-Carlo und Faktorregression (~6 Monate) */
const MIN_SERIES_OBS = 120

// ---------------------------------------------------------------------------
// Gemeinsame Helfer
// ---------------------------------------------------------------------------

function sortSeries(series: QuantSeriesPoint[]): QuantSeriesPoint[] {
  return [...series].filter(p => p.value > 0).sort((a, b) => a.date.localeCompare(b.date))
}

/** Tagesrenditen als Map date→return */
export function dailyReturnMap(series: QuantSeriesPoint[]): Map<string, number> {
  const sorted = sortSeries(series)
  const returns = new Map<string, number>()
  for (let i = 1; i < sorted.length; i++) {
    returns.set(sorted[i].date, sorted[i].value / sorted[i - 1].value - 1)
  }
  return returns
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

// ---------------------------------------------------------------------------
// 1. Korrelationsmatrix
// ---------------------------------------------------------------------------

export interface CorrelationMatrixResult {
  /** Symbole in Matrix-Reihenfolge (absteigend nach Depotgewicht) */
  symbols: string[]
  weightsPct: number[]
  /** Pearson-Korrelation der Tagesrenditen; null = zu wenig Überlappung */
  matrix: (number | null)[][]
  /** Ungewichteter Durchschnitt aller Paare (Diversifikations-Signal) */
  avgPairwise: number | null
  minObs: number
}

/**
 * Korrelation der EUR-Tagesrenditen zwischen den größten Positionen.
 * `seriesBySymbol` sind EUR-Preisserien, `weightBySymbol` aktuelle Depotwerte.
 */
export function computeCorrelationMatrix(
  seriesBySymbol: Map<string, QuantSeriesPoint[]>,
  weightBySymbol: Map<string, number>,
  maxSymbols = 12,
): CorrelationMatrixResult | null {
  const totalWeight = Array.from(weightBySymbol.values()).reduce((s, v) => s + Math.max(0, v), 0)
  if (totalWeight <= 0) return null

  const symbols = Array.from(weightBySymbol.entries())
    .filter(([symbol, value]) => value > 0 && (seriesBySymbol.get(symbol)?.length || 0) > MIN_CORR_OBS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSymbols)
    .map(([symbol]) => symbol)

  if (symbols.length < 2) return null

  const returnsBySymbol = new Map<string, Map<string, number>>()
  symbols.forEach(symbol => {
    returnsBySymbol.set(symbol, dailyReturnMap(seriesBySymbol.get(symbol) || []))
  })

  const matrix: (number | null)[][] = symbols.map(() => symbols.map(() => null))
  const pairValues: number[] = []

  for (let i = 0; i < symbols.length; i++) {
    matrix[i][i] = 1
    for (let j = i + 1; j < symbols.length; j++) {
      const a = returnsBySymbol.get(symbols[i])!
      const b = returnsBySymbol.get(symbols[j])!
      const pairsA: number[] = []
      const pairsB: number[] = []
      a.forEach((ra, date) => {
        const rb = b.get(date)
        if (rb !== undefined) {
          pairsA.push(ra)
          pairsB.push(rb)
        }
      })
      if (pairsA.length < MIN_CORR_OBS) continue

      const meanA = mean(pairsA)
      const meanB = mean(pairsB)
      let cov = 0
      let varA = 0
      let varB = 0
      for (let k = 0; k < pairsA.length; k++) {
        const da = pairsA[k] - meanA
        const db = pairsB[k] - meanB
        cov += da * db
        varA += da * da
        varB += db * db
      }
      if (varA <= 0 || varB <= 0) continue
      const corr = cov / Math.sqrt(varA * varB)
      matrix[i][j] = round2(corr)
      matrix[j][i] = round2(corr)
      pairValues.push(corr)
    }
  }

  if (pairValues.length === 0) return null

  return {
    symbols,
    weightsPct: symbols.map(s => round2(((weightBySymbol.get(s) || 0) / totalWeight) * 100)),
    matrix,
    avgPairwise: round2(mean(pairValues)),
    minObs: MIN_CORR_OBS,
  }
}

// ---------------------------------------------------------------------------
// 2. Monte-Carlo-Projektion
// ---------------------------------------------------------------------------

export interface MonteCarloBand {
  /** Monate ab heute */
  month: number
  p5: number
  p25: number
  p50: number
  p75: number
  p95: number
}

export interface MonteCarloResult {
  startValue: number
  horizonYears: number
  paths: number
  /** Zahl der historischen Handelstage, aus denen gebootstrappt wurde */
  basedOnDays: number
  bands: MonteCarloBand[]
  /** P(Endwert < Startwert) nach 1/3/5/10 Jahren, in % */
  lossProbabilityPct: { y1: number; y3: number; y5: number; y10: number }
}

/** Deterministischer PRNG — gleiche Depot-Historie ⇒ gleiche Projektion. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Bootstrap-Projektion: zieht zufällige historische Tagesrenditen des Depots
 * (mit Zurücklegen) statt eine Normalverteilung anzunehmen — fette Ränder der
 * echten Renditeverteilung bleiben so erhalten. Keine Prognose, sondern
 * "Was wäre, wenn sich die eigene Historie so weiter würfelt".
 */
export function runMonteCarlo(
  wealthSeries: QuantSeriesPoint[],
  startValue: number,
  horizonYears = 10,
  paths = 1000,
): MonteCarloResult | null {
  const returns = Array.from(dailyReturnMap(wealthSeries).values())
  if (returns.length < MIN_SERIES_OBS || startValue <= 0) return null

  const months = horizonYears * 12
  const daysPerMonth = TRADING_DAYS / 12
  // Seed aus der Historie ableiten: stabil über Reloads, ändert sich mit den Daten
  let seed = returns.length
  for (let i = 0; i < returns.length; i += 25) {
    seed = (seed * 31 + Math.round(returns[i] * 1e6)) | 0
  }
  const rng = mulberry32(seed)

  // pathValues[m] = alle Pfadwerte nach Monat m
  const pathValues: Float64Array[] = Array.from({ length: months + 1 }, () => new Float64Array(paths))
  for (let p = 0; p < paths; p++) {
    let value = startValue
    pathValues[0][p] = value
    let dayBudget = 0
    for (let m = 1; m <= months; m++) {
      dayBudget += daysPerMonth
      const steps = Math.floor(dayBudget)
      dayBudget -= steps
      for (let d = 0; d < steps; d++) {
        value *= 1 + returns[Math.floor(rng() * returns.length)]
      }
      pathValues[m][p] = value
    }
  }

  const percentile = (values: Float64Array, q: number): number => {
    const sorted = Float64Array.from(values).sort()
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
    return Math.round(sorted[idx])
  }

  // Quartals-Raster reicht fürs Chart und spart 2/3 der Payload
  const bands: MonteCarloBand[] = []
  for (let m = 0; m <= months; m += 3) {
    bands.push({
      month: m,
      p5: percentile(pathValues[m], 0.05),
      p25: percentile(pathValues[m], 0.25),
      p50: percentile(pathValues[m], 0.5),
      p75: percentile(pathValues[m], 0.75),
      p95: percentile(pathValues[m], 0.95),
    })
  }

  const lossProbAt = (year: number): number => {
    const m = Math.min(months, year * 12)
    let below = 0
    for (let p = 0; p < paths; p++) {
      if (pathValues[m][p] < startValue) below++
    }
    return round2((below / paths) * 100)
  }

  return {
    startValue: Math.round(startValue),
    horizonYears,
    paths,
    basedOnDays: returns.length,
    bands,
    lossProbabilityPct: { y1: lossProbAt(1), y3: lossProbAt(3), y5: lossProbAt(5), y10: lossProbAt(10) },
  }
}

// ---------------------------------------------------------------------------
// 3. Stresstests
// ---------------------------------------------------------------------------

export interface StressScenarioDef {
  key: string
  label: string
  from: string
  to: string
  description: string
}

// Fenster = Peak-to-Trough des S&P 500. Die Marktrenditen werden NICHT
// hartcodiert, sondern aus den tatsächlich geladenen Benchmark-Kursen im
// jeweiligen Fenster gemessen (echte Daten, inkl. Währungseffekt für EUR).
export const STRESS_SCENARIOS: StressScenarioDef[] = [
  {
    key: 'gfc2008',
    label: 'Finanzkrise 2008/09',
    from: '2008-09-01',
    to: '2009-03-09',
    description: 'Lehman-Pleite bis zum Markttief im März 2009',
  },
  {
    key: 'corona2020',
    label: 'Corona-Crash 2020',
    from: '2020-02-19',
    to: '2020-03-23',
    description: 'Schnellster Bärenmarkt der Geschichte — 23 Handelstage',
  },
  {
    key: 'rates2022',
    label: 'Zinsschock 2022',
    from: '2022-01-03',
    to: '2022-10-12',
    description: 'Inflations- und Zinswende, Tech-Korrektur',
  },
]

export interface StressPositionImpact {
  symbol: string
  weightPct: number
  returnPct: number
  /** 'history' = echte Kurse im Fenster, 'beta' = Beta×Markt-Näherung */
  source: 'history' | 'beta'
}

export interface StressTestResult {
  key: string
  label: string
  from: string
  to: string
  description: string
  /** Benchmark-Rendite im Fenster (EUR-Sicht), echt gemessen */
  marketReturnPct: number
  portfolioReturnPct: number
  portfolioImpactEur: number
  /** Depotanteil, für den echte Fensterkurse vorlagen */
  realDataWeightPct: number
  positions: StressPositionImpact[]
}

/**
 * Wendet ein historisches Szenario auf die heutige Depotstruktur an.
 * `windowReturnBySymbol`: echte EUR-Rendite der Position im Szenario-Fenster
 * (null wenn das Wertpapier damals noch nicht existierte) — dann nähern wir
 * mit Beta × Marktrendite (Beta aus dem aktuellen Fenster, Fallback 1).
 */
export function computeStressTest(
  scenario: StressScenarioDef,
  weightBySymbol: Map<string, number>,
  windowReturnBySymbol: Map<string, number | null>,
  betaBySymbol: Map<string, number | null>,
  marketReturnPct: number,
  currentSecuritiesValue: number,
): StressTestResult | null {
  const totalWeight = Array.from(weightBySymbol.values()).reduce((s, v) => s + Math.max(0, v), 0)
  if (totalWeight <= 0 || currentSecuritiesValue <= 0) return null

  const positions: StressPositionImpact[] = []
  let portfolioReturn = 0
  let realDataWeight = 0

  weightBySymbol.forEach((value, symbol) => {
    if (value <= 0) return
    const weight = value / totalWeight
    const realReturn = windowReturnBySymbol.get(symbol)

    let returnPct: number
    let source: 'history' | 'beta'
    if (realReturn !== null && realReturn !== undefined) {
      returnPct = realReturn
      source = 'history'
      realDataWeight += weight
    } else {
      const beta = betaBySymbol.get(symbol)
      returnPct = (beta ?? 1) * marketReturnPct
      source = 'beta'
    }

    portfolioReturn += weight * returnPct
    positions.push({ symbol, weightPct: round2(weight * 100), returnPct: round2(returnPct), source })
  })

  if (positions.length === 0) return null
  positions.sort((a, b) => a.returnPct - b.returnPct)

  return {
    ...scenario,
    marketReturnPct: round2(marketReturnPct),
    portfolioReturnPct: round2(portfolioReturn),
    portfolioImpactEur: Math.round((portfolioReturn / 100) * currentSecuritiesValue),
    realDataWeightPct: round2(realDataWeight * 100),
    positions,
  }
}

/**
 * Beta einer Position gegenüber einer Benchmark aus gemeinsamen Handelstagen.
 * Für den Stresstest-Fallback; unter MIN_CORR_OBS Überlappung → null.
 */
export function computeAssetBeta(
  assetSeries: QuantSeriesPoint[],
  benchmarkSeries: QuantSeriesPoint[],
): number | null {
  const assetReturns = dailyReturnMap(assetSeries)
  const benchReturns = dailyReturnMap(benchmarkSeries)
  const pairsA: number[] = []
  const pairsB: number[] = []
  assetReturns.forEach((ra, date) => {
    const rb = benchReturns.get(date)
    if (rb !== undefined) {
      pairsA.push(ra)
      pairsB.push(rb)
    }
  })
  if (pairsA.length < MIN_CORR_OBS) return null

  const meanA = mean(pairsA)
  const meanB = mean(pairsB)
  let cov = 0
  let varB = 0
  for (let k = 0; k < pairsA.length; k++) {
    cov += (pairsA[k] - meanA) * (pairsB[k] - meanB)
    varB += (pairsB[k] - meanB) ** 2
  }
  if (varB <= 0) return null
  return round2(cov / varB)
}

/**
 * Rendite eines Wertpapiers innerhalb eines Szenario-Fensters, in %.
 * Verlangt Kurse nahe an beiden Fensterrändern (±10 Tage Toleranz für
 * Feiertage/Lücken) — sonst existierte das Papier damals nicht vollständig
 * und die Antwort wäre eine stille Halbwahrheit → null.
 */
export function windowReturnPct(
  series: QuantSeriesPoint[],
  from: string,
  to: string,
  toleranceDays = 10,
): number | null {
  const sorted = sortSeries(series)
  if (sorted.length < 2) return null

  const toleranceMs = toleranceDays * 86400000
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()

  // Toleranz nur nach INNEN: erster Kurs ab Fensterstart bzw. letzter Kurs bis
  // Fensterende, jeweils max. toleranceDays vom Rand entfernt. Nach außen zu
  // greifen würde still ein längeres Fenster messen als behauptet.
  const start = sorted.find(p => new Date(p.date).getTime() >= fromMs)
  if (!start || new Date(start.date).getTime() > fromMs + toleranceMs) return null

  let end: QuantSeriesPoint | null = null
  for (const p of sorted) {
    if (new Date(p.date).getTime() > toMs) break
    end = p
  }
  if (!end || new Date(end.date).getTime() < toMs - toleranceMs) return null
  if (end.date <= start.date) return null

  return round2((end.value / start.value - 1) * 100)
}

// ---------------------------------------------------------------------------
// 4. Fama-French-Faktorregression
// ---------------------------------------------------------------------------

/** Zeile der Faktordatei: Dezimal-Tagesrenditen (USD) */
export type FactorRow = [date: string, mktRf: number, smb: number, hml: number, rmw: number, cma: number, rf: number]

export const FACTOR_KEYS = ['mktRf', 'smb', 'hml', 'rmw', 'cma'] as const
export type FactorKey = (typeof FACTOR_KEYS)[number]

export interface FactorLoading {
  key: FactorKey
  beta: number
  tStat: number | null
  /** |t| >= 2 — Faustwert für "statistisch belastbar" */
  significant: boolean
}

export interface FactorRegressionResult {
  nObs: number
  from: string
  to: string
  /** Annualisiertes Alpha in % (Rendite jenseits der Faktor-Erklärung) */
  alphaAnnualPct: number
  alphaTStat: number | null
  alphaSignificant: boolean
  r2: number
  loadings: FactorLoading[]
}

/** Lineares Gleichungssystem lösen (Gauss-Jordan) — für die Normalengleichung. */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null
    ;[M[col], M[pivot]] = [M[pivot], M[col]]
    const div = M[col][col]
    for (let k = col; k <= n; k++) M[col][k] /= div
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = M[row][col]
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k]
    }
  }
  return M.map(row => row[n])
}

/** Inverse einer symmetrischen Matrix via spaltenweisem Gauss-Jordan. */
function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length
  const inv: number[][] = []
  for (let col = 0; col < n; col++) {
    const e = Array(n).fill(0)
    e[col] = 1
    const x = solveLinearSystem(A.map(r => [...r]), e)
    if (!x) return null
    inv.push(x)
  }
  // solve liefert Spalten — transponieren (bei symmetrischem A ohnehin gleich)
  return inv[0].map((_, i) => inv.map(row => row[i]))
}

/**
 * OLS-Regression der täglichen Überrendite des Depots (USD, nach Abzug des
 * risikofreien Zinses aus der Faktordatei) auf die fünf Fama-French-Faktoren.
 * Die Faktoren sind USD-denominiert — der Aufrufer muss die Depot-Renditen
 * vorher in USD umrechnen, sonst landet der EUR/USD-Effekt im Alpha.
 */
export function computeFactorRegression(
  portfolioReturnsUsdByDate: Map<string, number>,
  factorRows: FactorRow[],
): FactorRegressionResult | null {
  // Gemeinsame Handelstage: Depotrendite ∩ Faktordaten
  const y: number[] = []
  const X: number[][] = []
  const dates: string[] = []
  for (const [date, mktRf, smb, hml, rmw, cma, rf] of factorRows) {
    const r = portfolioReturnsUsdByDate.get(date)
    if (r === undefined) continue
    y.push(r - rf)
    X.push([1, mktRf, smb, hml, rmw, cma])
    dates.push(date)
  }
  const n = y.length
  const k = 6 // Intercept + 5 Faktoren
  if (n < MIN_SERIES_OBS) return null

  // Normalengleichung: (X'X) β = X'y
  const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0))
  const Xty: number[] = Array(k).fill(0)
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i]
      for (let b = a; b < k; b++) XtX[a][b] += X[i][a] * X[i][b]
    }
  }
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a]
  }

  const beta = solveLinearSystem(XtX.map(r => [...r]), Xty)
  if (!beta) return null

  // R² und Residualvarianz für t-Statistiken
  let ssRes = 0
  let ssTot = 0
  const meanY = mean(y)
  for (let i = 0; i < n; i++) {
    let fitted = 0
    for (let a = 0; a < k; a++) fitted += beta[a] * X[i][a]
    ssRes += (y[i] - fitted) ** 2
    ssTot += (y[i] - meanY) ** 2
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
  const sigma2 = ssRes / (n - k)
  const XtXinv = invertMatrix(XtX)
  const tStat = (idx: number): number | null => {
    if (!XtXinv) return null
    const se = Math.sqrt(sigma2 * XtXinv[idx][idx])
    return se > 0 ? Math.round((beta[idx] / se) * 100) / 100 : null
  }

  const alphaT = tStat(0)
  return {
    nObs: n,
    from: dates[0],
    to: dates[dates.length - 1],
    alphaAnnualPct: round2(beta[0] * TRADING_DAYS * 100),
    alphaTStat: alphaT,
    alphaSignificant: alphaT !== null && Math.abs(alphaT) >= 2,
    r2: round2(r2),
    loadings: FACTOR_KEYS.map((key, i) => {
      const t = tStat(i + 1)
      return {
        key,
        beta: round2(beta[i + 1]),
        tStat: t,
        significant: t !== null && Math.abs(t) >= 2,
      }
    }),
  }
}
