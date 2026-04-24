// Finclue Data API v1 – Portfolio History
// POST /api/v1/portfolio/history
// Body: { portfolioId?, portfolioIds?, holdings, cashPosition, days }
//
// Liefert Portfolio-Wertentwicklung in EUR + TWR vs. Benchmark-Performance.
// Datenquelle: EODHD (historische EOD + FX). Logik 1:1 aus Production
// /api/portfolio-history übernommen, nur die Preis-Quelle wurde getauscht.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEodhdHistorical, getEodhdFxHistory } from '@/lib/eodhdService'

interface HoldingInput {
  symbol: string
  quantity: number
  purchase_date?: string
  purchase_price?: number
}

interface Transaction {
  date: string
  symbol: string
  quantity: number
  price: number
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out'
}

// Erkennt ob ein Ticker in EUR notiert ist (DB nutzt FMP-Suffixe)
function isEURTicker(symbol: string): boolean {
  return /\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/i.test(symbol)
}

// Erkennt ob ein Ticker in GBX (Pence) notiert ist (London Stock Exchange)
function isGBXTicker(symbol: string): boolean {
  return /\.L$/i.test(symbol)
}

const isValidUuid = (v?: string) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      portfolioId,
      portfolioIds,
      holdings,
      cashPosition: _cashPosition = 0,
      days = 30,
    } = body as {
      portfolioId?: string
      portfolioIds?: string[]
      holdings: HoldingInput[]
      cashPosition: number
      days: number
    }

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const validDays = Math.min(Math.max(days, 7), 730)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - validDays)
    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]

    // 1) Transaktionen laden
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const validIds = Array.isArray(portfolioIds)
      ? portfolioIds.filter(isValidUuid)
      : isValidUuid(portfolioId) ? [portfolioId!] : []

    const transactionsBySymbol = new Map<string, Transaction[]>()
    let allTransactions: Transaction[] = []

    if (validIds.length > 0) {
      const { data: txs } = await supabase
        .from('portfolio_transactions')
        .select('date, symbol, quantity, price, type')
        .in('portfolio_id', validIds)
        .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])
        .order('date', { ascending: true })

      if (txs) {
        allTransactions = txs as Transaction[]
        for (const tx of allTransactions) {
          if (!transactionsBySymbol.has(tx.symbol)) transactionsBySymbol.set(tx.symbol, [])
          transactionsBySymbol.get(tx.symbol)!.push(tx)
        }
      }
    }

    const useTransactions = transactionsBySymbol.size > 0

    // 2) Historische Preise pro Symbol via EODHD (parallel in Batches von 10)
    const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))]
    const pricesBySymbol = new Map<string, Map<string, number>>()

    const batchSize = 10
    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(symbol => getEodhdHistorical(symbol, fromDate, toDate))
      )
      batch.forEach((symbol, idx) => {
        const priceMap = new Map<string, number>()
        for (const day of results[idx]) {
          if (day.close > 0) priceMap.set(day.date, day.close)
        }
        pricesBySymbol.set(symbol, priceMap)
      })
    }

    // 3) FX-Historien für USD/GBX-Aktien
    const hasUSDStocks = uniqueSymbols.some(s => !isEURTicker(s) && !isGBXTicker(s))
    const hasGBXStocks = uniqueSymbols.some(s => isGBXTicker(s))

    const [usdEurMap, gbpEurMap] = await Promise.all([
      hasUSDStocks ? getEodhdFxHistory('USDEUR', fromDate, toDate) : Promise.resolve(new Map<string, number>()),
      hasGBXStocks ? getEodhdFxHistory('GBPEUR', fromDate, toDate) : Promise.resolve(new Map<string, number>()),
    ])

    // Hilfsfunktion: nächsten verfügbaren Kurs für ein Datum finden (Wochenenden)
    function getRateForDate(rateMap: Map<string, number>, date: string, fallback: number): number {
      const rate = rateMap.get(date)
      if (rate) return rate
      const dates = Array.from(rateMap.keys()).sort()
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] <= date) return rateMap.get(dates[i])!
      }
      return dates.length > 0 ? rateMap.get(dates[0])! : fallback
    }

    const getUSDtoEUR = (date: string) => getRateForDate(usdEurMap, date, 0.92)
    const getGBPtoEUR = (date: string) => getRateForDate(gbpEurMap, date, 1.16)

    // 4) Alle Handelstage sammeln
    const allDates = new Set<string>()
    pricesBySymbol.forEach(priceMap => priceMap.forEach((_, d) => allDates.add(d)))
    const sortedDates = Array.from(allDates).sort()

    // 4b) Forward-fill der Kurse: für jedes Symbol pro Chart-Datum eine
    // lookup-Funktion, die bei fehlendem Datum den letzten bekannten Kurs
    // zurückgibt. Verhindert massive Drops in der Wertentwicklungs-Kurve,
    // wenn EODHD für einzelne Tage keinen Kurs liefert (Handelsruhe,
    // Ticker-Rename, API-Lücke bei delisted Stocks).
    const sortedDatesBySymbol = new Map<string, string[]>()
    pricesBySymbol.forEach((priceMap, symbol) => {
      sortedDatesBySymbol.set(symbol, Array.from(priceMap.keys()).sort())
    })

    function getPriceForDate(symbol: string, date: string): number | null {
      const priceMap = pricesBySymbol.get(symbol)
      if (!priceMap) return null
      const direct = priceMap.get(date)
      if (direct) return direct
      // Forward-Fill: letzten bekannten Kurs vor `date` suchen
      const dates = sortedDatesBySymbol.get(symbol)
      if (!dates || dates.length === 0) return null
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] <= date) {
          const p = priceMap.get(dates[i])
          if (p && p > 0) return p
        }
      }
      return null
    }

    // 5) Erster Kauftag pro Symbol
    const firstPurchaseDateBySymbol = new Map<string, string>()
    if (useTransactions) {
      transactionsBySymbol.forEach((txs, symbol) => {
        const firstBuy = txs.find(tx => tx.type === 'buy' || tx.type === 'transfer_in')
        if (firstBuy) firstPurchaseDateBySymbol.set(symbol, firstBuy.date)
      })
    } else {
      for (const h of holdings) {
        if (h.purchase_date) firstPurchaseDateBySymbol.set(h.symbol, h.purchase_date)
      }
    }

    // 6) Pro Tag: Portfolio-Wert in EUR berechnen
    const chartData: Array<{ date: string; value: number; invested: number; performance: number }> = []

    for (const date of sortedDates) {
      let totalValue = 0
      let totalInvested = 0

      for (const symbol of uniqueSymbols) {
        const currentPrice = getPriceForDate(symbol, date)
        if (!currentPrice) continue

        const firstPurchaseDate = firstPurchaseDateBySymbol.get(symbol)
        if (firstPurchaseDate && date < firstPurchaseDate) continue

        // Kurs in EUR umrechnen (DB-Kurse sind in Börsenwährung)
        let priceInEUR: number
        if (isEURTicker(symbol)) {
          priceInEUR = currentPrice
        } else if (isGBXTicker(symbol)) {
          // .L Ticker: GBX (Pence) → ÷100 = GBP → ×Rate = EUR
          priceInEUR = (currentPrice / 100) * getGBPtoEUR(date)
        } else {
          // USD und andere: über USD→EUR
          priceInEUR = currentPrice * getUSDtoEUR(date)
        }

        if (useTransactions) {
          const txs = transactionsBySymbol.get(symbol) || []
          let sharesOwned = 0
          let costBasis = 0

          for (const tx of txs) {
            if (tx.date > date) continue
            if (tx.type === 'buy' || tx.type === 'transfer_in') {
              sharesOwned += tx.quantity
              costBasis += tx.quantity * (tx.price || 0)
            } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
              const avgCost = sharesOwned > 0 ? costBasis / sharesOwned : 0
              sharesOwned -= tx.quantity
              costBasis -= tx.quantity * avgCost
            }
          }

          if (sharesOwned > 0) {
            totalValue += sharesOwned * priceInEUR
            totalInvested += costBasis
          }
        } else {
          // Holdings-basiert (z.B. wenn keine Transaktionen vorhanden)
          const matching = holdings.filter(h => h.symbol === symbol)
          if (matching.length === 0) continue
          const totalQty = matching.reduce((s, h) => s + h.quantity, 0)
          const totalCost = matching.reduce((s, h) => s + (h.purchase_price || 0) * h.quantity, 0)
          totalValue += totalQty * priceInEUR
          totalInvested += totalCost
        }
      }

      if (totalInvested > 0) {
        const performance = ((totalValue - totalInvested) / totalInvested) * 100
        chartData.push({
          date,
          value: Math.round(totalValue * 100) / 100,
          invested: Math.round(totalInvested * 100) / 100,
          performance: Math.round(performance * 100) / 100,
        })
      }
    }

    // 7) Sampling auf max 60 Punkte
    let sampledData = chartData
    if (chartData.length > 60) {
      const step = Math.ceil(chartData.length / 60)
      sampledData = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1)
    }

    // 8) TWR (Time-Weighted Return) gegen Cashflow-Tage
    const chartDates = new Set(chartData.map(d => d.date))
    const sortedChartDates = chartData.map(d => d.date)
    const cashflowByChartDate = new Map<string, number>()

    if (useTransactions) {
      for (const tx of allTransactions) {
        let targetDate = tx.date
        if (!chartDates.has(targetDate)) {
          const nextDate = sortedChartDates.find(d => d >= targetDate)
          if (!nextDate) continue
          targetDate = nextDate
        }
        const cf = cashflowByChartDate.get(targetDate) || 0
        if (tx.type === 'buy' || tx.type === 'transfer_in') {
          cashflowByChartDate.set(targetDate, cf + tx.quantity * (tx.price || 0))
        } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
          cashflowByChartDate.set(targetDate, cf - tx.quantity * (tx.price || 0))
        }
      }
    }

    const twrByDate = new Map<string, number>()
    let cumulativeTWR = 1.0
    for (let i = 0; i < chartData.length; i++) {
      if (i === 0) {
        twrByDate.set(chartData[i].date, 0)
        continue
      }
      const prevValue = chartData[i - 1].value
      const currentDate = chartData[i].date
      const currentValue = chartData[i].value
      const cashflow = cashflowByChartDate.get(currentDate) || 0
      const adjustedStartValue = prevValue + cashflow
      if (adjustedStartValue > 0) {
        cumulativeTWR *= currentValue / adjustedStartValue
      }
      twrByDate.set(currentDate, (cumulativeTWR - 1) * 100)
    }

    // 9) Benchmark-Daten (SPY, URTH = MSCI World, VT = FTSE All-World)
    let performanceData: Array<{
      date: string
      portfolioPerformance: number
      spyPerformance: number
      msciWorldPerformance: number
      ftseAllWorldPerformance: number
    }> = []

    try {
      const [spyHist, urthHist, vtHist] = await Promise.all([
        getEodhdHistorical('SPY', fromDate, toDate),
        getEodhdHistorical('URTH', fromDate, toDate),
        getEodhdHistorical('VT', fromDate, toDate),
      ])

      if (spyHist.length > 0 && chartData.length > 0) {
        const firstPortfolioDate = chartData[0].date
        const findFirstPrice = (history: typeof spyHist) => {
          const first = history.find(d => d.date >= firstPortfolioDate)
          return first?.close || history[0]?.close || 0
        }
        const firstSPY = findFirstPrice(spyHist)
        const firstURTH = findFirstPrice(urthHist)
        const firstVT = findFirstPrice(vtHist)

        const spyMap = new Map<string, number>()
        const urthMap = new Map<string, number>()
        const vtMap = new Map<string, number>()
        for (const d of spyHist) spyMap.set(d.date, d.close)
        for (const d of urthHist) urthMap.set(d.date, d.close)
        for (const d of vtHist) vtMap.set(d.date, d.close)

        const calcReturn = (price: number | undefined, firstPrice: number) =>
          price && firstPrice ? Math.round(((price / firstPrice) - 1) * 10000) / 100 : 0

        performanceData = chartData.map(point => ({
          date: point.date,
          portfolioPerformance: Math.round((twrByDate.get(point.date) || 0) * 100) / 100,
          spyPerformance: calcReturn(spyMap.get(point.date), firstSPY),
          msciWorldPerformance: calcReturn(urthMap.get(point.date), firstURTH),
          ftseAllWorldPerformance: calcReturn(vtMap.get(point.date), firstVT),
        }))
      }
    } catch (err) {
      console.error('[v1/portfolio/history] benchmark error:', err)
    }

    let sampledPerformance = performanceData
    if (performanceData.length > 60) {
      const step = Math.ceil(performanceData.length / 60)
      sampledPerformance = performanceData.filter((_, i) => i % step === 0 || i === performanceData.length - 1)
    }

    return NextResponse.json({
      success: true,
      data: sampledData,
      performanceData: sampledPerformance,
      meta: {
        totalPoints: chartData.length,
        sampledPoints: sampledData.length,
        transactionsUsed: useTransactions,
        provider: 'eodhd',
        dateRange: {
          from: chartData[0]?.date || null,
          to: chartData[chartData.length - 1]?.date || null,
        },
      },
    })
  } catch (error) {
    console.error('[v1/portfolio/history] error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Portfolio-Historie', success: false },
      { status: 500 }
    )
  }
}
