export type PortfolioTwrTransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'cash_deposit'
  | 'cash_withdrawal'
  | 'transfer_in'
  | 'transfer_out'

export interface PortfolioTwrPoint {
  date: string
  value: number
}

export interface PortfolioTwrTransaction {
  date: string
  type: PortfolioTwrTransactionType
  quantity?: number
  price?: number
  total_value?: number
  fee?: number
  notes?: string | null
}

interface MappedTransaction extends PortfolioTwrTransaction {
  chartDate: string
  amount: number
  feeAmount: number
}

interface CalculatePortfolioTwrOptions {
  chartData: PortfolioTwrPoint[]
  transactions: PortfolioTwrTransaction[]
  cashPosition: number
  useTransactions: boolean
}

const CASH_LEDGER_EPSILON = 1

function transactionAmount(tx: PortfolioTwrTransaction): number {
  const totalValue = Number(tx.total_value) || 0
  if (totalValue > 0) return totalValue

  return Math.abs((Number(tx.quantity) || 0) * (Number(tx.price) || 0))
}

function transactionFee(tx: PortfolioTwrTransaction): number {
  return Math.abs(Number(tx.fee) || 0)
}

function findNextChartDate(sortedDates: string[], date: string): string | null {
  let low = 0
  let high = sortedDates.length - 1
  let result: string | null = null

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (sortedDates[mid] >= date) {
      result = sortedDates[mid]
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return result
}

function mapTransactionsToChartDates(
  transactions: PortfolioTwrTransaction[],
  sortedDates: string[]
): MappedTransaction[] {
  if (sortedDates.length === 0) return []

  return transactions
    .map(tx => {
      if (!tx.date) return null
      const chartDate = findNextChartDate(sortedDates, tx.date)
      if (!chartDate) return null

      return {
        ...tx,
        chartDate,
        amount: transactionAmount(tx),
        feeAmount: transactionFee(tx),
      }
    })
    .filter((tx): tx is MappedTransaction => tx !== null)
}

function addToMap(map: Map<string, number>, date: string, value: number) {
  if (value === 0) return
  map.set(date, (map.get(date) || 0) + value)
}

function calculateCashDelta(tx: MappedTransaction): number {
  switch (tx.type) {
    case 'cash_deposit':
      return tx.amount
    case 'cash_withdrawal':
      return -tx.amount
    case 'dividend':
      return tx.amount
    case 'buy':
      return -(tx.amount + tx.feeAmount)
    case 'sell':
      return tx.amount - tx.feeAmount
    default:
      return 0
  }
}

function calculateCashInclusiveTwrByDate(
  chartData: PortfolioTwrPoint[],
  mappedTransactions: MappedTransaction[],
  cashPosition: number
): Map<string, number> | null {
  const hasCashLedger = mappedTransactions.some(tx =>
    tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
  )

  // Manual portfolios often have buys/sells but no complete cash account. In
  // that case cash-inclusive TWR would assume a large idle starting cash balance
  // and understate later performance, so we keep the security-only model.
  if (!hasCashLedger) return null

  const cashDeltaByDate = new Map<string, number>()
  const externalFlowByDate = new Map<string, number>()

  for (const tx of mappedTransactions) {
    addToMap(cashDeltaByDate, tx.chartDate, calculateCashDelta(tx))

    if (tx.type === 'cash_deposit') {
      addToMap(externalFlowByDate, tx.chartDate, tx.amount)
    } else if (tx.type === 'cash_withdrawal') {
      addToMap(externalFlowByDate, tx.chartDate, -tx.amount)
    } else if (tx.type === 'transfer_in') {
      addToMap(externalFlowByDate, tx.chartDate, tx.amount)
    } else if (tx.type === 'transfer_out') {
      addToMap(externalFlowByDate, tx.chartDate, -tx.amount)
    }
  }

  let totalCashDelta = 0
  cashDeltaByDate.forEach(delta => {
    totalCashDelta += delta
  })

  const startingCash = (Number(cashPosition) || 0) - totalCashDelta
  if (startingCash < -CASH_LEDGER_EPSILON) return null

  const cashByDate = new Map<string, number>()
  let cash = startingCash
  let minCash = startingCash

  for (const point of chartData) {
    cash += cashDeltaByDate.get(point.date) || 0
    minCash = Math.min(minCash, cash)
    cashByDate.set(point.date, Math.abs(cash) < CASH_LEDGER_EPSILON ? 0 : cash)
  }

  if (minCash < -CASH_LEDGER_EPSILON) return null

  const twrByDate = new Map<string, number>()
  let cumulativeTWR = 1

  for (let i = 0; i < chartData.length; i++) {
    const currentTotalValue = chartData[i].value + (cashByDate.get(chartData[i].date) || 0)

    if (i === 0) {
      twrByDate.set(chartData[i].date, 0)
      continue
    }

    const prevTotalValue = chartData[i - 1].value + (cashByDate.get(chartData[i - 1].date) || 0)
    const externalFlow = externalFlowByDate.get(chartData[i].date) || 0
    const adjustedStartValue = prevTotalValue + externalFlow

    if (adjustedStartValue > 0 && currentTotalValue >= 0) {
      cumulativeTWR *= currentTotalValue / adjustedStartValue
    }

    twrByDate.set(chartData[i].date, (cumulativeTWR - 1) * 100)
  }

  return twrByDate
}

function calculateSecurityOnlyTwrByDate(
  chartData: PortfolioTwrPoint[],
  mappedTransactions: MappedTransaction[]
): Map<string, number> {
  const externalFlowByDate = new Map<string, number>()
  const incomeByDate = new Map<string, number>()

  for (const tx of mappedTransactions) {
    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      addToMap(externalFlowByDate, tx.chartDate, tx.amount + tx.feeAmount)
    } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
      addToMap(externalFlowByDate, tx.chartDate, -(tx.amount - tx.feeAmount))
    } else if (tx.type === 'dividend') {
      addToMap(incomeByDate, tx.chartDate, tx.amount)
    }
  }

  const twrByDate = new Map<string, number>()
  let cumulativeTWR = 1

  for (let i = 0; i < chartData.length; i++) {
    if (i === 0) {
      twrByDate.set(chartData[i].date, 0)
      continue
    }

    const currentDate = chartData[i].date
    const adjustedStartValue = chartData[i - 1].value + (externalFlowByDate.get(currentDate) || 0)
    const currentValueWithIncome = chartData[i].value + (incomeByDate.get(currentDate) || 0)

    if (adjustedStartValue > 0 && currentValueWithIncome >= 0) {
      cumulativeTWR *= currentValueWithIncome / adjustedStartValue
    }

    twrByDate.set(currentDate, (cumulativeTWR - 1) * 100)
  }

  return twrByDate
}

// Corporate-Action-Überträge (Splits, Spin-offs, Ticker-Umstellungen) sind
// keine externen Kapitalflüsse — der User hat kein Geld/Wertpapier zugeführt.
function isCorpActionTransfer(tx: PortfolioTwrTransaction): boolean {
  const notes = (tx.notes || '').toLowerCase()
  return (
    notes.includes('spin-off') ||
    notes.includes('spinoff') ||
    notes.includes('split') ||
    notes.includes('ticker-umstellung') ||
    notes.includes('corp action') ||
    notes.includes('corporate action')
  )
}

export interface DepositBasedSeries {
  /** Depotwert je Datum: Wertpapiere + rekonstruiertes Cash */
  valueByDate: Map<string, number>
  /** Kumulierte Netto-Einzahlungen (+ echte Depotüberträge) je Datum */
  investedByDate: Map<string, number>
}

/**
 * Einzahlungsbasierte Chart-Serie: die gestrichelte Linie zeigt das tatsächlich
 * zugeführte Kapital (Einzahlungen − Auszahlungen, plus Depotüberträge in
 * Wertpapierform), die Wert-Linie den Gesamtwert inkl. Cash. Die Differenz ist
 * damit der Gesamtgewinn inkl. realisierter Gewinne und Dividenden —
 * reinvestierte Erlöse/Dividenden blähen die Kapital-Linie nicht mehr auf.
 *
 * Liefert null, wenn das Cash-Ledger fehlt oder nicht plausibel rekonstruierbar
 * ist (Start-Cash deutlich ≠ 0 oder Cash zwischenzeitlich deutlich negativ) —
 * dann bleibt der Kostenbasis-Fallback aktiv.
 */
export function calculateDepositBasedSeries({
  chartData,
  transactions,
  cashPosition,
}: {
  chartData: PortfolioTwrPoint[]
  transactions: PortfolioTwrTransaction[]
  cashPosition: number
}): DepositBasedSeries | null {
  if (chartData.length === 0) return null

  const sortedDates = chartData.map(point => point.date)
  const mapped = mapTransactionsToChartDates(transactions, sortedDates)

  const hasCashLedger = mapped.some(
    tx => tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
  )
  if (!hasCashLedger) return null

  const cashDeltaByDate = new Map<string, number>()
  const flowByDate = new Map<string, number>()
  let totalDeposits = 0

  for (const tx of mapped) {
    addToMap(cashDeltaByDate, tx.chartDate, calculateCashDelta(tx))

    if (tx.type === 'cash_deposit') {
      addToMap(flowByDate, tx.chartDate, tx.amount)
      totalDeposits += tx.amount
    } else if (tx.type === 'cash_withdrawal') {
      addToMap(flowByDate, tx.chartDate, -tx.amount)
    } else if (tx.type === 'transfer_in' && !isCorpActionTransfer(tx)) {
      addToMap(flowByDate, tx.chartDate, tx.amount)
    } else if (tx.type === 'transfer_out' && !isCorpActionTransfer(tx)) {
      addToMap(flowByDate, tx.chartDate, -tx.amount)
    }
  }

  let totalCashDelta = 0
  cashDeltaByDate.forEach(delta => {
    totalCashDelta += delta
  })

  // Toleranz für Rundungs-/FX-Drift: absolut klein, relativ zur Einzahlungssumme
  const epsilon = Math.max(25, totalDeposits * 0.01)
  const startingCash = (Number(cashPosition) || 0) - totalCashDelta
  if (Math.abs(startingCash) > epsilon) return null

  // Zwischenzeitlich oder aktuell negatives Cash ist hier KEIN Ausschluss:
  // bei vollständigem Ledger (Start-Cash ≈ 0) ist das realer Broker-Kredit
  // und gehört in den Depotwert. Unvollständige Ledger fallen bereits über
  // den Start-Cash-Check raus.
  const valueByDate = new Map<string, number>()
  const investedByDate = new Map<string, number>()
  let cash = startingCash
  let invested = 0

  for (const point of chartData) {
    cash += cashDeltaByDate.get(point.date) || 0
    invested += flowByDate.get(point.date) || 0
    valueByDate.set(point.date, point.value + cash)
    investedByDate.set(point.date, invested)
  }

  return { valueByDate, investedByDate }
}

export interface BenchmarkSeriesPoint {
  date: string
  close: number
}

export interface BenchmarkComparisonResult {
  /** Preis-Return der Benchmark-Serie über den Chart-Zeitraum in % */
  benchmarkTotalReturnPct: number
  /** Endwert des Depots inkl. erhaltener Dividenden in EUR */
  actualFinalValue: number
  /** Endwert des Schatten-Depots (gleiche Zuflüsse in die Benchmark) in EUR */
  shadowFinalValue: number | null
  /** actualFinalValue − shadowFinalValue; negativ = Underperformance hat Geld gekostet */
  euroDiff: number | null
}

/**
 * Vergleicht das Depot mit einer Benchmark-Serie (erwartet: Total-Return-Kurse
 * in EUR, aufsteigend sortierbar).
 *
 * Für den Euro-Betrag wird ein Schatten-Depot simuliert: jeder externe
 * Wertpapier-Zufluss (buy/transfer_in inkl. Gebühren — identisch zum
 * Security-only-TWR-Flussmodell) kauft am selben Tag Benchmark-Anteile,
 * Abflüsse (sell/transfer_out) verkaufen sie. Dividenden bleiben im echten
 * Depot beim User (erhöhen actualFinalValue), in der Benchmark stecken sie
 * bereits in der Total-Return-Serie. Die Differenz der Endwerte ist damit
 * die echte, geldgewichtete Antwort auf „Was hätte derselbe Einsatz im
 * Index gebracht?".
 */
export function calculateBenchmarkComparison({
  chartData,
  transactions,
  benchmarkPrices,
}: {
  chartData: PortfolioTwrPoint[]
  transactions: PortfolioTwrTransaction[]
  benchmarkPrices: BenchmarkSeriesPoint[]
}): BenchmarkComparisonResult | null {
  if (chartData.length < 2) return null

  const prices = benchmarkPrices
    .filter(p => p.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (prices.length < 2) return null

  const priceAt = (date: string): number => {
    let last = 0
    for (const p of prices) {
      if (p.date > date) break
      last = p.close
    }
    if (last > 0) return last
    return prices.find(p => p.date >= date)?.close || 0
  }

  const startDate = chartData[0].date
  const endDate = chartData[chartData.length - 1].date
  const startPrice = priceAt(startDate)
  const endPrice = priceAt(endDate)
  if (!(startPrice > 0) || !(endPrice > 0)) return null

  const benchmarkTotalReturnPct = (endPrice / startPrice - 1) * 100

  let units = 0
  let dividends = 0
  let hasFlows = false

  const sortedTxs = [...transactions]
    .filter(tx => !!tx.date && tx.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const tx of sortedTxs) {
    if (tx.type === 'dividend') {
      dividends += transactionAmount(tx)
      continue
    }
    if (!['buy', 'sell', 'transfer_in', 'transfer_out'].includes(tx.type)) continue

    const price = priceAt(tx.date)
    if (!(price > 0)) continue

    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      units += (transactionAmount(tx) + transactionFee(tx)) / price
      hasFlows = true
    } else {
      units -= (transactionAmount(tx) - transactionFee(tx)) / price
      hasFlows = true
    }
  }

  const actualFinalValue = chartData[chartData.length - 1].value + dividends
  const shadowFinalValue = hasFlows ? units * endPrice : null
  // Negatives Schatten-Depot (Abflüsse > eingezahlte Benchmark-Anteile durch
  // Datenlücken) wäre kein sinnvoller Vergleich → dann keinen Betrag melden.
  const euroDiff = shadowFinalValue !== null && shadowFinalValue >= 0
    ? actualFinalValue - shadowFinalValue
    : null

  return { benchmarkTotalReturnPct, actualFinalValue, shadowFinalValue, euroDiff }
}

/**
 * Opportunitätskosten des Cash-Bestands gegenüber einer Benchmark.
 *
 * Rekonstruiert das Cash-Ledger (gleiche Plausibilitätsprüfung wie der
 * cash-inklusive TWR) und simuliert: Was hätte der jeweilige Tagesbestand
 * an Cash zusätzlich erwirtschaftet, wäre er durchgehend in der Benchmark
 * investiert gewesen? Die Zusatzerträge verzinsen sich mit — exakt für
 * „Cash täglich in den Index gefegt, alle Zahlungsströme unverändert".
 *
 * Gibt null zurück wenn kein plausibles Cash-Ledger existiert (dann wäre
 * jede Cash-Aussage geraten).
 */
export function calculateCashDragVsBenchmark({
  chartData,
  transactions,
  cashPosition,
  benchmarkPrices,
}: {
  chartData: PortfolioTwrPoint[]
  transactions: PortfolioTwrTransaction[]
  cashPosition: number
  benchmarkPrices: BenchmarkSeriesPoint[]
}): number | null {
  if (chartData.length < 2) return null

  const prices = benchmarkPrices
    .filter(p => p.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (prices.length < 2) return null

  const sortedDates = chartData.map(point => point.date)
  const mappedTransactions = mapTransactionsToChartDates(transactions, sortedDates)

  const hasCashLedger = mappedTransactions.some(tx =>
    tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
  )
  if (!hasCashLedger) return null

  const cashDeltaByDate = new Map<string, number>()
  for (const tx of mappedTransactions) {
    addToMap(cashDeltaByDate, tx.chartDate, calculateCashDelta(tx))
  }

  let totalCashDelta = 0
  cashDeltaByDate.forEach(delta => {
    totalCashDelta += delta
  })

  const startingCash = (Number(cashPosition) || 0) - totalCashDelta
  if (startingCash < -CASH_LEDGER_EPSILON) return null

  const priceAt = (date: string): number => {
    let last = 0
    for (const p of prices) {
      if (p.date > date) break
      last = p.close
    }
    if (last > 0) return last
    return prices.find(p => p.date >= date)?.close || 0
  }

  let cash = startingCash
  let extraEarnings = 0
  let prevPrice = priceAt(chartData[0].date)
  cash += cashDeltaByDate.get(chartData[0].date) || 0
  if (cash < -CASH_LEDGER_EPSILON) return null

  for (let i = 1; i < chartData.length; i++) {
    const price = priceAt(chartData[i].date)
    if (prevPrice > 0 && price > 0) {
      const growth = price / prevPrice
      extraEarnings = extraEarnings * growth + Math.max(cash, 0) * (growth - 1)
    }
    if (price > 0) prevPrice = price

    cash += cashDeltaByDate.get(chartData[i].date) || 0
    if (cash < -CASH_LEDGER_EPSILON) return null
  }

  return extraEarnings
}

export function calculatePortfolioTwrByDate({
  chartData,
  transactions,
  cashPosition,
  useTransactions,
}: CalculatePortfolioTwrOptions): Map<string, number> {
  if (chartData.length === 0) return new Map()

  if (!useTransactions) {
    return calculateSecurityOnlyTwrByDate(chartData, [])
  }

  const sortedDates = chartData.map(point => point.date)
  const mappedTransactions = mapTransactionsToChartDates(transactions, sortedDates)
  const cashInclusiveTwr = calculateCashInclusiveTwrByDate(
    chartData,
    mappedTransactions,
    cashPosition
  )

  return cashInclusiveTwr ?? calculateSecurityOnlyTwrByDate(chartData, mappedTransactions)
}
