// src/app/api/portfolio-history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface HistoricalDataPoint {
  date: string
  close: number
}

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
  type: 'buy' | 'sell'
}

// Erkennt ob ein Ticker in EUR notiert ist (FMP liefert Preise in Börsenwährung)
function isEURTicker(symbol: string): boolean {
  return /\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/i.test(symbol)
}

// In-memory cache für API-Responses (24h TTL)
const historyCache = new Map<string, { data: HistoricalDataPoint[], timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 Stunden

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchHistoricalPrices(symbol: string, fromDate: string, toDate: string): Promise<HistoricalDataPoint[]> {
  const cacheKey = `${symbol}_${fromDate}_${toDate}`
  const cached = historyCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY nicht konfiguriert')
  }

  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`

  const response = await fetch(url, { next: { revalidate: 1800 } })

  if (!response.ok) {
    console.error(`Fehler beim Abrufen von ${symbol}: HTTP ${response.status}`)
    return []
  }

  const data = await response.json()

  if (!data.historical || !Array.isArray(data.historical)) {
    return []
  }

  const historicalData: HistoricalDataPoint[] = data.historical
    .map((item: { date: string; close: number }) => ({
      date: item.date,
      close: item.close
    }))
    .reverse() // Älteste zuerst

  // Cache speichern
  historyCache.set(cacheKey, { data: historicalData, timestamp: Date.now() })

  return historicalData
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolioId, holdings, cashPosition = 0, days = 30 } = body as {
      portfolioId?: string
      holdings: HoldingInput[]
      cashPosition: number
      days: number
    }

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Limitiere API-Aufrufe
    const validDays = Math.min(Math.max(days, 7), 730)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - validDays)

    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]

    // 1. Lade Transaktionen wenn portfolioId vorhanden
    let transactionsBySymbol = new Map<string, Transaction[]>()
    let allTransactions: Transaction[] = []

    if (portfolioId) {
      const { data: transactions, error: txError } = await supabase
        .from('portfolio_transactions')
        .select('date, symbol, quantity, price, type')
        .eq('portfolio_id', portfolioId)
        .in('type', ['buy', 'sell'])
        .order('date', { ascending: true })

      if (txError) {
        console.error('Error loading transactions:', txError)
      } else if (transactions) {
        allTransactions = transactions
        transactions.forEach((tx: Transaction) => {
          if (!transactionsBySymbol.has(tx.symbol)) {
            transactionsBySymbol.set(tx.symbol, [])
          }
          transactionsBySymbol.get(tx.symbol)!.push(tx)
        })
      }
    }

    const useTransactions = transactionsBySymbol.size > 0

    // 2. Lade historische Kurse für alle Symbole
    const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))]
    const pricesBySymbol = new Map<string, Map<string, number>>()

    // Parallel laden (max 10 gleichzeitig)
    const batchSize = 10
    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(symbol => fetchHistoricalPrices(symbol, fromDate, toDate))
      )
      batch.forEach((symbol, index) => {
        const priceMap = new Map<string, number>()
        results[index].forEach(day => {
          priceMap.set(day.date, day.close)
        })
        pricesBySymbol.set(symbol, priceMap)
      })
    }

    // 2b. Lade EUR/USD Wechselkurs-Historie (nur wenn USD-Aktien vorhanden)
    const hasUSDStocks = uniqueSymbols.some(s => !isEURTicker(s))
    const eurUsdRateByDate = new Map<string, number>() // date → USD-to-EUR rate

    if (hasUSDStocks) {
      try {
        const eurUsdHistory = await fetchHistoricalPrices('EURUSD', fromDate, toDate)
        eurUsdHistory.forEach(day => {
          // EURUSD = wie viel 1 EUR in USD wert ist (z.B. 1.08)
          // Wir brauchen USD→EUR: 1 / EURUSD
          if (day.close > 0) {
            eurUsdRateByDate.set(day.date, 1 / day.close)
          }
        })
        console.log(`💱 EUR/USD history: ${eurUsdRateByDate.size} data points`)
      } catch (e) {
        console.error('Error loading EUR/USD history:', e)
      }
    }

    // Hilfsfunktion: Nächsten verfügbaren EUR/USD-Kurs finden (für Tage ohne FX-Daten)
    function getEURRateForDate(date: string): number {
      const rate = eurUsdRateByDate.get(date)
      if (rate) return rate

      // Nächsten verfügbaren Kurs suchen (rückwärts)
      const dates = Array.from(eurUsdRateByDate.keys()).sort()
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] <= date) return eurUsdRateByDate.get(dates[i])!
      }
      // Fallback: Erster verfügbarer
      return dates.length > 0 ? eurUsdRateByDate.get(dates[0])! : 0.92 // Sicherer Fallback
    }

    // 3. Sammle alle Handelstage
    const allDates = new Set<string>()
    pricesBySymbol.forEach(priceMap => {
      priceMap.forEach((_, date) => allDates.add(date))
    })
    const sortedDates = Array.from(allDates).sort()

    // 4. Tracke den ersten Kauftag pro Symbol (für korrekte Startberechnung)
    const firstPurchaseDateBySymbol = new Map<string, string>()

    if (useTransactions) {
      transactionsBySymbol.forEach((txs, symbol) => {
        const firstBuy = txs.find(tx => tx.type === 'buy')
        if (firstBuy) {
          firstPurchaseDateBySymbol.set(symbol, firstBuy.date)
        }
      })
    } else {
      holdings.forEach(h => {
        if (h.purchase_date) {
          firstPurchaseDateBySymbol.set(h.symbol, h.purchase_date)
        }
      })
    }

    // 5. (entfernt - alte getWeightedAvgPurchasePriceUSD Funktion nicht mehr nötig)

    // 6. Für jeden Tag: Berechne Portfolio-Wert in EUR
    // KORREKTE LOGIK: Shares × aktueller_Kurs_in_EUR
    // - EUR-Aktien (.DE, .PA etc.): Kurs ist bereits in EUR
    // - USD-Aktien (AAPL, ADBE etc.): Kurs_USD × USD_to_EUR_Rate
    const chartData: Array<{ date: string; value: number; invested: number; performance: number }> = []

    sortedDates.forEach(date => {
      let totalValue = 0
      let totalInvested = 0

      uniqueSymbols.forEach(symbol => {
        const priceMap = pricesBySymbol.get(symbol)
        const currentPrice = priceMap?.get(date) // In Börsenwährung (USD oder EUR)
        const firstPurchaseDate = firstPurchaseDateBySymbol.get(symbol)

        if (!currentPrice) return

        // Position existiert erst ab Kaufdatum
        if (firstPurchaseDate && date < firstPurchaseDate) return

        // Kurs in EUR umrechnen
        const isEUR = isEURTicker(symbol)
        const currentPriceEUR = isEUR ? currentPrice : currentPrice * getEURRateForDate(date)

        if (useTransactions) {
          const txs = transactionsBySymbol.get(symbol) || []

          let sharesOwned = 0
          let costBasis = 0 // In EUR (was der User bezahlt hat)

          txs.forEach(tx => {
            if (tx.date <= date) {
              if (tx.type === 'buy') {
                sharesOwned += tx.quantity
                costBasis += tx.quantity * tx.price // tx.price ist in EUR (purchase_price)
              } else if (tx.type === 'sell') {
                const avgCost = sharesOwned > 0 ? costBasis / sharesOwned : 0
                sharesOwned -= tx.quantity
                costBasis -= tx.quantity * avgCost
              }
            }
          })

          if (sharesOwned > 0) {
            // Aktueller Marktwert: Shares × aktueller EUR-Kurs
            totalValue += sharesOwned * currentPriceEUR
            totalInvested += costBasis
          }
        } else {
          // Fallback: Holdings-basiert (einzelner Kauf)
          const holding = holdings.find(h => h.symbol === symbol)
          if (!holding) return

          const costBasis = (holding.purchase_price || 0) * holding.quantity
          totalValue += holding.quantity * currentPriceEUR
          totalInvested += costBasis
        }
      })

      // Nur Tage mit Positionen hinzufügen
      if (totalInvested > 0) {
        const performance = ((totalValue - totalInvested) / totalInvested) * 100

        chartData.push({
          date,
          value: Math.round(totalValue * 100) / 100,
          invested: Math.round(totalInvested * 100) / 100,
          performance: Math.round(performance * 100) / 100
        })
      }
    })

    console.log(`📊 Portfolio history: ${chartData.length} data points`)
    if (chartData.length > 0) {
      console.log(`  First: ${chartData[0].date} - Value: ${chartData[0].value}€, Invested: ${chartData[0].invested}€`)
      console.log(`  Last: ${chartData[chartData.length - 1].date} - Value: ${chartData[chartData.length - 1].value}€`)
      
      // Validierung: Am ersten Tag sollte Wert ≈ Investiert sein
      const firstDiff = Math.abs(chartData[0].value - chartData[0].invested)
      if (firstDiff > 10) {
        console.warn(`⚠️ First day value differs from invested by ${firstDiff.toFixed(2)}€`)
      }
    }

    // Reduziere Datenpunkte für bessere Performance
    let sampledData = chartData
    if (chartData.length > 60) {
      const step = Math.ceil(chartData.length / 60)
      sampledData = chartData.filter((_, index) =>
        index % step === 0 || index === chartData.length - 1
      )
    }

    // 7. Berechne TWR (True Time-Weighted Return) für fairen Benchmark-Vergleich
    // TWR eliminiert den Einfluss von Cash-Flow-Zeitpunkten
    // Methode: Chain-Linking von täglichen Sub-Perioden-Returns
    //   - An Tagen OHNE Transaktion: return = (V_heute / V_gestern) - 1
    //   - An Tagen MIT Transaktion:  return = (V_heute / (V_gestern + Cashflow)) - 1
    // TWR_kumulativ = (1+r₁) × (1+r₂) × ... × (1+rₙ) - 1

    // Erstelle Cashflow-Map: Cashflows auf den nächsten Handelstag (chartData-Datum) zuordnen.
    // Grund: Transaktionen können an Wochenenden/Feiertagen liegen, aber chartData hat nur Handelstage.
    const chartDates = new Set(chartData.map(d => d.date))
    const sortedChartDates = chartData.map(d => d.date)
    const cashflowByChartDate = new Map<string, number>()

    if (useTransactions) {
      allTransactions.forEach(tx => {
        // Finde den nächsten Handelstag >= Transaktionsdatum
        let targetDate = tx.date
        if (!chartDates.has(targetDate)) {
          const nextDate = sortedChartDates.find(d => d >= targetDate)
          if (nextDate) targetDate = nextDate
          else return // Kein passender Handelstag
        }

        const cf = cashflowByChartDate.get(targetDate) || 0
        if (tx.type === 'buy') {
          // Kauf = Geldzufluss ins Portfolio (externer Cashflow)
          cashflowByChartDate.set(targetDate, cf + (tx.quantity * tx.price))
        } else if (tx.type === 'sell') {
          // Verkauf = Geldabfluss aus Portfolio
          cashflowByChartDate.set(targetDate, cf - (tx.quantity * tx.price))
        }
      })
    }

    // Berechne laufende TWR über chartData
    const twrData: Array<{ date: string; twrCumulative: number }> = []
    let cumulativeTWR = 1.0

    for (let i = 0; i < chartData.length; i++) {
      if (i === 0) {
        twrData.push({ date: chartData[i].date, twrCumulative: 0 })
        continue
      }

      const prevValue = chartData[i - 1].value
      const currentDate = chartData[i].date
      const currentValue = chartData[i].value

      // Cashflow am AKTUELLEN Tag: Wenn Aktien am heutigen Tag gekauft wurden,
      // ist das ein externer Geldzufluss, der zum Startwert addiert werden muss.
      // Ohne diese Korrektur würde der Kurssprung durch den Kauf fälschlicherweise
      // als Performance gewertet werden.
      const cashflow = cashflowByChartDate.get(currentDate) || 0

      // Adjusted start value: Vorheriger Wert + Cashflow der heute eingegangen ist
      const adjustedStartValue = prevValue + cashflow

      if (adjustedStartValue > 0) {
        const periodReturn = currentValue / adjustedStartValue
        cumulativeTWR *= periodReturn
      }

      twrData.push({
        date: chartData[i].date,
        twrCumulative: (cumulativeTWR - 1) * 100 // in %
      })
    }

    // TWR-Lookup Map
    const twrByDate = new Map<string, number>()
    twrData.forEach(d => twrByDate.set(d.date, d.twrCumulative))

    // 8. Lade Benchmark-Daten für Performance-Vergleich (in %)
    // SPY = S&P 500, URTH = MSCI World, VT = FTSE All-World
    let performanceData: Array<{
      date: string
      portfolioPerformance: number
      spyPerformance: number
      msciWorldPerformance: number
      ftseAllWorldPerformance: number
    }> = []
    try {
      const [spyHistory, urthHistory, vtHistory] = await Promise.all([
        fetchHistoricalPrices('SPY', fromDate, toDate),
        fetchHistoricalPrices('URTH', fromDate, toDate),
        fetchHistoricalPrices('VT', fromDate, toDate),
      ])

      if (spyHistory.length > 0 && chartData.length > 0) {
        const firstPortfolioDate = chartData[0].date

        // Startpreise für alle Benchmarks finden (ab erstem Portfolio-Datum)
        const findFirstPrice = (history: HistoricalDataPoint[]) => {
          const first = history.find(d => d.date >= firstPortfolioDate)
          return first?.close || history[0]?.close || 0
        }

        const firstSPYPrice = findFirstPrice(spyHistory)
        const firstURTHPrice = findFirstPrice(urthHistory)
        const firstVTPrice = findFirstPrice(vtHistory)

        const spyPriceMap = new Map<string, number>()
        const urthPriceMap = new Map<string, number>()
        const vtPriceMap = new Map<string, number>()

        spyHistory.forEach(d => spyPriceMap.set(d.date, d.close))
        urthHistory.forEach(d => urthPriceMap.set(d.date, d.close))
        vtHistory.forEach(d => vtPriceMap.set(d.date, d.close))

        const calcReturn = (price: number | undefined, firstPrice: number) =>
          price && firstPrice ? Math.round(((price / firstPrice) - 1) * 10000) / 100 : 0

        // Performance-Daten: TWR für Portfolio, Price Return für Benchmarks
        performanceData = chartData.map(point => ({
          date: point.date,
          portfolioPerformance: Math.round((twrByDate.get(point.date) || 0) * 100) / 100,
          spyPerformance: calcReturn(spyPriceMap.get(point.date), firstSPYPrice),
          msciWorldPerformance: calcReturn(urthPriceMap.get(point.date), firstURTHPrice),
          ftseAllWorldPerformance: calcReturn(vtPriceMap.get(point.date), firstVTPrice),
        }))
      }
    } catch (benchmarkError) {
      console.error('Error fetching benchmark data:', benchmarkError)
    }

    // Sample performance data
    let sampledPerformance = performanceData
    if (performanceData.length > 60) {
      const step = Math.ceil(performanceData.length / 60)
      sampledPerformance = performanceData.filter((_, index) =>
        index % step === 0 || index === performanceData.length - 1
      )
    }

    return NextResponse.json({
      success: true,
      data: sampledData, // Wertentwicklung: { date, value, invested, performance }
      performanceData: sampledPerformance, // Performance: { date, portfolioPerformance, spyPerformance } in %
      meta: {
        totalPoints: chartData.length,
        sampledPoints: sampledData.length,
        transactionsUsed: useTransactions,
        dateRange: {
          from: chartData[0]?.date || null,
          to: chartData[chartData.length - 1]?.date || null
        }
      }
    })

  } catch (error) {
    console.error('Portfolio-History API Fehler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Portfolio-Historie', success: false },
      { status: 500 }
    )
  }
}