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

    // 5. Hilfsfunktion: Berechne gewichteten Durchschnittskurs (USD) basierend auf allen Käufen bis zu einem Datum
    // Dies ist die korrekte Methode für Performance-Berechnung bei mehreren Tranchen
    function getWeightedAvgPurchasePriceUSD(
      symbol: string,
      asOfDate: string,
      priceMap: Map<string, number>
    ): number {
      if (!useTransactions) {
        // Fallback: Einzelkauf - nimm den Kurs am ersten Kaufdatum
        const holding = holdings.find(h => h.symbol === symbol)
        if (!holding?.purchase_date) return 0

        const sortedDates = Array.from(priceMap.keys()).sort()
        for (const d of sortedDates) {
          if (d >= holding.purchase_date) {
            return priceMap.get(d) || 0
          }
        }
        return 0
      }

      // Mit Transaktionen: Berechne gewichteten Durchschnitt aller Käufe
      const txs = transactionsBySymbol.get(symbol) || []
      let totalShares = 0
      let weightedPriceSum = 0

      for (const tx of txs) {
        if (tx.date > asOfDate) continue

        if (tx.type === 'buy') {
          // Finde den USD-Kurs am Kaufdatum
          const sortedDates = Array.from(priceMap.keys()).sort()
          let priceAtBuy = 0
          for (const d of sortedDates) {
            if (d >= tx.date) {
              priceAtBuy = priceMap.get(d) || 0
              break
            }
          }
          if (priceAtBuy > 0) {
            weightedPriceSum += tx.quantity * priceAtBuy
            totalShares += tx.quantity
          }
        } else if (tx.type === 'sell') {
          // Bei Verkauf: Proportional reduzieren (Average Cost Method)
          if (totalShares > 0) {
            const avgBefore = weightedPriceSum / totalShares
            totalShares -= tx.quantity
            weightedPriceSum = totalShares > 0 ? avgBefore * totalShares : 0
          }
        }
      }

      return totalShares > 0 ? weightedPriceSum / totalShares : 0
    }

    // 6. Für jeden Tag: Berechne Wert und investiertes Kapital
    // KORREKTE LOGIK: Gewichteter Durchschnittskurs für alle Käufe bis zu diesem Datum
    const chartData: Array<{ date: string; value: number; invested: number; performance: number }> = []

    sortedDates.forEach(date => {
      let totalValue = 0
      let totalInvested = 0

      uniqueSymbols.forEach(symbol => {
        const priceMap = pricesBySymbol.get(symbol)
        const currentPriceUSD = priceMap?.get(date)
        const firstPurchaseDate = firstPurchaseDateBySymbol.get(symbol)

        if (!currentPriceUSD) return

        // Position existiert erst ab Kaufdatum
        if (firstPurchaseDate && date < firstPurchaseDate) return

        if (useTransactions) {
          const txs = transactionsBySymbol.get(symbol) || []

          let sharesOwned = 0
          let costBasis = 0 // In EUR (was der User bezahlt hat)

          txs.forEach(tx => {
            if (tx.date <= date) {
              if (tx.type === 'buy') {
                sharesOwned += tx.quantity
                costBasis += tx.quantity * tx.price
              } else if (tx.type === 'sell') {
                const avgCost = sharesOwned > 0 ? costBasis / sharesOwned : 0
                sharesOwned -= tx.quantity
                costBasis -= tx.quantity * avgCost
              }
            }
          })

          if (sharesOwned > 0 && costBasis > 0) {
            // KORRIGIERTE LOGIK: Gewichteter Durchschnittskurs basierend auf allen Käufen bis heute
            // Dies berücksichtigt mehrere Tranchen korrekt
            const weightedAvgPriceUSD = getWeightedAvgPurchasePriceUSD(symbol, date, priceMap!)

            if (weightedAvgPriceUSD > 0) {
              // Performance = (aktueller Kurs / gewichteter Durchschnittskurs) - 1
              const priceChange = (currentPriceUSD - weightedAvgPriceUSD) / weightedAvgPriceUSD
              const currentValue = costBasis * (1 + priceChange)
              totalValue += currentValue
            } else {
              // Fallback: Wert = Cost Basis (keine Kursdaten)
              totalValue += costBasis
            }

            totalInvested += costBasis
          }
        } else {
          // Fallback: Holdings-basiert (einzelner Kauf)
          const holding = holdings.find(h => h.symbol === symbol)
          if (!holding) return

          const costBasis = (holding.purchase_price || 0) * holding.quantity
          const startPriceUSD = getWeightedAvgPurchasePriceUSD(symbol, date, priceMap!)

          if (startPriceUSD > 0) {
            const priceChange = (currentPriceUSD - startPriceUSD) / startPriceUSD
            const currentValue = costBasis * (1 + priceChange)
            totalValue += currentValue
          } else {
            totalValue += costBasis
          }

          totalInvested += costBasis
        }
      })

      // Nur Tage mit Positionen hinzufügen
      if (totalInvested > 0) {
        // KEIN Cash - nur Aktienwerte
        const performance = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0

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

    // Erstelle ein Set der Transaktionsdaten mit ihrem Cashflow-Betrag (in EUR)
    const cashflowByDate = new Map<string, number>()
    if (useTransactions) {
      allTransactions.forEach(tx => {
        const cf = cashflowByDate.get(tx.date) || 0
        if (tx.type === 'buy') {
          // Kauf = Geldzufluss ins Portfolio
          cashflowByDate.set(tx.date, cf + (tx.quantity * tx.price))
        } else if (tx.type === 'sell') {
          // Verkauf = Geldabfluss aus Portfolio
          cashflowByDate.set(tx.date, cf - (tx.quantity * tx.price))
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
      const cashflow = cashflowByDate.get(currentDate) || 0

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

    // 8. Lade S&P 500 (SPY) Benchmark-Daten für Performance-Vergleich (in %)
    let performanceData: Array<{ date: string; portfolioPerformance: number; spyPerformance: number }> = []
    try {
      const spyHistory = await fetchHistoricalPrices('SPY', fromDate, toDate)
      if (spyHistory.length > 0 && chartData.length > 0) {
        const firstPortfolioDate = chartData[0].date
        const firstSPYDataPoint = spyHistory.find(d => d.date >= firstPortfolioDate)
        const firstSPYPrice = firstSPYDataPoint?.close || spyHistory[0].close

        const spyPriceMap = new Map<string, number>()
        spyHistory.forEach(d => spyPriceMap.set(d.date, d.close))

        // Performance-Daten: TWR für Portfolio, Price Return für SPY
        // Beide starten bei 0% → fairer Vergleich
        performanceData = chartData.map(point => {
          const spyPrice = spyPriceMap.get(point.date)
          const spyPerformance = spyPrice && firstSPYPrice
            ? ((spyPrice / firstSPYPrice) - 1) * 100
            : 0

          return {
            date: point.date,
            portfolioPerformance: Math.round((twrByDate.get(point.date) || 0) * 100) / 100, // TWR in %
            spyPerformance: Math.round(spyPerformance * 100) / 100
          }
        })
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