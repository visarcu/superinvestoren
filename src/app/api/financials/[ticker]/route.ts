// src/app/api/financials/[ticker]/route.ts - Mit Income Statement Fallback für vor 2021
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

  async function fetchJson(u: string) {
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

  // ── NEU: TTM-Serie für ROE holen ───────────────────────────────────
  let roeMap: Record<string, number> = {}
  try {
    const ttmUrl = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}` +
                   `?period=${period}&limit=${limit}&apikey=${apiKey}`
    const ttmArr: any[] = await fetchJson(ttmUrl)
    ttmArr.forEach(e => {
      const lab = period === 'quarter'
        ? e.date.slice(0,7)
        : String(e.calendarYear)
      roeMap[lab] = e.returnOnEquity ?? 0
    })
  } catch {
    // ignore
  }

  // 3) Fallback aus Profile holen, falls einzelne Kennzahlen fehlen
  const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`
  try {
    const prof = await fetchJson(profileUrl)
    const p    = Array.isArray(prof) && prof[0] ? prof[0] : {}

    keyMetrics.marketCap                   ??= p.mktCap
    keyMetrics.pe                          ??= p.pe
    keyMetrics.priceToSalesRatio          ??= p.priceToSalesRatio
    keyMetrics.freeCashFlowYield           ??= p.freeCashFlowYield
    keyMetrics.dividendYield               ??= p.dividendYield
    keyMetrics.payoutRatio                 ??= p.payoutRatio
    keyMetrics.exDividendDate              ??= p.exDividendDate
    keyMetrics.declaredDividendDate        ??= p.declaredDividendDate

    keyMetrics.cashAndShortTermInvestments ??= p.cashAndCashEquivalents
    keyMetrics.totalDebt                   ??= p.totalDebt
    keyMetrics.netDebt                     ??= p.netDebt
    keyMetrics.roic                        ??= p.roic
  } catch {
    // ignore
  }

  // 4) Einmalig: dividendPerShareTTM aus Company-Outlook (v4)
  try {
    const outlookUrl = `https://financialmodelingprep.com/api/v4/company-outlook?symbol=${ticker}&apikey=${apiKey}`
    const outArr: any[] = await fetchJson(outlookUrl)
    if (Array.isArray(outArr) && outArr.length > 0) {
      keyMetrics.dividendPerShareTTM = outArr[0].dividendPerShareTTM ?? null
    }
  } catch {
    // ignore
  }

  // 5) Historische Dividende je Aktie (TTM) aus Key-Metrics-TTM
  let histDivPS: Array<{ calendarYear: number; date: string; dividendPerShareTTM: number }> = []
  try {
    const histUrl = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}` +
                    `?period=${period}&limit=${limit}&apikey=${apiKey}`
    const histArr: any[] = await fetchJson(histUrl)
    histDivPS = histArr.map(e => ({
      calendarYear: Number(e.calendarYear),
      date:         e.date,
      dividendPerShareTTM: e.dividendPerShareTTM ?? 0
    }))
  } catch {
    // ignore
  }

  // 6) ✅ AKTUELLE SHARES (neue API)
  let currentOutstandingShares: number | null = null
  try {
    const currentSharesUrl = `https://financialmodelingprep.com/stable/shares-float?symbol=${ticker}&apikey=${apiKey}`
    const currentSharesData: any[] = await fetchJson(currentSharesUrl)
    
    if (Array.isArray(currentSharesData) && currentSharesData.length > 0) {
      currentOutstandingShares = currentSharesData[0].outstandingShares
      if (currentOutstandingShares !== null) {
        console.log(`✅ Current Outstanding Shares for ${ticker}: ${(currentOutstandingShares / 1e9).toFixed(2)} Mrd`)
      }
    }
  } catch (error) {
    console.log('❌ Current Shares API failed:', error)
  }

  // 7) ✅ HISTORISCHE SHARES (korrekte v4 API ab 2021)
  let sharesByPeriod: Record<string, number> = {}
  try {
    const histSharesUrl = `https://financialmodelingprep.com/api/v4/historical/shares_float?symbol=${ticker}&apikey=${apiKey}`
    const histSharesData: any[] = await fetchJson(histSharesUrl)
    
    console.log(`✅ Historical Shares API returned ${histSharesData.length} records for ${ticker}`)
    
    histSharesData.forEach((s) => {
      const year = s.date.slice(0, 4)
      const quarter = s.date.slice(0, 7)
      
      if (period === 'quarter') {
        if (!sharesByPeriod[quarter] || s.date > (sharesByPeriod[quarter + '_date'] || '')) {
          sharesByPeriod[quarter] = s.outstandingShares
          sharesByPeriod[quarter + '_date'] = s.date
        }
      } else {
        if (!sharesByPeriod[year] || s.date > (sharesByPeriod[year + '_date'] || '')) {
          sharesByPeriod[year] = s.outstandingShares
          sharesByPeriod[year + '_date'] = s.date
        }
      }
    })
    
    console.log(`✅ Processed historical shares for ${Object.keys(sharesByPeriod).filter(k => !k.includes('_date')).length} periods`)
  } catch (error) {
    console.log('❌ Historical Shares v4 API failed:', error)
  }

  // 8) ✅ INCOME STATEMENT SHARES für vor 2021 (weightedAverageShsOut)
  let incomeStatementShares: Record<string, number> = {}
  incData.forEach((inc: any) => {
    const isQuarter = period === 'quarter'
    const label = isQuarter ? inc.date.slice(0, 7) : String(inc.calendarYear)
    
    // Verschiedene Felder versuchen (verschiedene Unternehmen verwenden verschiedene Namen)
    const shares = inc.weightedAverageShsOut || 
                   inc.weightedAverageShsOutDil || 
                   inc.weightedAverageSharesOutstanding ||
                   inc.weightedAverageSharesOutstandingDiluted ||
                   null
    
    if (shares && shares > 0) {
      incomeStatementShares[label] = shares
      const year = parseInt(label.slice(0, 4))
      const source = year < 2021 ? 'Income Statement (pre-2021)' : 'Income Statement'
      console.log(`📊 ${source} shares for ${label}: ${(shares / 1e9).toFixed(2)} Mrd`)
    }
  })

  // 9) Daten-Mapping für den Chart-Client
  const data = incData.map((inc: any, index: number) => {
    const isQuarter = period === 'quarter'
    const keyMatch  = isQuarter ? 'date' : 'calendarYear'
    const matchVal  = inc[keyMatch]
    const cfRow = cfData.find((c: any) => c[keyMatch] === matchVal) || {}
    const bsRow = bsData.find((b: any) => b[keyMatch] === matchVal) || {}
    
    // Label für Shares Outstanding Lookup
    const label = isQuarter ? inc.date.slice(0, 7) : String(inc.calendarYear)
    const year = parseInt(label.slice(0, 4))

    // zum passenden Jahr/quartal die Dividende/Share finden
    const divPsEntry = histDivPS.find(d =>
      isQuarter
        ? d.date === inc.date
        : d.calendarYear === Number(inc.calendarYear)
    )

    // ✅ INTELLIGENTE SHARES OUTSTANDING AUSWAHL (ERWEITERT)
    let correctShares: number
    let dataSource: string
    
    // 1. Höchste Priorität: Aktuell (nur für neueste Periode)
    if (index === 0 && currentOutstandingShares !== null) {
      correctShares = currentOutstandingShares
      dataSource = 'Current API'
    }
    // 2. Hohe Priorität: Historische v4 API (ab 2021)
    else if (sharesByPeriod[label]) {
      correctShares = sharesByPeriod[label]
      dataSource = year >= 2021 ? 'Historical v4 API' : 'Historical v4 API (unexpected)'
    }
    // 3. Mittlere Priorität: Income Statement weightedAverageShsOut (vor 2021)
    else if (incomeStatementShares[label]) {
      correctShares = incomeStatementShares[label]
      dataSource = year < 2021 ? 'Income Statement (pre-2021)' : 'Income Statement'
    }
    // 4. Niedrigste Priorität: Balance Sheet Fallback
    else {
      correctShares = bsRow.commonStockSharesOutstanding || bsRow.commonStock || 0
      dataSource = 'Balance Sheet (fallback)'
    }
    
    console.log(`📈 ${label}: ${(correctShares / 1e9).toFixed(2)} Mrd (${dataSource})`)

     // ✅ DEBUG: Schauen wir uns die ersten 2 Datensätze an
  if (index < 2) {
    console.log(`🔍 DEBUG für ${ticker} - ${inc.date || inc.calendarYear}:`)
    console.log('📊 Available Income Statement fields:', Object.keys(inc))
    console.log('🔬 R&D Field check:', {
      researchAndDevelopmentExpenses: inc.researchAndDevelopmentExpenses,
      'rnd': inc.rnd,
      'researchAndDevelopment': inc.researchAndDevelopment,
      'rdExpenses': inc.rdExpenses,
    })
    console.log('💰 Operating Income check:', {
      operatingIncome: inc.operatingIncome,
      'operatingIncomeLoss': inc.operatingIncomeLoss,
      'incomeFromOperations': inc.incomeFromOperations,
    })
  }

    return {
      year:          isQuarter ? undefined : Number(inc.calendarYear),
      quarter:       isQuarter ? inc.date : undefined,
      revenue:       inc.revenue            / 1_000_000,
      ebitda:        inc.ebitda             / 1_000_000,
      eps:           inc.eps,
      freeCashFlow:  cfRow.freeCashFlow     / 1_000_000 || 0,
      netIncome:     inc.netIncome          / 1_000_000 || 0,
      dividend:      (cfRow.dividendsPaid ? -cfRow.dividendsPaid : 0) || 0,
      cash:          bsRow.cashAndCashEquivalents    / 1_000_000 || 0,
      debt:          bsRow.totalLiabilities          / 1_000_000 || 0,
      sharesOutstanding: correctShares,
      dividendPerShareTTM: divPsEntry?.dividendPerShareTTM ?? 0,
      capEx: Math.abs(cfRow.capitalExpenditure || cfRow.investmentsInPropertyPlantAndEquipment || 0) / 1_000_000,
     // ✅ ERWEITERTE Feldnamen-Suche:
    researchAndDevelopment: (
      inc.researchAndDevelopmentExpenses || 
      inc.researchAndDevelopment || 
      inc.rnd || 
      inc.rdExpenses ||
      0
    ) / 1_000_000,
    
    operatingIncome: (
      inc.operatingIncome || 
      inc.operatingIncomeLoss || 
      inc.incomeFromOperations ||
      0
    ) / 1_000_000,
  }
})
  return NextResponse.json({ data, keyMetrics })
}