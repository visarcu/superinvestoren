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
