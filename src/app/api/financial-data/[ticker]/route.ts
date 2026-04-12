import { NextRequest, NextResponse } from 'next/server'
import { getFinancialData as getSecData } from '@/lib/sec/secDataStore'

// ─── SEC → FMP Format Adapter ────────────────────────────────────────────────
// Wandelt SEC XBRL Daten ins FMP Income-Statement Format um,
// sodass der Client (FinancialAnalysisClient) nichts ändern muss.

// SEC Override: Alle verfügbaren Metriken aus SEC XBRL
interface SecOverride {
  // Income Statement
  revenue?: number
  netIncome?: number
  grossProfit?: number
  operatingIncome?: number
  costOfRevenue?: number
  eps?: number
  researchAndDevelopmentExpenses?: number
  sellingGeneralAndAdministrative?: number
  incomeTaxExpense?: number
  depreciationAndAmortization?: number
  // Balance Sheet
  totalAssets?: number
  totalLiabilities?: number
  stockholdersEquity?: number
  cashAndShortTermInvestments?: number
  cashAndCashEquivalents?: number
  longTermDebt?: number
  totalDebt?: number
  inventory?: number
  netReceivables?: number
  accountPayables?: number
  goodwill?: number
  propertyPlantEquipmentNet?: number
  commonStockSharesOutstanding?: number
  weightedAverageShsOut?: number
  // Cash Flow
  operatingCashFlow?: number
  capitalExpenditure?: number
  freeCashFlow?: number
  dividendsPaid?: number
  commonStockRepurchased?: number
}

async function getSecOverrides(
  ticker: string,
  period: 'annual' | 'quarterly',
  years: number
): Promise<{ overrides: Map<string, SecOverride>; source: 'sec-xbrl' | 'none' }> {
  if (period !== 'annual') {
    return { overrides: new Map(), source: 'none' }
  }

  try {
    const secData = await getSecData(ticker, { years, period: 'annual' })

    if (!secData.periods || secData.periods.length === 0) {
      return { overrides: new Map(), source: 'none' }
    }

    const overrides = new Map<string, SecOverride>()

    for (const p of secData.periods) {
      const year = p.period
      const o: SecOverride = {}

      // Income Statement
      if (p.revenue !== null) o.revenue = p.revenue
      if (p.netIncome !== null) o.netIncome = p.netIncome
      if (p.grossProfit !== null) o.grossProfit = p.grossProfit
      if (p.operatingIncome !== null) o.operatingIncome = p.operatingIncome
      if (p.costOfRevenue !== null) o.costOfRevenue = p.costOfRevenue
      if (p.eps !== null) o.eps = p.eps
      if (p.rd !== null) o.researchAndDevelopmentExpenses = p.rd
      if (p.sga !== null) o.sellingGeneralAndAdministrative = p.sga
      if (p.incomeTax !== null) o.incomeTaxExpense = p.incomeTax
      if (p.depreciation !== null) o.depreciationAndAmortization = p.depreciation
      // Balance Sheet
      if (p.totalAssets !== null) o.totalAssets = p.totalAssets
      if (p.totalLiabilities !== null) o.totalLiabilities = p.totalLiabilities
      if (p.shareholdersEquity !== null) o.stockholdersEquity = p.shareholdersEquity
      if (p.cash !== null) { o.cashAndShortTermInvestments = p.cash; o.cashAndCashEquivalents = p.cash }
      if (p.longTermDebt !== null) o.longTermDebt = p.longTermDebt
      if (p.totalDebt !== null) o.totalDebt = p.totalDebt
      if (p.inventory !== null) o.inventory = p.inventory
      if (p.accountsReceivable !== null) o.netReceivables = p.accountsReceivable
      if (p.accountsPayable !== null) o.accountPayables = p.accountsPayable
      if (p.goodwill !== null) o.goodwill = p.goodwill
      if (p.propertyPlantEquip !== null) o.propertyPlantEquipmentNet = p.propertyPlantEquip
      if (p.sharesOutstanding !== null) { o.commonStockSharesOutstanding = p.sharesOutstanding; o.weightedAverageShsOut = p.sharesOutstanding }
      // Cash Flow
      if (p.operatingCashFlow !== null) o.operatingCashFlow = p.operatingCashFlow
      if (p.capex !== null) o.capitalExpenditure = -Math.abs(p.capex) // FMP speichert CapEx als negativ
      if (p.freeCashFlow !== null) o.freeCashFlow = p.freeCashFlow
      if (p.dividendsPaid !== null) o.dividendsPaid = -Math.abs(p.dividendsPaid) // FMP: negativ
      if (p.shareRepurchase !== null) o.commonStockRepurchased = -Math.abs(p.shareRepurchase) // FMP: negativ

      if (Object.keys(o).length > 0) {
        overrides.set(year, o)
      }
    }

    console.log(`✅ [SEC] ${ticker}: ${overrides.size} Jahre, alle Metriken von SEC XBRL`)
    return { overrides, source: 'sec-xbrl' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    console.warn(`⚠️ [SEC] Fallback auf FMP für ${ticker}: ${msg}`)
    return { overrides: new Map(), source: 'none' }
  }
}

// ─── Main Route ──────────────────────────────────────────────────────────────

interface FinancialDataResponse {
  incomeStatements: any[]
  balanceSheets: any[]
  cashFlows: any[]
  keyMetrics: any[]
  dividends: any[]
  ticker: string
  period: string
  years: number
  _dataSource?: {
    revenue: 'sec-xbrl' | 'fmp'
    netIncome: 'sec-xbrl' | 'fmp'
    other: 'fmp'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const { searchParams } = new URL(request.url)

  const years = parseInt(searchParams.get('years') || '5')
  const period = searchParams.get('period') || 'annual'

  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }
  if (!['annual', 'quarterly'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }
  if (years < 1 || years > 20) {
    return NextResponse.json({ error: 'Invalid years range (1-20)' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const requestLimit = years * (period === 'quarterly' ? 4 : 1)

    // ── Parallel: SEC XBRL + FMP laden ──────────────────────────────────
    const [
      secResult,
      incomeRes,
      balanceRes,
      cashFlowRes,
      keyMetricsRes,
      dividendsRes
    ] = await Promise.all([
      getSecOverrides(ticker.toUpperCase(), period as 'annual' | 'quarterly', years),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 7200 }
      })
    ])

    // ── FMP Responses verarbeiten ────────────────────────────────────────
    let incomeStatements = incomeRes.ok ? await incomeRes.json() : []
    let balanceSheets = balanceRes.ok ? await balanceRes.json() : []
    let cashFlows = cashFlowRes.ok ? await cashFlowRes.json() : []
    const keyMetrics = keyMetricsRes.ok ? await keyMetricsRes.json() : []
    const dividendsData = dividendsRes.ok ? await dividendsRes.json() : null
    const dividends = dividendsData?.historical || []

    incomeStatements = Array.isArray(incomeStatements) ? incomeStatements : []

    // ── SEC-Overrides anwenden (ALLE Metriken) ────────────────────────────
    const { overrides, source: secSource } = secResult
    let dataSource: 'sec-xbrl' | 'fmp' = 'fmp'

    if (secSource === 'sec-xbrl' && overrides.size > 0) {
      let secPeriodsApplied = 0

      // Income Statements patchen
      incomeStatements = incomeStatements.map((stmt: any) => {
        const year = stmt.calendarYear || stmt.date?.slice(0, 4)
        if (!year) return stmt
        const o = overrides.get(year)
        if (!o) return stmt
        secPeriodsApplied++
        return {
          ...stmt,
          // Income Statement Felder
          ...(o.revenue !== undefined && { revenue: o.revenue }),
          ...(o.netIncome !== undefined && { netIncome: o.netIncome }),
          ...(o.grossProfit !== undefined && { grossProfit: o.grossProfit }),
          ...(o.operatingIncome !== undefined && { operatingIncome: o.operatingIncome }),
          ...(o.costOfRevenue !== undefined && { costOfGoodsAndServicesSold: o.costOfRevenue, costOfRevenue: o.costOfRevenue }),
          ...(o.eps !== undefined && { eps: o.eps }),
          ...(o.researchAndDevelopmentExpenses !== undefined && { researchAndDevelopmentExpenses: o.researchAndDevelopmentExpenses }),
          ...(o.sellingGeneralAndAdministrative !== undefined && { sellingGeneralAndAdministrative: o.sellingGeneralAndAdministrative }),
          ...(o.incomeTaxExpense !== undefined && { incomeTaxExpense: o.incomeTaxExpense }),
          ...(o.depreciationAndAmortization !== undefined && { depreciationAndAmortization: o.depreciationAndAmortization }),
          // Shares (auch im Income Statement für EPS-Berechnung)
          ...(o.weightedAverageShsOut !== undefined && { weightedAverageShsOut: o.weightedAverageShsOut }),
          _source: 'sec-xbrl',
        }
      })

      // Balance Sheets patchen
      balanceSheets = (Array.isArray(balanceSheets) ? balanceSheets : []).map((stmt: any) => {
        const year = stmt.calendarYear || stmt.date?.slice(0, 4)
        if (!year) return stmt
        const o = overrides.get(year)
        if (!o) return stmt
        return {
          ...stmt,
          ...(o.totalAssets !== undefined && { totalAssets: o.totalAssets }),
          ...(o.totalLiabilities !== undefined && { totalLiabilities: o.totalLiabilities }),
          ...(o.stockholdersEquity !== undefined && { totalStockholdersEquity: o.stockholdersEquity, stockholdersEquity: o.stockholdersEquity }),
          ...(o.cashAndCashEquivalents !== undefined && { cashAndCashEquivalents: o.cashAndCashEquivalents }),
          ...(o.cashAndShortTermInvestments !== undefined && { cashAndShortTermInvestments: o.cashAndShortTermInvestments }),
          ...(o.longTermDebt !== undefined && { longTermDebt: o.longTermDebt }),
          ...(o.totalDebt !== undefined && { totalDebt: o.totalDebt }),
          ...(o.inventory !== undefined && { inventory: o.inventory }),
          ...(o.netReceivables !== undefined && { netReceivables: o.netReceivables }),
          ...(o.accountPayables !== undefined && { accountPayables: o.accountPayables }),
          ...(o.goodwill !== undefined && { goodwill: o.goodwill }),
          ...(o.propertyPlantEquipmentNet !== undefined && { propertyPlantEquipmentNet: o.propertyPlantEquipmentNet }),
          ...(o.commonStockSharesOutstanding !== undefined && { commonStockSharesOutstanding: o.commonStockSharesOutstanding }),
          _source: 'sec-xbrl',
        }
      })

      // Cash Flows patchen
      cashFlows = (Array.isArray(cashFlows) ? cashFlows : []).map((stmt: any) => {
        const year = stmt.calendarYear || stmt.date?.slice(0, 4)
        if (!year) return stmt
        const o = overrides.get(year)
        if (!o) return stmt
        return {
          ...stmt,
          ...(o.operatingCashFlow !== undefined && { operatingCashFlow: o.operatingCashFlow }),
          ...(o.capitalExpenditure !== undefined && { capitalExpenditure: o.capitalExpenditure }),
          ...(o.freeCashFlow !== undefined && { freeCashFlow: o.freeCashFlow }),
          ...(o.dividendsPaid !== undefined && { dividendsPaid: o.dividendsPaid }),
          ...(o.commonStockRepurchased !== undefined && { commonStockRepurchased: o.commonStockRepurchased }),
          ...(o.depreciationAndAmortization !== undefined && { depreciationAndAmortization: o.depreciationAndAmortization }),
          _source: 'sec-xbrl',
        }
      })

      if (secPeriodsApplied > 0) dataSource = 'sec-xbrl'
      console.log(`📊 [SEC→FMP Merge] ${ticker}: ${secPeriodsApplied}/${incomeStatements.length} Perioden von SEC XBRL (Income+Balance+CashFlow)`)
    }

    const response: FinancialDataResponse = {
      incomeStatements,
      balanceSheets: Array.isArray(balanceSheets) ? balanceSheets : [],
      cashFlows: Array.isArray(cashFlows) ? cashFlows : [],
      keyMetrics: Array.isArray(keyMetrics) ? keyMetrics : [],
      dividends: Array.isArray(dividends) ? dividends : [],
      ticker: ticker.toUpperCase(),
      period,
      years,
      _dataSource: {
        financials: dataSource,
        keyMetrics: 'fmp',
        dividends: 'fmp',
      },
    }

    console.log(`✅ Financial data for ${ticker}: ${incomeStatements.length} periods [Source: ${dataSource}]`)

    return NextResponse.json(response)

  } catch (error) {
    console.error(`Financial data error for ${ticker}:`, error)
    return NextResponse.json({
      error: 'Failed to fetch financial data',
      incomeStatements: [],
      balanceSheets: [],
      cashFlows: [],
      keyMetrics: [],
      dividends: [],
      ticker,
      period,
      years
    }, { status: 500 })
  }
}
