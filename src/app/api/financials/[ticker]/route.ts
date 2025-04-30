// src/app/api/financials/[ticker]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  const urlObj  = new URL(req.url)
  const qPeriod = urlObj.searchParams.get('period')
  const period  = qPeriod === 'quarterly' ? 'quarter' : 'annual'
  const limitQ  = parseInt(urlObj.searchParams.get('limit') || '', 10)
  const limit   = !isNaN(limitQ) ? limitQ : (period === 'quarter' ? 60 : 20)

  const fetchJson = async (u: string) => {
    const r = await fetch(u)
    if (!r.ok) throw new Error(`FMP fetch failed: ${u}`)
    return r.json()
  }

  // 1) Income / Cashflow / Balance parallel
  const incUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}` +
                 `?period=${period}&limit=${limit}&apikey=${apiKey}`
  const cfUrl  = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}` +
                 `?period=${period}&limit=${limit}&apikey=${apiKey}`
  const bsUrl  = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}` +
                 `?period=${period}&limit=${limit}&apikey=${apiKey}`

  const [incData, cfData, bsData]: any[] = await Promise.all([
    fetchJson(incUrl),
    fetchJson(cfUrl),
    fetchJson(bsUrl),
  ])

  // 2) Key-Metrics (premium endpoint)
  const kmUrl = `https://financialmodelingprep.com/api/v3/key-metrics/${ticker}` +
                `?period=${period}&limit=1&apikey=${apiKey}`
  let keyMetrics: Record<string, any> = {}
  try {
    const kmData = await fetchJson(kmUrl)
    keyMetrics = Array.isArray(kmData) && kmData.length > 0 ? kmData[0] : {}
  } catch {
    keyMetrics = {}
  }

  // 3) Fallback aus Profile holen, falls einzelne Kennzahlen fehlen
  const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`
  try {
    const prof = await fetchJson(profileUrl)
    const p    = Array.isArray(prof) && prof[0] ? prof[0] : {}

    // mappe nur, wenn in keyMetrics noch undefined
    keyMetrics.marketCap                    ??= p.mktCap
    keyMetrics.pe                           ??= p.pe
    keyMetrics.priceToSalesTrailing12Months ??= p.priceToSales
    keyMetrics.freeCashFlowYield            ??= p.freeCashFlowYield
    keyMetrics.dividendYield                ??= p.dividendYield
    keyMetrics.payoutRatio                  ??= p.payoutRatio
    keyMetrics.exDividendDate               ??= p.exDividendDate
    keyMetrics.declaredDividendDate         ??= p.declaredDividendDate

    // **KORRIGIERT**: cash & debt & netDebt & roic aus Profil
    // mappe cashAndCashEquivalents auf cashAndShortTermInvestments
    keyMetrics.cashAndShortTermInvestments  ??= p.cashAndCashEquivalents
    keyMetrics.totalDebt                    ??= p.totalDebt
    keyMetrics.netDebt                      ??= p.netDebt
    keyMetrics.roic                         ??= p.roic
  } catch {
    // ignore
  }

  // 4) Daten-Mapping für deinen Chart-Client wie gehabt
  const data = incData.map((inc: any) => {
    const isQuarter = period === 'quarter'
    const keyMatch  = isQuarter ? 'date' : 'calendarYear'
    const matchVal  = inc[keyMatch]
    const cfRow = cfData.find((c: any) => c[keyMatch] === matchVal) || {}
    const bsRow = bsData.find((b: any) => b[keyMatch] === matchVal) || {}

    return {
      year:          isQuarter ? undefined : Number(inc.calendarYear),
      quarter:       isQuarter ? inc.date : undefined,
      revenue:       inc.revenue            / 1_000_000,
      ebitda:        inc.ebitda             / 1_000_000,
      eps:           inc.eps,
      freeCashFlow:  cfRow.freeCashFlow      / 1_000_000 || 0,
      dividend:      (cfRow.dividendsPaid ? -cfRow.dividendsPaid : 0) || 0,
      cash:          bsRow.cashAndCashEquivalents    / 1_000_000 || 0,
      debt:          bsRow.totalLiabilities          / 1_000_000 || 0,
      sharesOutstanding:
        bsRow.commonStockSharesOutstanding || bsRow.commonStock || 0,
    }
  })

  return NextResponse.json({ data, keyMetrics })
}