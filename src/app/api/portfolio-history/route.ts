// src/app/api/portfolio-history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'

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
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out'
}

// Erkennt ob ein Ticker in EUR notiert ist (FMP liefert Preise in Börsenwährung)
function isEURTicker(symbol: string): boolean {
  return /\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/i.test(symbol)
}

// Erkennt ob ein Ticker in GBX (Pence) notiert ist (London Stock Exchange)
function isGBXTicker(symbol: string): boolean {
  return /\.L$/i.test(symbol)
}

// In-memory cache für API-Responses (24h TTL)
const historyCache = new Map<string, { data: HistoricalDataPoint[], timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 Stunden

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GBP→EUR Näherungsrate für Chart-Umrechnung (reicht für Trend-Darstellung)
const GBP_EUR_APPROX = 1.17

/**
 * Historische Preise für ein Symbol laden.
 *
 * Reihenfolge:
 * 1. FMP direkt (deckt ~90% der Symbole ab)
 * 2. EXCHANGE_FALLBACKS (für Xetra-ETFs die FMP nur auf .L führt)
 * 3. Yahoo Finance (für den Rest — EU-ETFs wie FWIA.DE)
 *
 * Wichtig: Ohne Yahoo + Fallback fehlten im Portfolio-Chart alle Symbole
 * die FMP nicht direkt kennt — bei einem User mit 47k in FWIA.DE führte
 * das dazu, dass der Chart 24k statt 70k zeigte.
 */
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

  // === Versuch 1: FMP direkt ===
  let historicalData: HistoricalDataPoint[] = []
  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`
    const response = await fetch(url, { next: { revalidate: 1800 } })
    if (response.ok) {
      const data = await response.json()
      if (data.historical && Array.isArray(data.historical) && data.historical.length > 0) {
        historicalData = data.historical
          .map((item: { date: string; close: number }) => ({ date: item.date, close: item.close }))
          .reverse()
      }
    }
  } catch {
    // FMP fehlgeschlagen → weiter zu Fallbacks
  }

  // === Versuch 2: EXCHANGE_FALLBACKS (z.B. FWRG.DE → FWRG.L) ===
  if (historicalData.length === 0) {
    const fallback = EXCHANGE_FALLBACKS[symbol]
    if (fallback) {
      try {
        const altUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${fallback.symbol}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`
        const altRes = await fetch(altUrl, { next: { revalidate: 1800 } })
        if (altRes.ok) {
          const altData = await altRes.json()
          if (altData.historical?.length > 0) {
            historicalData = altData.historical
              .map((item: { date: string; close: number }) => {
                let close = item.close
                if (fallback.exchange === 'GBp') close = (close / 100) * GBP_EUR_APPROX
                else if (fallback.exchange === 'GBP') close = close * GBP_EUR_APPROX
                return { date: item.date, close }
              })
              .reverse()
          }
        }
      } catch {
        // Fallback FMP fehlgeschlagen
      }
    }
  }

  // === Versuch 3: Yahoo Finance (für EU-ETFs wie FWIA.DE) ===
  if (historicalData.length === 0) {
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&region=DE`
      const yahooRes = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      })
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json()
        const result = yahooData?.chart?.result?.[0]
        if (result?.timestamp?.length > 0) {
          const timestamps: number[] = result.timestamp
          const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []
          const fromTime = new Date(fromDate).getTime() / 1000
          for (let i = 0; i < timestamps.length; i++) {
            const close = closes[i]
            if (close === null || close === undefined || close <= 0) continue
            if (timestamps[i] < fromTime) continue
            const d = new Date(timestamps[i] * 1000)
            historicalData.push({
              date: d.toISOString().split('T')[0],
              close: Math.round(close * 100) / 100,
            })
          }
        }
      }
    } catch {
      // Yahoo fehlgeschlagen
    }
  }

  // Cache speichern (auch leere Ergebnisse → verhindert wiederholte Requests)
  historyCache.set(cacheKey, { data: historicalData, timestamp: Date.now() })
  return historicalData
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolioId, portfolioIds, holdings, cashPosition = 0, days = 30 } = body as {
      portfolioId?: string
      portfolioIds?: string[]
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

    // 1. Lade Transaktionen:
    //    - portfolioIds[] (Alle-Depots-Ansicht) → alle Portfolios des Users
    //    - portfolioId (Einzelansicht) → genau dieses Portfolio
    //    - 'all' als portfolioId ist kein gültiges UUID → wird ignoriert (Fallback zu Holdings)
    let transactionsBySymbol = new Map<string, Transaction[]>()
    let allTransactions: Transaction[] = []

    // UUIDs für DB-Query bestimmen
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    const validIds = Array.isArray(portfolioIds)
      ? portfolioIds.filter(isValidUuid)
      : isValidUuid(portfolioId) ? [portfolioId!] : []

    if (validIds.length > 0) {
      const { data: transactions, error: txError } = await supabase
        .from('portfolio_transactions')
        .select('date, symbol, quantity, price, type')
        .in('portfolio_id', validIds)
        // transfer_in/out mit einbeziehen — sonst fehlen im Chart alle via
        // Depotübertrag eingebuchten Shares (z.B. 147 VGWL in ING war nicht
        // sichtbar, obwohl sie den Großteil des Depots ausmachten).
        .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])
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

    // 2b. Lade Wechselkurs-Historien für nicht-EUR Aktien
    const hasUSDStocks = uniqueSymbols.some(s => !isEURTicker(s) && !isGBXTicker(s))
    const hasGBXStocks = uniqueSymbols.some(s => isGBXTicker(s))
    const eurUsdRateByDate = new Map<string, number>() // date → USD-to-EUR rate
    const gbpEurRateByDate = new Map<string, number>() // date → GBP-to-EUR rate

    // Parallel laden wenn beide benötigt
    const fxPromises: Promise<void>[] = []

    if (hasUSDStocks) {
      fxPromises.push((async () => {
        try {
          const eurUsdHistory = await fetchHistoricalPrices('EURUSD', fromDate, toDate)
          eurUsdHistory.forEach(day => {
            if (day.close > 0) {
              eurUsdRateByDate.set(day.date, 1 / day.close)
            }
          })
          console.log(`💱 EUR/USD history: ${eurUsdRateByDate.size} data points`)
        } catch (e) {
          console.error('Error loading EUR/USD history:', e)
        }
      })())
    }

    if (hasGBXStocks) {
      fxPromises.push((async () => {
        try {
          // GBPEUR direkt laden, oder über Kreuzrate GBPUSD / EURUSD
          const gbpUsdHistory = await fetchHistoricalPrices('GBPUSD', fromDate, toDate)
          const eurUsdHistoryForGbp = eurUsdRateByDate.size > 0 ? null : await fetchHistoricalPrices('EURUSD', fromDate, toDate)

          // EURUSD-Map für Kreuzrate bauen falls nötig
          const eurUsdMap = new Map<string, number>()
          if (eurUsdHistoryForGbp) {
            eurUsdHistoryForGbp.forEach(day => {
              if (day.close > 0) eurUsdMap.set(day.date, day.close)
            })
          }

          gbpUsdHistory.forEach(day => {
            if (day.close > 0) {
              // GBP→EUR = GBPUSD / EURUSD
              const eurUsd = eurUsdRateByDate.size > 0
                ? (1 / (eurUsdRateByDate.get(day.date) || 0.92)) // eurUsdRateByDate hat USD→EUR, invertieren
                : (eurUsdMap.get(day.date) || 1.08)
              if (eurUsd > 0) {
                gbpEurRateByDate.set(day.date, day.close / eurUsd)
              }
            }
          })
          console.log(`💱 GBP/EUR history: ${gbpEurRateByDate.size} data points`)
        } catch (e) {
          console.error('Error loading GBP/EUR history:', e)
        }
      })())
    }

    await Promise.all(fxPromises)

    // Hilfsfunktionen: Nächsten verfügbaren Kurs finden (für Tage ohne FX-Daten)
    function getRateForDate(rateMap: Map<string, number>, date: string, fallback: number): number {
      const rate = rateMap.get(date)
      if (rate) return rate

      const dates = Array.from(rateMap.keys()).sort()
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] <= date) return rateMap.get(dates[i])!
      }
      return dates.length > 0 ? rateMap.get(dates[0])! : fallback
    }

    function getEURRateForDate(date: string): number {
      return getRateForDate(eurUsdRateByDate, date, 0.92)
    }

    function getGBPEURRateForDate(date: string): number {
      return getRateForDate(gbpEurRateByDate, date, 1.16)
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
    // - GBX-Aktien (.L): Kurs in Pence → ÷100 für GBP → ×GBP_EUR_Rate
    // - USD-Aktien (AAPL, ADBE etc.): Kurs_USD × USD_to_EUR_Rate
    const chartData: Array<{ date: string; value: number; invested: number; performance: number }> = []

    sortedDates.forEach(date => {
      let totalValue = 0
      let totalInvested = 0

      uniqueSymbols.forEach(symbol => {
        const priceMap = pricesBySymbol.get(symbol)
        const currentPrice = priceMap?.get(date) // In Börsenwährung (USD, EUR oder GBX)
        const firstPurchaseDate = firstPurchaseDateBySymbol.get(symbol)

        if (!currentPrice) return

        // Position existiert erst ab Kaufdatum
        if (firstPurchaseDate && date < firstPurchaseDate) return

        // Kurs in EUR umrechnen
        let currentPriceEUR: number
        if (isEURTicker(symbol)) {
          currentPriceEUR = currentPrice
        } else if (isGBXTicker(symbol)) {
          // .L Ticker: FMP liefert GBX (Pence) → ÷100 = GBP → ×Rate = EUR
          currentPriceEUR = (currentPrice / 100) * getGBPEURRateForDate(date)
        } else {
          // USD und andere: über USD→EUR
          currentPriceEUR = currentPrice * getEURRateForDate(date)
        }

        if (useTransactions) {
          const txs = transactionsBySymbol.get(symbol) || []

          let sharesOwned = 0
          let costBasis = 0 // In EUR (was der User bezahlt hat)

          txs.forEach(tx => {
            if (tx.date <= date) {
              // buy + transfer_in erhöhen Bestand — bei transfer_in nutzen wir den
              // historischen Schlusskurs als Kostenbasis (beim Import bereits in
              // price geschrieben). Wenn price=0 (unbekannt), fehlt die Kostenbasis
              // für totalInvested — das ist akzeptabel, der Bestand stimmt trotzdem.
              if (tx.type === 'buy' || tx.type === 'transfer_in') {
                sharesOwned += tx.quantity
                costBasis += tx.quantity * (tx.price || 0)
              } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
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
          // Fallback: Holdings-basiert (keine Transaktionen im Portfolio).
          // WICHTIG: In der "Alle Depots"-Ansicht kann ein Symbol mehrfach vorkommen
          // (z.B. VWCE in Scalable UND ING) — wir müssen alle aggregieren, sonst
          // wird nur das erste Depot gezählt und der Chart ist zu niedrig.
          const matchingHoldings = holdings.filter(h => h.symbol === symbol)
          if (matchingHoldings.length === 0) return

          const totalQty = matchingHoldings.reduce((s, h) => s + h.quantity, 0)
          const totalCost = matchingHoldings.reduce((s, h) => s + (h.purchase_price || 0) * h.quantity, 0)
          totalValue += totalQty * currentPriceEUR
          totalInvested += totalCost
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
        // buy + transfer_in = fiktiver positiver Cashflow (Shares erscheinen im
        // Depot, TWR muss das als externe Einlage behandeln damit die Rendite
        // nicht künstlich gut aussieht). Analog transfer_out zu Verkauf.
        if (tx.type === 'buy' || tx.type === 'transfer_in') {
          cashflowByChartDate.set(targetDate, cf + (tx.quantity * (tx.price || 0)))
        } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
          cashflowByChartDate.set(targetDate, cf - (tx.quantity * (tx.price || 0)))
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