// src/app/api/portfolio-history/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface HistoricalDataPoint {
  date: string
  close: number
}

interface HoldingInput {
  symbol: string
  quantity: number
  purchase_date?: string
  purchase_price?: number  // Kaufpreis für Performance-Berechnung
}

// In-memory cache für API-Responses (24h TTL)
const historyCache = new Map<string, { data: HistoricalDataPoint[], timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 Stunden

async function fetchHistoricalPrices(symbol: string, days: number): Promise<HistoricalDataPoint[]> {
  const cacheKey = `${symbol}_${days}`
  const cached = historyCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY nicht konfiguriert')
  }

  // Berechne das "from" Datum
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const fromStr = fromDate.toISOString().split('T')[0]
  const toStr = new Date().toISOString().split('T')[0]

  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${fromStr}&to=${toStr}&apikey=${apiKey}`

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
    const { holdings, cashPosition, days } = body as {
      holdings: HoldingInput[]
      cashPosition: number
      days: number
    }

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json({ error: 'Keine Holdings angegeben' }, { status: 400 })
    }

    // Limitiere API-Aufrufe
    const validDays = Math.min(Math.max(days, 7), 730)

    // Hole historische Daten für alle Symbole parallel (max 10 parallel)
    const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))]
    const batchSize = 10
    const allHistoricalData: Map<string, HistoricalDataPoint[]> = new Map()

    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(symbol => fetchHistoricalPrices(symbol, validDays))
      )
      batch.forEach((symbol, index) => {
        allHistoricalData.set(symbol, results[index])
      })
    }

    // Debug: Log holdings mit Kaufdaten
    console.log('📊 Portfolio history calculation:')
    holdings.forEach(h => {
      console.log(`  - ${h.symbol}: ${h.quantity} shares @ ${h.purchase_price || 'unknown'}, purchased: ${h.purchase_date || 'unknown'}`)
    })

    // Tägliche Portfolio-Werte berechnen
    // WICHTIG: Tracke sowohl Marktwert als auch investiertes Kapital für Performance-Berechnung
    const dailyValues = new Map<string, { stockValue: number; invested: number; positionCount: number }>()

    holdings.forEach(holding => {
      const symbolData = allHistoricalData.get(holding.symbol)
      if (!symbolData) return

      // Parse Kaufdatum einmal für diese Position
      let purchaseDateTime: number | null = null
      if (holding.purchase_date) {
        const purchDate = new Date(holding.purchase_date)
        purchDate.setHours(0, 0, 0, 0)
        purchaseDateTime = purchDate.getTime()
      }

      // Kaufpreis für diese Position (für Performance-Berechnung)
      const costBasis = (holding.purchase_price || 0) * holding.quantity

      symbolData.forEach(day => {
        const date = day.date

        // KRITISCH: Überspringe Tage VOR dem Kaufdatum dieser Position
        if (purchaseDateTime !== null) {
          const dayDate = new Date(date)
          dayDate.setHours(0, 0, 0, 0)

          if (dayDate.getTime() < purchaseDateTime) {
            return // Diese Position existierte an diesem Tag noch nicht
          }
        }

        const marketValue = day.close * holding.quantity

        if (dailyValues.has(date)) {
          const existing = dailyValues.get(date)!
          existing.stockValue += marketValue
          existing.invested += costBasis
          existing.positionCount += 1
        } else {
          dailyValues.set(date, {
            stockValue: marketValue,
            invested: costBasis,
            positionCount: 1
          })
        }
      })
    })

    // WICHTIG: Filtere Tage raus an denen KEINE Position existierte
    // (das passiert wenn alle Positionen erst später gekauft wurden)
    const portfolioHistory = Array.from(dailyValues.entries())
      .filter(([, { positionCount }]) => positionCount > 0)
      .map(([date, { stockValue, invested }]) => {
        const totalValue = stockValue + cashPosition
        const totalInvested = invested + cashPosition
        const performance = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0

        return {
          date,
          value: Math.round(totalValue * 100) / 100,
          invested: Math.round(totalInvested * 100) / 100,
          performance: Math.round(performance * 100) / 100
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log(`  - Total data points: ${portfolioHistory.length}`)
    if (portfolioHistory.length > 0) {
      console.log(`  - Date range: ${portfolioHistory[0]?.date} to ${portfolioHistory[portfolioHistory.length - 1]?.date}`)
      console.log(`  - Start value: ${portfolioHistory[0]?.value}, End value: ${portfolioHistory[portfolioHistory.length - 1]?.value}`)
    }

    // Reduziere Datenpunkte für bessere Performance
    let sampledData = portfolioHistory
    if (portfolioHistory.length > 60) {
      const step = Math.ceil(portfolioHistory.length / 60)
      sampledData = portfolioHistory.filter((_, index) =>
        index % step === 0 || index === portfolioHistory.length - 1
      )
    }

    return NextResponse.json({
      success: true,
      data: sampledData,
      meta: {
        totalPoints: portfolioHistory.length,
        sampledPoints: sampledData.length,
        dateRange: {
          from: portfolioHistory[0]?.date || null,
          to: portfolioHistory[portfolioHistory.length - 1]?.date || null
        }
      }
    })

  } catch (error) {
    console.error('Portfolio-History API Fehler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Portfolio-Historie' },
      { status: 500 }
    )
  }
}
