// src/app/api/compare-stocks/route.ts
import { NextResponse } from 'next/server'

const FMP_KEY = process.env.FMP_API_KEY!

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers')?.split(',') || []
  const metrics = searchParams.get('metrics')?.split(',') || ['revenue']
  const period = searchParams.get('period') || 'annual'
  const years = parseInt(searchParams.get('years') || '10')

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  try {
    const allData: Record<string, any> = {}

    // Lade Daten für alle Ticker parallel
    await Promise.all(tickers.map(async (ticker) => {
      const [income, balance, cashFlow, keyMetrics, quote] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${years}&apikey=${FMP_KEY}`).then(r => r.json()),
        fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${years}&apikey=${FMP_KEY}`).then(r => r.json()),
        fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${years}&apikey=${FMP_KEY}`).then(r => r.json()),
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=${period}&limit=${years}&apikey=${FMP_KEY}`).then(r => r.json()),
        fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${FMP_KEY}`).then(r => r.json())
      ])

      // Kombiniere Daten
      const combinedData = income.map((inc: any, index: number) => {
        const bal = balance[index] || {}
        const cf = cashFlow[index] || {}
        const km = keyMetrics[index] || {}
        
        return {
          year: inc.calendarYear || inc.date?.slice(0, 4),
          revenue: inc.revenue,
          netIncome: inc.netIncome,
          eps: inc.eps,
          ebitda: inc.ebitda,
          operatingIncome: inc.operatingIncome,
          grossProfit: inc.grossProfit,
          researchAndDevelopmentExpenses: inc.researchAndDevelopmentExpenses,
          
          // Balance Sheet
          totalAssets: bal.totalAssets,
          totalDebt: bal.totalDebt,
          cash: bal.cashAndCashEquivalents,
          totalEquity: bal.totalEquity,
          
          // Cash Flow
          freeCashFlow: cf.freeCashFlow,
          operatingCashFlow: cf.operatingCashFlow,
          capitalExpenditure: Math.abs(cf.capitalExpenditure),
          
          // Key Metrics
          peRatio: km.peRatio,
          pbRatio: km.pbRatio,
          psRatio: km.priceToSalesRatio,
          dividendYield: km.dividendYield,
          roe: km.roe,
          roa: km.returnOnTangibleAssets,
          currentRatio: km.currentRatio,
          debtToEquity: km.debtToEquity,
          
          // Margins
          grossMargin: inc.grossProfitRatio,
          operatingMargin: inc.operatingIncomeRatio,
          netMargin: inc.netIncomeRatio,
        }
      })

      allData[ticker] = {
        data: combinedData.reverse(), // Chronologische Reihenfolge
        currentPrice: quote[0]?.price,
        marketCap: quote[0]?.marketCap,
        name: quote[0]?.name
      }
    }))

    return NextResponse.json(allData)
  } catch (error) {
    console.error('Error fetching comparison data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}