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

    // 5. Berechne den Startwert pro Symbol am Kauftag (für relative Entwicklung)
    // Der Trick: Am Kauftag ist der "Wert" = was du bezahlt hast
    // Danach: relativer Kursverlauf
    const startPriceBySymbol = new Map<string, number>() // USD Kurs am Kauftag
    
    uniqueSymbols.forEach(symbol => {
      const firstDate = firstPurchaseDateBySymbol.get(symbol)
      if (firstDate) {
        const priceMap = pricesBySymbol.get(symbol)
        // Finde den ersten verfügbaren Kurs am oder nach dem Kaufdatum
        const sortedPriceDates = Array.from(priceMap?.keys() || []).sort()
        for (const priceDate of sortedPriceDates) {
          if (priceDate >= firstDate) {
            startPriceBySymbol.set(symbol, priceMap?.get(priceDate) || 0)
            break
          }
        }
      }
    })

    // 6. Für jeden Tag: Berechne Wert und investiertes Kapital
    const chartData: Array<{ date: string; value: number; invested: number; performance: number }> = []

    sortedDates.forEach(date => {
      let totalValue = 0
      let totalInvested = 0

      uniqueSymbols.forEach(symbol => {
        const priceMap = pricesBySymbol.get(symbol)
        const currentPriceUSD = priceMap?.get(date)
        const startPriceUSD = startPriceBySymbol.get(symbol) || 0
        const firstPurchaseDate = firstPurchaseDateBySymbol.get(symbol)

        if (!currentPriceUSD) return
        
        // Position existiert erst ab Kaufdatum
        if (firstPurchaseDate && date < firstPurchaseDate) return

        if (useTransactions) {
          const txs = transactionsBySymbol.get(symbol) || []

          let sharesOwned = 0
          let costBasis = 0 // In EUR

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
            // NEUE LOGIK: Relative Kursentwicklung basierend auf Cost Basis
            // Performance = (aktueller Kurs / Startkurs) - 1
            // Wert = Cost Basis * (1 + Performance)
            
            if (startPriceUSD > 0) {
              const priceChange = (currentPriceUSD - startPriceUSD) / startPriceUSD
              const currentValue = costBasis * (1 + priceChange)
              totalValue += currentValue
            } else {
              // Fallback: Wert = Cost Basis (keine Kursdaten zum Vergleich)
              totalValue += costBasis
            }
            
            totalInvested += costBasis
          }
        } else {
          // Fallback: Holdings-basiert
          const holding = holdings.find(h => h.symbol === symbol)
          if (!holding) return

          const costBasis = (holding.purchase_price || 0) * holding.quantity
          
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

    // 7. Lade S&P 500 (SPY) Benchmark-Daten für Vergleich
    let benchmarkData: Array<{ date: string; value: number }> = []
    try {
      const spyHistory = await fetchHistoricalPrices('SPY', fromDate, toDate)
      if (spyHistory.length > 0 && chartData.length > 0) {
        // Finde den ersten Tag mit Portfolio-Daten
        const firstPortfolioDate = chartData[0].date
        const firstPortfolioInvested = chartData[0].invested

        // Finde den SPY-Preis am ersten Portfolio-Tag
        const firstSPYPrice = spyHistory.find(d => d.date >= firstPortfolioDate)?.close || spyHistory[0].close

        // Normalisiere SPY auf den gleichen Startwert wie das investierte Kapital
        benchmarkData = spyHistory
          .filter(d => d.date >= firstPortfolioDate)
          .map(d => ({
            date: d.date,
            value: (d.close / firstSPYPrice) * firstPortfolioInvested
          }))
      }
    } catch (benchmarkError) {
      console.error('Error fetching benchmark data:', benchmarkError)
    }

    // Sample benchmark data to match chart data
    let sampledBenchmark = benchmarkData
    if (benchmarkData.length > 60) {
      const step = Math.ceil(benchmarkData.length / 60)
      sampledBenchmark = benchmarkData.filter((_, index) =>
        index % step === 0 || index === benchmarkData.length - 1
      )
    }

    return NextResponse.json({
      success: true,
      data: sampledData,
      benchmark: sampledBenchmark,
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