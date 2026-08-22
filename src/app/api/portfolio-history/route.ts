// src/app/api/portfolio-history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolvePriceSource } from '@/lib/etfMasterLookup'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'
import {
  calculatePortfolioTwrByDate,
  calculateBenchmarkComparison,
  calculateCashDragVsBenchmark,
  calculateDepositBasedSeries,
} from '@/lib/portfolioTwr'
import { isETF } from '@/lib/etfUtils'
import { computeRiskMeasures, annualizedReturnPct, type RiskMeasures } from '@/lib/portfolioRisk'
import { hasPremiumAccess, PREMIUM_PROFILE_SELECT } from '@/lib/premiumAccess'
import {
  computeCorrelationMatrix,
  computeStressTest,
  computeAssetBeta,
  computeFactorRegression,
  runMonteCarlo,
  windowReturnPct,
  dailyReturnMap,
  STRESS_SCENARIOS,
  type CorrelationMatrixResult,
  type MonteCarloResult,
  type StressTestResult,
  type FactorRegressionResult,
  type FactorRow,
  type QuantSeriesPoint,
} from '@/lib/portfolioQuant'
import { getInstrumentsForSymbols, resolveSymbolViaSearch } from '@/lib/marketData/instrumentStore'
import { yahooSymbolFromEodhd } from '@/lib/marketData/symbols'
import type { Instrument } from '@/lib/marketData/types'
import factorFile from '@/data/factors/developed5FactorsDaily.json'

interface HistoricalDataPoint {
  date: string
  close: number
}

interface HoldingInput {
  portfolio_id?: string
  symbol: string
  quantity: number
  purchase_date?: string
  purchase_price?: number
}

interface Transaction {
  portfolio_id?: string
  date: string
  symbol: string
  quantity: number
  price: number
  total_value?: number
  fee?: number
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  notes?: string | null
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
async function fetchHistoricalPrices(
  symbol: string,
  fromDate: string,
  toDate: string,
  // adjusted=true → dividendenbereinigte Kurse (Total Return) nutzen, sofern
  // die Quelle sie liefert. Wichtig für Benchmarks: Preis-Return würde die
  // Indexrendite um die Dividendenrendite (~1,5–2 % p.a.) unterschätzen.
  adjusted = false,
  // Stammdaten-Notierung als letzter Fallback, wenn das rohe Symbol bei
  // keiner Quelle Daten liefert (Broker-Pseudo-Ticker wie 'MUV2.EU').
  instrument: Instrument | null = null
): Promise<HistoricalDataPoint[]> {
  // Mit/ohne Instrument getrennt cachen — sonst würde das leere Ergebnis des
  // ersten (instrumentlosen) Versuchs den Fallback-Versuch aushebeln.
  const cacheKey = `${symbol}_${fromDate}_${toDate}_${adjusted ? 'adj' : 'raw'}${instrument ? '_i' : ''}`
  const cached = historyCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY nicht konfiguriert')
  }

  // Preis-Quelle bestimmen: etfMaster hat Priorität
  const masterSource = resolvePriceSource(symbol)

  let historicalData: HistoricalDataPoint[] = []

  // Helper: FMP Historical mit optionaler Währungs-Konvertierung
  const fetchFmpHistorical = async (fetchSymbol: string, exchange?: 'GBp' | 'GBP' | 'EUR') => {
    try {
      const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${fetchSymbol}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`
      const response = await fetch(url, { next: { revalidate: 1800 } })
      if (response.ok) {
        const data = await response.json()
        if (data.historical && Array.isArray(data.historical) && data.historical.length > 0) {
          return data.historical
            .map((item: { date: string; close: number; adjClose?: number }) => {
              let close = adjusted && item.adjClose && item.adjClose > 0 ? item.adjClose : item.close
              if (exchange === 'GBp') close = (close / 100) * GBP_EUR_APPROX
              else if (exchange === 'GBP') close = close * GBP_EUR_APPROX
              return { date: item.date, close }
            })
            .reverse()
        }
      }
    } catch { /* weiter zu Fallbacks */ }
    return []
  }

  // Helper: Yahoo Finance Historical — Range dynamisch aus fromDate ableiten,
  // sonst werden bei MAX-Ansicht ältere Daten abgeschnitten (Yahoo-Default 1y).
  const yahooRange = (() => {
    const span = (Date.now() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
    if (span <= 5) return '5d'
    if (span <= 31) return '1mo'
    if (span <= 93) return '3mo'
    if (span <= 186) return '6mo'
    if (span <= 366) return '1y'
    if (span <= 731) return '2y'
    if (span <= 1827) return '5y'
    if (span <= 3653) return '10y'
    return 'max'
  })()

  const fetchYahooHistorical = async (yahooSymbol: string) => {
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${yahooRange}&interval=1d&region=DE`
      const yahooRes = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      })
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json()
        const result = yahooData?.chart?.result?.[0]
        if (result?.timestamp?.length > 0) {
          const timestamps: number[] = result.timestamp
          const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || []
          const adjCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || []
          const closes = adjusted && adjCloses.length > 0 ? adjCloses : rawCloses
          const fromTime = new Date(fromDate).getTime() / 1000
          const points: HistoricalDataPoint[] = []
          for (let i = 0; i < timestamps.length; i++) {
            const close = closes[i]
            if (close === null || close === undefined || close <= 0) continue
            if (timestamps[i] < fromTime) continue
            const d = new Date(timestamps[i] * 1000)
            points.push({ date: d.toISOString().split('T')[0], close: Math.round(close * 100) / 100 })
          }
          return points
        }
      }
    } catch { /* Yahoo fehlgeschlagen */ }
    return []
  }

  if (masterSource) {
    // === Master-gesteuertes Fetching ===
    if (masterSource.type === 'fmp_direct') {
      historicalData = await fetchFmpHistorical(symbol)
    } else if (masterSource.type === 'fmp_alt') {
      historicalData = await fetchFmpHistorical(masterSource.ticker, masterSource.exchange)
    } else if (masterSource.type === 'yahoo') {
      historicalData = await fetchYahooHistorical(masterSource.ticker || symbol)
    }

    // Master-Fallback: wenn prescribierte Quelle leer, Yahoo als Backup
    if (historicalData.length === 0 && masterSource.type !== 'yahoo') {
      historicalData = await fetchYahooHistorical(symbol)
    }
  } else {
    // === Nicht im Master: bestehende Fallback-Chain ===

    // Versuch 1: FMP direkt
    historicalData = await fetchFmpHistorical(symbol)

    // Versuch 2: EXCHANGE_FALLBACKS (z.B. FWRG.DE → FWRG.L)
    if (historicalData.length === 0) {
      const fallback = EXCHANGE_FALLBACKS[symbol]
      if (fallback) {
        historicalData = await fetchFmpHistorical(fallback.symbol, fallback.exchange)
      }
    }

    // Versuch 3: Yahoo Finance
    if (historicalData.length === 0) {
      historicalData = await fetchYahooHistorical(symbol)
    }

    // Versuch 4: Stammdaten. Broker-Ticker wie 'MUV2.EU' (Freedom24) oder
    // frisch gelernte US-Papiere kennt weder FMP noch Yahoo unter dem rohen
    // Symbol — die Notierung aus dem Instrument-Master schon. Ohne diesen
    // Schritt fielen solche Positionen still aus Wert- UND Investiert-Linie
    // (Dennis' Chart zeigte deshalb "weniger als die Hälfte").
    if (historicalData.length === 0 && instrument) {
      const candidates = [
        instrument.yahooSymbol,
        yahooSymbolFromEodhd(instrument.eodhdSymbol),
      ].filter((c): c is string => Boolean(c) && c !== symbol)
      for (const candidate of [...new Set(candidates)]) {
        historicalData = await fetchYahooHistorical(candidate)
        if (historicalData.length > 0) break
      }
      if (historicalData.length === 0 && instrument.fmpSymbol && instrument.fmpSymbol !== symbol) {
        historicalData = await fetchFmpHistorical(instrument.fmpSymbol)
      }
    }
  }

  // Cache speichern (auch leere Ergebnisse → verhindert wiederholte Requests)
  historyCache.set(cacheKey, { data: historicalData, timestamp: Date.now() })
  return historicalData
}

export async function POST(request: NextRequest) {
  try {
    // Auth: die Route liest Transaktionen zu übergebenen Portfolio-IDs —
    // ohne Login-Check könnte jeder mit erratenen UUIDs fremde Depots abfragen.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Premium-Status (für die Risiko-Kennzahlen — Chart/Benchmarks bleiben frei)
    const { data: premiumProfile } = await supabase
      .from('profiles')
      .select(PREMIUM_PROFILE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle()
    const isPremiumUser = hasPremiumAccess(premiumProfile)

    const body = await request.json()
    const { portfolioId, portfolioIds, holdings, cashPosition = 0, days = 30, quant = false } = body as {
      portfolioId?: string
      portfolioIds?: string[]
      holdings: HoldingInput[]
      cashPosition: number
      days: number
      /** Quant-Analysen (Korrelation, Stresstests, Monte-Carlo, Faktoren) mitberechnen — Premium */
      quant?: boolean
    }

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Limitiere API-Aufrufe — bis zu 15 Jahre erlaubt, damit MAX-Ansicht
    // tatsächlich die volle Depot-Historie zeigt (vorher 730 Tage → Charts
    // älterer Depots wurden auf 2 Jahre abgeschnitten).
    const validDays = Math.min(Math.max(days, 7), 5475)

    const endDate = new Date()
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - validDays)

    // Für MAX (>2 Jahre): wenn echte Transaktionen existieren, fromDate auf
    // frühestes Tx-Datum minus 7 Tage Buffer setzen — sonst laden wir massig
    // Preisdaten für Zeiträume, in denen das Depot leer war.
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    const requestedIds = Array.isArray(portfolioIds)
      ? portfolioIds.filter(isValidUuid)
      : isValidUuid(portfolioId) ? [portfolioId!] : []

    // Ownership: nur Portfolios des eingeloggten Users zulassen
    let earlyValidIds: string[] = []
    if (requestedIds.length > 0) {
      const { data: ownedPortfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .in('id', requestedIds)
      earlyValidIds = (ownedPortfolios || []).map(p => p.id)
      if (earlyValidIds.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (validDays > 730 && earlyValidIds.length > 0) {
      const { data: earliestTx } = await supabase
        .from('portfolio_transactions')
        .select('date')
        .in('portfolio_id', earlyValidIds)
        .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])
        .order('date', { ascending: true })
        .limit(1)

      if (earliestTx && earliestTx.length > 0) {
        const earliestDate = new Date(earliestTx[0].date)
        earliestDate.setDate(earliestDate.getDate() - 7)
        if (earliestDate > startDate) {
          startDate = earliestDate
        }
      }
    }

    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]

    // 1. Lade Transaktionen:
    //    - portfolioIds[] (Alle-Depots-Ansicht) → alle Portfolios des Users
    //    - portfolioId (Einzelansicht) → genau dieses Portfolio
    //    - 'all' als portfolioId ist kein gültiges UUID → wird ignoriert (Fallback zu Holdings)
    let transactionsBySymbol = new Map<string, Transaction[]>()
    let allTransactions: Transaction[] = []
    let securityTransactions: Transaction[] = []

    // UUIDs für DB-Query (oben für Tx-Datum-Lookup bereits abgeleitet)
    const validIds = earlyValidIds

    if (validIds.length > 0) {
      // WICHTIG: Paginiert laden. PostgREST kappt Antworten bei 1000 Zeilen —
      // bei Multi-Depot-Nutzern (>1000 Transaktionen) fehlten sonst still die
      // NEUESTEN Buchungen: der Chart bewertete neue Positionen mit 0 und
      // sprang am letzten (live berechneten) Punkt um zehntausende Euro hoch.
      const PAGE_SIZE = 1000
      const transactions: Transaction[] = []
      let txError: unknown = null
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data: page, error } = await supabase
          .from('portfolio_transactions')
          .select('portfolio_id, date, symbol, quantity, price, total_value, fee, type, notes')
          .in('portfolio_id', validIds)
          // Alle bestandsrelevanten Buchungen plus Cash/Dividenden laden. Für die
          // Wertentwicklung nutzen wir die Security-Buchungen; Cash/Dividenden
          // bleiben hier verfügbar, falls die Kennzahlen später erweitert werden.
          .in('type', ['buy', 'sell', 'dividend', 'cash_deposit', 'cash_withdrawal', 'transfer_in', 'transfer_out'])
          .order('date', { ascending: true })
          // Sekundär-Sortierung: stabile Reihenfolge bei gleichem Datum, sonst
          // können an Seitengrenzen Zeilen doppelt oder gar nicht ankommen.
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) {
          txError = error
          break
        }
        if (!page || page.length === 0) break
        transactions.push(...(page as Transaction[]))
        if (page.length < PAGE_SIZE) break
      }

      if (txError) {
        console.error('Error loading transactions:', txError)
      } else if (transactions.length > 0) {
        allTransactions = transactions

        const currentHoldingKeys = new Set<string>()
        holdings.forEach(h => {
          const symbol = h.symbol?.toUpperCase()
          if (!symbol) return
          currentHoldingKeys.add(symbol)
          if (h.portfolio_id) currentHoldingKeys.add(`${h.portfolio_id}|${symbol}`)
          else if (validIds.length === 1) currentHoldingKeys.add(`${validIds[0]}|${symbol}`)
        })

        const groupedSecurityTxs = new Map<string, Transaction[]>()
        transactions.forEach((tx: Transaction) => {
          if (!tx.symbol || tx.symbol === 'CASH') return
          if (!['buy', 'sell', 'transfer_in', 'transfer_out'].includes(tx.type)) return
          const key = `${tx.portfolio_id || ''}|${tx.symbol.toUpperCase()}`
          if (!groupedSecurityTxs.has(key)) groupedSecurityTxs.set(key, [])
          groupedSecurityTxs.get(key)!.push(tx)
        })

        groupedSecurityTxs.forEach((txs, key) => {
          const symbol = txs[0]?.symbol?.toUpperCase()
          if (!symbol) return

          const finalShares = txs.reduce((shares, tx) => {
            if (tx.type === 'buy' || tx.type === 'transfer_in') return shares + (Number(tx.quantity) || 0)
            if (tx.type === 'sell' || tx.type === 'transfer_out') return shares - (Number(tx.quantity) || 0)
            return shares
          }, 0)

          // Wenn eine Transaktionshistorie am Ende noch offene Shares hat, aber
          // diese Position nicht in den aktuell geladenen Holdings existiert,
          // ist sie für diesen Dashboard-Chart ein Orphan. Beispiel: alte
          // BTCUSD/ETHUSD-Buys ohne Holding-Zeile erzeugten 18-Mio.-Spikes.
          // Voll verkaufte historische Positionen bleiben erhalten.
          if (finalShares > 0.0001 && !currentHoldingKeys.has(key) && !currentHoldingKeys.has(symbol)) {
            console.warn(`[portfolio-history] Ignoring orphan open transaction position ${key} (${finalShares} shares)`)
            return
          }

          securityTransactions.push(...txs)
        })

        securityTransactions.forEach((tx: Transaction) => {
          if (!transactionsBySymbol.has(tx.symbol)) {
            transactionsBySymbol.set(tx.symbol, [])
          }
          transactionsBySymbol.get(tx.symbol)!.push(tx)
        })

        // Innerhalb eines Tages Käufe vor Verkäufen verarbeiten. Die DB sortiert
        // nur nach Datum — bei Same-Day-Trades ist die Reihenfolge zufällig.
        // Würde ein Verkauf vor dem Kauf desselben Tages verarbeitet, greift
        // die Durchschnittskosten-Reduktion ins Leere (avgCost = 0) und die
        // Kostenbasis ("Investiertes Kapital") bleibt dauerhaft zu hoch.
        const txPhase = (tx: Transaction) =>
          tx.type === 'buy' || tx.type === 'transfer_in' ? 0 : 1
        transactionsBySymbol.forEach(txs => {
          txs.sort((a, b) => a.date.localeCompare(b.date) || txPhase(a) - txPhase(b))
        })
      }
    }

    const useTransactions = transactionsBySymbol.size > 0

    // 2. Lade historische Kurse für alle Symbole
    const uniqueSymbols = [...new Set([
      ...holdings.map(h => h.symbol),
      ...securityTransactions
        .filter(tx => tx.symbol && tx.symbol !== 'CASH' && ['buy', 'sell', 'transfer_in', 'transfer_out'].includes(tx.type))
        .map(tx => tx.symbol),
    ])]
    const pricesBySymbol = new Map<string, Map<string, number>>()

    // Stammdaten für alle Symbole: liefert für Broker-Pseudo-Ticker ('MUV2.EU')
    // und gelernte Papiere die echte Notierung + deren Währung. Nur als
    // Fallback genutzt — wo das rohe Symbol Daten liefert, bleibt alles wie es war.
    const instrumentsBySymbol = await getInstrumentsForSymbols(uniqueSymbols).catch(() => new Map<string, Instrument>())
    // Währung der Notierung, über die der Fallback geladen hat (Symbol → 'EUR'|'USD'|'GBX'|…)
    const priceCurrencyBySymbol = new Map<string, string>()

    // Parallel laden (max 10 gleichzeitig)
    const batchSize = 10
    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async symbol => {
          const raw = await fetchHistoricalPrices(symbol, fromDate, toDate)
          if (raw.length > 0) return raw
          // Rohe Kette leer → Stammdaten-Notierung versuchen; unbekannte
          // Symbole einmalig über die EODHD-Suche lernen (persistiert).
          let instrument = instrumentsBySymbol.get(symbol.toUpperCase()) || null
          if (!instrument) {
            instrument = await resolveSymbolViaSearch(symbol).catch(() => null)
          }
          if (!instrument) return raw
          const viaInstrument = await fetchHistoricalPrices(symbol, fromDate, toDate, false, instrument)
          if (viaInstrument.length > 0 && instrument.currency) {
            priceCurrencyBySymbol.set(symbol, instrument.currency.toUpperCase())
          }
          return viaInstrument
        })
      )
      batch.forEach((symbol, index) => {
        const priceMap = new Map<string, number>()
        results[index].forEach(day => {
          priceMap.set(day.date, day.close)
        })
        pricesBySymbol.set(symbol, priceMap)
      })
    }

    // 2b. Lade Wechselkurs-Historien für nicht-EUR Aktien und Benchmarks
    const hasGBXStocks = uniqueSymbols.some(s => isGBXTicker(s)) ||
      [...priceCurrencyBySymbol.values()].some(c => c === 'GBX' || c === 'GBP')
    const eurUsdRateByDate = new Map<string, number>() // date → USD-to-EUR rate
    const gbpEurRateByDate = new Map<string, number>() // date → GBP-to-EUR rate

    // Parallel laden wenn beide benötigt
    const fxPromises: Promise<void>[] = []

    // EUR/USD immer laden: selbst ohne USD-Positionen brauchen die USD-notierten
    // Benchmarks (SPY/URTH/VT) die Umrechnung nach EUR, sonst vergleicht der
    // Chart EUR-Depotrendite mit USD-Indexrendite und ignoriert Währungseffekte.
    {
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
    securityTransactions.forEach(tx => {
      if (tx.date) allDates.add(tx.date)
    })
    const sortedDates = Array.from(allDates).sort()

    const sortedDatesBySymbol = new Map<string, string[]>()
    pricesBySymbol.forEach((priceMap, symbol) => {
      sortedDatesBySymbol.set(symbol, Array.from(priceMap.keys()).sort())
    })

    function getPriceForDate(symbol: string, date: string): number | null {
      const priceMap = pricesBySymbol.get(symbol)
      if (!priceMap) return null
      const direct = priceMap.get(date)
      if (direct && direct > 0) return direct

      const dates = sortedDatesBySymbol.get(symbol)
      if (!dates || dates.length === 0) return null
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] <= date) {
          const price = priceMap.get(dates[i])
          if (price && price > 0) return price
        }
      }
      return null
    }

    // Börsenkurs → EUR (gleiche Logik wie im Tages-Loop unten).
    // Kam der Kurs über die Stammdaten-Notierung (Pseudo-Ticker wie 'MUV2.EU'),
    // zählt DEREN Währung — die Suffix-Heuristik kennt '.EU' nicht und würde
    // EUR-Kurse fälschlich als USD umrechnen.
    function toEurPrice(symbol: string, price: number, date: string): number {
      const instrumentCurrency = priceCurrencyBySymbol.get(symbol)
      if (instrumentCurrency) {
        if (instrumentCurrency === 'EUR') return price
        if (instrumentCurrency === 'GBX') return (price / 100) * getGBPEURRateForDate(date)
        if (instrumentCurrency === 'GBP') return price * getGBPEURRateForDate(date)
        return price * getEURRateForDate(date)
      }
      if (isEURTicker(symbol)) return price
      if (isGBXTicker(symbol)) return (price / 100) * getGBPEURRateForDate(date)
      return price * getEURRateForDate(date)
    }

    const txValue = (tx: Transaction): number => {
      const totalValue = Number(tx.total_value) || 0
      if (totalValue > 0) return totalValue
      return Math.abs((Number(tx.quantity) || 0) * (Number(tx.price) || 0))
    }

    const txFee = (tx: Transaction): number => Math.abs(Number(tx.fee) || 0)

    // Depotüberträge (und vereinzelt Importe) kommen teils ohne Kostenbasis an
    // (price=0, total_value=0). Für den Wert-Chart ist das ok — der Bestand
    // stimmt. Aber jede flussbasierte Rechnung (TWR, Benchmark-Schatten-Depot,
    // Attribution, Kapital-Linie) würde die Shares als Geschenk werten: der TWR
    // springt am Übertragstag treppenartig nach oben (+100%-Stufen) und der
    // Benchmark-Vergleich explodiert. Fehlende Beträge daher mit dem Marktwert
    // am Transaktionstag schätzen — die historischen Kurse sind hier geladen.
    let estimatedFlowCount = 0
    securityTransactions.forEach(tx => {
      if (txValue(tx) > 0) return
      const quantity = Number(tx.quantity) || 0
      if (quantity <= 0 || !tx.date) return
      const price = getPriceForDate(tx.symbol, tx.date)
      if (!price) return
      tx.total_value = Math.round(quantity * toEurPrice(tx.symbol, price, tx.date) * 100) / 100
      estimatedFlowCount++
    })
    if (estimatedFlowCount > 0) {
      console.log(`📊 Estimated market value for ${estimatedFlowCount} zero-amount security transactions`)
    }

    // 4. Tracke den ersten Kauftag pro Symbol (für korrekte Startberechnung)
    const firstPurchaseDateBySymbol = new Map<string, string>()

    if (useTransactions) {
      transactionsBySymbol.forEach((txs, symbol) => {
        const firstBuy = txs.find(tx => tx.type === 'buy' || tx.type === 'transfer_in')
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
        const currentPrice = getPriceForDate(symbol, date) // In Börsenwährung (USD, EUR oder GBX)
        const firstPurchaseDate = firstPurchaseDateBySymbol.get(symbol)

        if (!currentPrice) return

        // Position existiert erst ab Kaufdatum
        if (firstPurchaseDate && date < firstPurchaseDate) return

        // Kurs in EUR umrechnen (EUR direkt, GBX ÷100 × GBP-Rate, sonst USD-Rate)
        const currentPriceEUR = toEurPrice(symbol, currentPrice, date)

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
                costBasis += txValue(tx) + (tx.type === 'buy' ? txFee(tx) : 0)
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

      // Parqet-ähnlich: "Investiertes Kapital" entspricht der Kostenbasis
      // der gehaltenen Wertpapiere. Verkäufe reduzieren diese Linie über die
      // anteilige Durchschnittskostenbasis, nicht über den Verkaufserlös.
      // Bewusst NICHT "Zugeführtes Kapital"/Einzahlungen: reinvestierte
      // Verkaufserlöse und Dividenden erhöhen die Kostenbasis, daher kann
      // sie über den tatsächlichen Depot-Einzahlungen liegen.
      if (totalValue > 0 || totalInvested > 0) {
        const performance = totalInvested > 0
          ? ((totalValue - totalInvested) / totalInvested) * 100
          : 0

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

    // 7. Berechne TWR (True Time-Weighted Return) für fairen Benchmark-Vergleich.
    // Der Helper lässt chartData unverändert. Wenn ein plausibles Cash-Ledger
    // vorhanden ist, werden Käufe/Verkäufe als interne Cash↔Wertpapier-Umschichtung
    // behandelt, Dividenden erhöhen den Return und Gebühren mindern ihn. Ohne
    // rekonstruierbares Cash-Ledger bleibt die bisherige Security-only-Logik aktiv.
    //
    // WICHTIG — Symmetrie zwischen Wert- und Flow-Seite: Transaktionen von
    // Symbolen OHNE Preisdaten (Import-Artefakte wie "ULVRUSD", "BLKCHF",
    // delistete Ticker) fliegen raus. Ihr Wert taucht nie in chartData auf —
    // zählte ihr Kauf-Flow trotzdem, sähe jeder dieser Käufe für den TWR wie
    // ein Totalverlust aus. Bei kleinen Frühdepots zerstörte das die gesamte
    // multiplikative Kette (−87% "Rendite" trotz positiven Depots).
    // Erstes verfügbares Preisdatum je Symbol — Flows davor sind Phantome
    // (Wert erscheint erst ab dem ersten Kurs, Kauf zählte aber sofort).
    const firstPriceDateBySymbol = new Map<string, string>()
    pricesBySymbol.forEach((priceMap, symbol) => {
      if (priceMap.size === 0) return
      firstPriceDateBySymbol.set(symbol, Array.from(priceMap.keys()).sort()[0])
    })
    const GRACE_DAYS_MS = 7 * 86400000
    const hasPriceData = (symbol: string | undefined, txDate?: string): boolean => {
      if (!symbol) return false
      const firstPrice = firstPriceDateBySymbol.get(symbol)
      if (!firstPrice) return false
      if (!txDate) return true
      // Kleine Toleranz: Kauf kurz vor dem ersten Kurs (Wochenende/Feiertage) ist ok
      return new Date(txDate).getTime() >= new Date(firstPrice).getTime() - GRACE_DAYS_MS
    }
    const twrTransactions = [
      ...securityTransactions.filter(tx => hasPriceData(tx.symbol, tx.date)),
      ...allTransactions.filter(tx => {
        if (['buy', 'sell', 'transfer_in', 'transfer_out'].includes(tx.type)) return false
        // Dividenden hängen an einer Position — ohne bewertbares Symbol würde
        // die Ausschüttung den Return einer Phantom-Position gutschreiben.
        if (tx.type === 'dividend' && tx.symbol && tx.symbol !== 'CASH' && !hasPriceData(tx.symbol)) return false
        return true
      }),
    ]

    // 6b. Einzahlungsbasierte Darstellung, wenn das Cash-Ledger plausibel
    // rekonstruierbar ist: Wert-Linie = Wertpapiere + Cash, Kapital-Linie =
    // kumulierte Netto-Einzahlungen (+ echte Depotüberträge). Reinvestierte
    // Verkaufserlöse und Dividenden erhöhen die Kapital-Linie damit nicht mehr.
    // Ohne Cash-Ledger bleibt die Kostenbasis-Darstellung aktiv.
    // WICHTIG: TWR und Benchmark-Vergleich rechnen weiter auf dem
    // Wertpapier-only chartData — nur die ausgelieferte Chart-Serie ändert sich.
    const depositSeries = useTransactions
      ? calculateDepositBasedSeries({ chartData, transactions: twrTransactions, cashPosition })
      : null
    const investedMode: 'deposits' | 'cost_basis' = depositSeries ? 'deposits' : 'cost_basis'
    const displayChartData = depositSeries
      ? chartData.map(point => {
          const value = Math.round((depositSeries.valueByDate.get(point.date) ?? point.value) * 100) / 100
          const invested = Math.round((depositSeries.investedByDate.get(point.date) ?? point.invested) * 100) / 100
          const performance = invested > 0
            ? Math.round(((value - invested) / invested) * 10000) / 100
            : 0
          return { date: point.date, value, invested, performance }
        })
      : chartData

    // Reduziere Datenpunkte für bessere Performance
    let sampledData = displayChartData
    if (displayChartData.length > 60) {
      const step = Math.ceil(displayChartData.length / 60)
      sampledData = displayChartData.filter((_, index) =>
        index % step === 0 || index === displayChartData.length - 1
      )
    }

    // Holdings-Fallback (keine Transaktionen in der DB): synthetische Buys aus
    // purchase_date/purchase_price ableiten. Ohne diese Flows würde der TWR
    // jeden später gekauften Bestand als Kurssprung (= Fake-Rendite) werten.
    const syntheticTransactions: Transaction[] = !useTransactions
      ? holdings
          .filter(h => h.purchase_date && h.quantity > 0 && (h.purchase_price || 0) > 0)
          .map(h => ({
            date: h.purchase_date!,
            symbol: h.symbol,
            quantity: h.quantity,
            price: h.purchase_price!,
            type: 'buy' as const,
          }))
      : []

    const effectiveTwrTransactions = useTransactions ? twrTransactions : syntheticTransactions

    const twrByDate = calculatePortfolioTwrByDate({
      chartData,
      transactions: effectiveTwrTransactions,
      cashPosition,
      useTransactions: useTransactions || syntheticTransactions.length > 0,
    })

    // 8. Lade Benchmark-Daten für Performance-Vergleich (in %)
    // SPY = S&P 500, URTH = MSCI World, VT = FTSE All-World
    let performanceData: Array<{
      date: string
      portfolioPerformance: number
      spyPerformance: number
      msciWorldPerformance: number
      ftseAllWorldPerformance: number
    }> = []
    let benchmarkComparison: {
      startDate: string
      endDate: string
      periodYears: number
      portfolio: { totalReturnPct: number; annualizedPct: number | null }
      benchmarks: Record<string, {
        label: string
        totalReturnPct: number
        annualizedPct: number | null
        diffTotalPct: number
        diffPaPct: number | null
        euroDiff: number | null
      } | null>
      attribution?: {
        benchmarkLabel: string
        totalEuroDiff: number
        totalDiffPaPct: number | null
        buckets: Array<{ key: string; label: string; euroDiff: number; paPct: number | null }>
        best: { symbol: string; euroDiff: number } | null
        worst: { symbol: string; euroDiff: number } | null
        cashDragEuro: number | null
      }
    } | null = null

    let riskMeasures: {
      riskFreePct: number | null
      portfolio: RiskMeasures | null
      ftseAllWorld: RiskMeasures | null
      sp500: RiskMeasures | null
      msciWorld: RiskMeasures | null
    } | null = null

    let quantAnalysis: {
      correlation: CorrelationMatrixResult | null
      monteCarlo: MonteCarloResult | null
      stressTests: StressTestResult[]
      factorRegression: FactorRegressionResult | null
    } | null = null

    try {
      const [spyHistory, urthHistory, vtHistory] = await Promise.all([
        fetchHistoricalPrices('SPY', fromDate, toDate, true),
        fetchHistoricalPrices('URTH', fromDate, toDate, true),
        fetchHistoricalPrices('VT', fromDate, toDate, true),
      ])

      if (spyHistory.length > 0 && chartData.length > 0) {
        const firstPortfolioDate = chartData[0].date

        // Benchmarks in EUR umrechnen: das Depot wird in EUR bewertet, also
        // muss die Benchmark denselben Währungseffekt tragen (unhedged Sicht
        // eines EUR-Anlegers). Kurse sind bereits dividendenbereinigt (adjClose).
        const normalizeBenchmarkHistory = (history: HistoricalDataPoint[]) =>
          [...history]
            .filter(d => d.close > 0)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ date: d.date, close: d.close * getEURRateForDate(d.date) }))

        const spyBenchmark = normalizeBenchmarkHistory(spyHistory)
        const urthBenchmark = normalizeBenchmarkHistory(urthHistory)
        const vtBenchmark = normalizeBenchmarkHistory(vtHistory)

        // Benchmarks handeln nicht an jedem Portfolio-Handelstag (US-Feiertage,
        // EU-Börsentage, importierte Transaktionsdaten). Fehlende Tageskurse
        // werden mit dem letzten bekannten Close fortgeführt, statt als 0%
        // im Chart zu landen.
        const findPriceOnOrBefore = (history: HistoricalDataPoint[], date: string) => {
          let price = 0
          for (const point of history) {
            if (point.date > date) break
            price = point.close
          }
          return price
        }

        const findPriceOnOrAfter = (history: HistoricalDataPoint[], date: string) =>
          history.find(point => point.date >= date)?.close || 0

        const findStartPrice = (history: HistoricalDataPoint[]) =>
          findPriceOnOrBefore(history, firstPortfolioDate) || findPriceOnOrAfter(history, firstPortfolioDate)

        const firstSPYPrice = findStartPrice(spyBenchmark)
        const firstURTHPrice = findStartPrice(urthBenchmark)
        const firstVTPrice = findStartPrice(vtBenchmark)

        const calcReturn = (history: HistoricalDataPoint[], date: string, firstPrice: number) => {
          const price = findPriceOnOrBefore(history, date)
          return price && firstPrice ? Math.round(((price / firstPrice) - 1) * 10000) / 100 : 0
        }

        // Performance-Daten: Portfolio-TWR vs. Benchmark Total Return in EUR —
        // beide Seiten inkl. Dividenden und Währungseffekt, damit der Vergleich
        // fair ist. Der Benchmark-Gap Forward-Fill oben bleibt bewusst erhalten.
        performanceData = chartData.map(point => ({
          date: point.date,
          portfolioPerformance: Math.round((twrByDate.get(point.date) || 0) * 100) / 100,
          spyPerformance: calcReturn(spyBenchmark, point.date, firstSPYPrice),
          msciWorldPerformance: calcReturn(urthBenchmark, point.date, firstURTHPrice),
          ftseAllWorldPerformance: calcReturn(vtBenchmark, point.date, firstVTPrice),
        }))

        // 8b. Benchmark-Vergleich als Kennzahlen: Differenz p.a. (zeitgewichtet)
        // und Euro-Betrag über ein Schatten-Depot (geldgewichtet, gleiche
        // Einzahlungen zu gleichen Zeitpunkten in den Index).
        if (chartData.length > 1) {
          const lastDate = chartData[chartData.length - 1].date
          const periodDays =
            (new Date(lastDate).getTime() - new Date(firstPortfolioDate).getTime()) / 86400000
          const periodYears = periodDays / 365.25
          const portfolioTotalPct = twrByDate.get(lastDate) || 0

          const round2 = (v: number) => Math.round(v * 100) / 100
          // Annualisieren erst ab ~1 Jahr — kürzere Zeiträume hochzurechnen
          // würde absurde p.a.-Werte liefern; dann zählt die Gesamt-Differenz.
          const annualize = (totalPct: number): number | null =>
            periodYears >= 1 && totalPct > -100
              ? (Math.pow(1 + totalPct / 100, 1 / periodYears) - 1) * 100
              : null

          const portfolioAnnualized = annualize(portfolioTotalPct)

          // Fenster-konforme Flows fürs Schatten-Depot: der Bestand am ersten
          // Chart-Tag zählt als synthetischer Kauf zum damaligen Marktwert,
          // danach nur noch Flows innerhalb des Fensters. Ohne das fehlten bei
          // Teilzeiträumen (1M–1Y) sämtliche früheren Einzahlungen im
          // Schatten-Depot (der hasPriceData-Grace-Filter wirft sie raus, weil
          // vor dem Fenster keine Kurse geladen sind) — verglichen wurde dann
          // "heutiger Gesamtwert" gegen "nur die Flows der letzten Monate",
          // was Phantom-Beträge in Depotgröße lieferte.
          const windowFlowSource = useTransactions ? securityTransactions : syntheticTransactions
          const startShareBySymbol = new Map<string, number>()
          windowFlowSource.forEach(tx => {
            if (!tx.symbol || tx.date > firstPortfolioDate) return
            const qty = Number(tx.quantity) || 0
            if (tx.type === 'buy' || tx.type === 'transfer_in') {
              startShareBySymbol.set(tx.symbol, (startShareBySymbol.get(tx.symbol) || 0) + qty)
            } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
              startShareBySymbol.set(tx.symbol, (startShareBySymbol.get(tx.symbol) || 0) - qty)
            }
          })
          const syntheticStartBuys: Transaction[] = []
          startShareBySymbol.forEach((shares, symbol) => {
            if (shares <= 0.0001) return
            const price = getPriceForDate(symbol, firstPortfolioDate)
            if (!price) return
            syntheticStartBuys.push({
              date: firstPortfolioDate,
              symbol,
              quantity: shares,
              price: 0,
              total_value: Math.round(shares * toEurPrice(symbol, price, firstPortfolioDate) * 100) / 100,
              type: 'buy',
            })
          })
          const windowedBenchmarkTxs = [
            ...syntheticStartBuys,
            ...effectiveTwrTransactions.filter(tx => tx.date > firstPortfolioDate),
          ]

          const buildBenchmarkStats = (
            label: string,
            series: Array<{ date: string; close: number }>
          ) => {
            const cmp = calculateBenchmarkComparison({
              chartData,
              transactions: windowedBenchmarkTxs,
              benchmarkPrices: series,
            })
            if (!cmp) return null
            const benchAnnualized = annualize(cmp.benchmarkTotalReturnPct)
            return {
              label,
              totalReturnPct: round2(cmp.benchmarkTotalReturnPct),
              annualizedPct: benchAnnualized !== null ? round2(benchAnnualized) : null,
              diffTotalPct: round2(portfolioTotalPct - cmp.benchmarkTotalReturnPct),
              diffPaPct:
                portfolioAnnualized !== null && benchAnnualized !== null
                  ? round2(portfolioAnnualized - benchAnnualized)
                  : null,
              euroDiff: cmp.euroDiff !== null ? Math.round(cmp.euroDiff) : null,
            }
          }

          benchmarkComparison = {
            startDate: firstPortfolioDate,
            endDate: lastDate,
            periodYears: Math.round(periodYears * 100) / 100,
            portfolio: {
              totalReturnPct: round2(portfolioTotalPct),
              annualizedPct: portfolioAnnualized !== null ? round2(portfolioAnnualized) : null,
            },
            benchmarks: {
              ftseAllWorld: buildBenchmarkStats('FTSE All-World', vtBenchmark),
              sp500: buildBenchmarkStats('S&P 500', spyBenchmark),
              msciWorld: buildBenchmarkStats('MSCI World', urthBenchmark),
            },
          }

          // 8b2. Risiko-Kennzahlen (Premium): aus der flow-bereinigten
          // TWR-Kette (Depot) bzw. den EUR-Preisserien (Benchmark). Der
          // risikofreie Zins kommt aus der XEON-Kursserie (€STR) — echte
          // Daten statt hartcodiertem Zinssatz.
          if (isPremiumUser) {
            const portfolioWealth = chartData.map(point => ({
              date: point.date,
              value: 1 + (twrByDate.get(point.date) || 0) / 100,
            }))
            const vtSeries = vtBenchmark.map(p => ({ date: p.date, value: p.close }))

            const xeonHistory = await fetchHistoricalPrices('XEON.DE', fromDate, toDate)
            const riskFreePct = annualizedReturnPct(
              xeonHistory.map(p => ({ date: p.date, value: p.close })),
            )

            riskMeasures = {
              riskFreePct: riskFreePct !== null ? round2(riskFreePct) : null,
              portfolio: computeRiskMeasures(portfolioWealth, riskFreePct, vtSeries),
              ftseAllWorld: computeRiskMeasures(vtSeries, riskFreePct),
              sp500: computeRiskMeasures(spyBenchmark.map(p => ({ date: p.date, value: p.close })), riskFreePct),
              msciWorld: computeRiskMeasures(urthBenchmark.map(p => ({ date: p.date, value: p.close })), riskFreePct),
            }
          }

          // 8b3. Quant-Analysen (Premium, nur auf Anfrage — der Analyse-Tab
          // setzt quant:true, der Dashboard-Chart nicht): Korrelationsmatrix,
          // Stresstests, Monte-Carlo-Projektion, Fama-French-Faktorregression.
          if (quant && isPremiumUser) {
            try {
              // Aktuelle Gewichte je Symbol (EUR-Wert am letzten Chart-Tag).
              // Symbole können in der Alle-Depots-Ansicht mehrfach vorkommen →
              // Mengen aggregieren.
              const quantityBySymbol = new Map<string, number>()
              holdings.forEach(h => {
                if (!h.symbol || h.quantity <= 0) return
                quantityBySymbol.set(h.symbol, (quantityBySymbol.get(h.symbol) || 0) + h.quantity)
              })
              const weightBySymbol = new Map<string, number>()
              let securitiesValueEur = 0
              quantityBySymbol.forEach((qty, symbol) => {
                const price = getPriceForDate(symbol, lastDate)
                if (!price) return
                const valueEur = qty * toEurPrice(symbol, price, lastDate)
                weightBySymbol.set(symbol, valueEur)
                securitiesValueEur += valueEur
              })

              // EUR-Preisserien je gehaltener Position (aus den ohnehin
              // geladenen Kursen des aktuellen Fensters)
              const eurSeriesBySymbol = new Map<string, QuantSeriesPoint[]>()
              weightBySymbol.forEach((_, symbol) => {
                const priceMap = pricesBySymbol.get(symbol)
                if (!priceMap || priceMap.size === 0) return
                const series = Array.from(priceMap.entries())
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([date, close]) => ({ date, value: toEurPrice(symbol, close, date) }))
                eurSeriesBySymbol.set(symbol, series)
              })

              const spyEurSeries: QuantSeriesPoint[] = spyBenchmark.map(p => ({ date: p.date, value: p.close }))

              // --- Korrelationsmatrix ---
              const correlation = computeCorrelationMatrix(eurSeriesBySymbol, weightBySymbol)

              // --- Monte-Carlo auf dem TWR-Wealth-Index ---
              const wealthSeries: QuantSeriesPoint[] = chartData.map(point => ({
                date: point.date,
                value: 1 + (twrByDate.get(point.date) || 0) / 100,
              }))
              const monteCarlo = runMonteCarlo(wealthSeries, securitiesValueEur)

              // --- Stresstests: heutige Depotstruktur durch echte Krisenfenster ---
              // Beta-Fallback vs. S&P 500 (EUR) für Positionen ohne damalige Kurse
              const betaBySymbol = new Map<string, number | null>()
              weightBySymbol.forEach((_, symbol) => {
                const series = eurSeriesBySymbol.get(symbol)
                betaBySymbol.set(symbol, series ? computeAssetBeta(series, spyEurSeries) : null)
              })

              const stressTests: StressTestResult[] = []
              for (const scenario of STRESS_SCENARIOS) {
                // Fenster-FX separat laden: der EUR/USD-Kurs von damals weicht
                // deutlich vom heutigen ab (2008 ≈ 1,45 statt ≈ 1,08) — die
                // aktuelle FX-Map würde die Krisenrenditen verfälschen.
                const [spyWindow, fxWindow] = await Promise.all([
                  fetchHistoricalPrices('SPY', scenario.from, scenario.to, true),
                  fetchHistoricalPrices('EURUSD', scenario.from, scenario.to),
                ])
                if (spyWindow.length === 0) continue

                const fxWindowMap = new Map<string, number>()
                fxWindow.forEach(day => {
                  if (day.close > 0) fxWindowMap.set(day.date, 1 / day.close)
                })
                const windowUsdToEur = (date: string): number =>
                  fxWindowMap.size > 0 ? getRateForDate(fxWindowMap, date, 0.92) : 1

                const toWindowEurSeries = (symbol: string, history: HistoricalDataPoint[]): QuantSeriesPoint[] => {
                  const instrumentCurrency = priceCurrencyBySymbol.get(symbol)
                  const isNonUsd = instrumentCurrency
                    ? instrumentCurrency !== 'USD'
                    : isEURTicker(symbol) || isGBXTicker(symbol)
                  return history
                    .filter(d => d.close > 0)
                    .map(d => ({
                      date: d.date,
                      // GBX-Titel: nur Preisrendite (GBP-FX-Historie laden wir
                      // fürs Fenster nicht — der ÷100-Faktor kürzt sich in der
                      // Rendite ohnehin raus). USD-Titel: mit Fenster-FX.
                      value: isNonUsd ? d.close : d.close * windowUsdToEur(d.date),
                    }))
                }

                const marketReturn = windowReturnPct(
                  toWindowEurSeries('SPY', spyWindow),
                  scenario.from,
                  scenario.to,
                )
                if (marketReturn === null) continue

                // Fensterkurse der Positionen (max 10 parallel, wie oben)
                const symbols = Array.from(weightBySymbol.keys())
                const windowReturnBySymbol = new Map<string, number | null>()
                for (let i = 0; i < symbols.length; i += batchSize) {
                  const batch = symbols.slice(i, i + batchSize)
                  const results = await Promise.all(
                    batch.map(async symbol => {
                      const raw = await fetchHistoricalPrices(symbol, scenario.from, scenario.to)
                      if (raw.length > 0) return raw
                      const instrument = instrumentsBySymbol.get(symbol.toUpperCase()) || null
                      return instrument
                        ? fetchHistoricalPrices(symbol, scenario.from, scenario.to, false, instrument)
                        : raw
                    })
                  )
                  batch.forEach((symbol, index) => {
                    windowReturnBySymbol.set(
                      symbol,
                      windowReturnPct(toWindowEurSeries(symbol, results[index]), scenario.from, scenario.to)
                    )
                  })
                }

                const result = computeStressTest(
                  scenario,
                  weightBySymbol,
                  windowReturnBySymbol,
                  betaBySymbol,
                  marketReturn,
                  securitiesValueEur,
                )
                if (result) stressTests.push(result)
              }

              // --- Fama-French-Faktorregression ---
              // Die Faktoren sind USD-denominiert → Depot-Wealth in USD
              // umrechnen, sonst landet der EUR/USD-Effekt im Alpha.
              const wealthUsdSeries: QuantSeriesPoint[] = wealthSeries.map(p => ({
                date: p.date,
                value: p.value / getEURRateForDate(p.date),
              }))
              const factorRegression = computeFactorRegression(
                dailyReturnMap(wealthUsdSeries),
                factorFile.rows as FactorRow[],
              )

              quantAnalysis = { correlation, monteCarlo, stressTests, factorRegression }
            } catch (quantError) {
              console.error('Error computing quant analysis:', quantError)
            }
          }

          // 8c. Attribution: Woher kommt die Differenz zum FTSE All-World?
          // Das Schatten-Depot ist linear in den Flows, daher lässt sich der
          // Euro-Gap exakt auf Positionen und Gebühren verteilen. Nicht
          // zuordenbare Teile (z.B. Dividenden ohne passende Position,
          // Rundung, Preislücken) landen im Residual "Sonstiges" — die
          // Summe der Buckets ergibt immer den Gesamt-Gap.
          const headlineStats = benchmarkComparison.benchmarks.ftseAllWorld
          if (headlineStats && headlineStats.euroDiff !== null) {
            const benchPriceAt = (date: string) =>
              findPriceOnOrBefore(vtBenchmark, date) || findPriceOnOrAfter(vtBenchmark, date)
            const benchEndPrice = benchPriceAt(lastDate)

            if (benchEndPrice > 0) {
              // Gleiche Fenster-Flows wie der Headline-Vergleich (Startbestand
              // als synthetischer Kauf + Flows im Fenster) — sonst würde die
              // Attribution einen anderen Gap verteilen als oben angezeigt.
              const attributionTxsBySymbol = new Map<string, Transaction[]>()
              windowedBenchmarkTxs.forEach(tx => {
                if (!tx.symbol || tx.symbol === 'CASH') return
                if (!['buy', 'sell', 'transfer_in', 'transfer_out'].includes(tx.type)) return
                if (!attributionTxsBySymbol.has(tx.symbol)) attributionTxsBySymbol.set(tx.symbol, [])
                attributionTxsBySymbol.get(tx.symbol)!.push(tx)
              })

              const dividendsBySymbol = new Map<string, number>()
              if (useTransactions) {
                allTransactions.forEach(tx => {
                  if (tx.type !== 'dividend' || !tx.symbol || tx.symbol === 'CASH') return
                  if (tx.date <= firstPortfolioDate) return
                  if (!attributionTxsBySymbol.has(tx.symbol)) return
                  dividendsBySymbol.set(tx.symbol, (dividendsBySymbol.get(tx.symbol) || 0) + txValue(tx))
                })
              }

              const CRYPTO_SYMBOL = /^(BTC|ETH|SOL|ADA|XRP|DOGE|LTC|DOT|LINK|AVAX|BNB|MATIC)USD$/i

              let feeUnits = 0
              const positionDiffs: Array<{
                symbol: string
                euroDiff: number
                group: 'stocks' | 'etfs' | 'crypto'
              }> = []

              attributionTxsBySymbol.forEach((txs, symbol) => {
                let units = 0
                let shares = 0
                txs.forEach(tx => {
                  if (tx.date > lastDate) return
                  const p = benchPriceAt(tx.date)
                  if (!(p > 0)) return
                  if (tx.type === 'buy' || tx.type === 'transfer_in') {
                    units += txValue(tx) / p
                    shares += Number(tx.quantity) || 0
                  } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
                    units -= txValue(tx) / p
                    shares -= Number(tx.quantity) || 0
                  } else {
                    return
                  }
                  feeUnits += txFee(tx) / p
                })

                let actualValue = 0
                if (shares > 0.0001) {
                  const price = getPriceForDate(symbol, lastDate)
                  if (price) actualValue = shares * toEurPrice(symbol, price, lastDate)
                }

                const euroDiff =
                  actualValue + (dividendsBySymbol.get(symbol) || 0) - units * benchEndPrice
                const group = CRYPTO_SYMBOL.test(symbol)
                  ? ('crypto' as const)
                  : isETF(symbol)
                    ? ('etfs' as const)
                    : ('stocks' as const)
                positionDiffs.push({ symbol, euroDiff, group })
              })

              const feeCost = feeUnits * benchEndPrice
              const groupSum = (group: 'stocks' | 'etfs' | 'crypto') =>
                positionDiffs.filter(p => p.group === group).reduce((s, p) => s + p.euroDiff, 0)
              const stocksDiff = groupSum('stocks')
              const etfsDiff = groupSum('etfs')
              const cryptoDiff = groupSum('crypto')
              const residual = headlineStats.euroDiff - (stocksDiff + etfsDiff + cryptoDiff - feeCost)

              // p.a.-Anteile proportional zum Euro-Beitrag. Nur wenn das Gap
              // groß genug ist und die Buckets sich nicht gegenseitig aufheben —
              // sonst würden die anteiligen Prozentwerte absurd groß.
              const grossSum =
                Math.abs(stocksDiff) + Math.abs(etfsDiff) + Math.abs(cryptoDiff) + Math.abs(feeCost)
              const canSplitPa =
                headlineStats.diffPaPct !== null &&
                Math.abs(headlineStats.euroDiff) >= 250 &&
                grossSum <= Math.abs(headlineStats.euroDiff) * 3
              const paShare = (euro: number): number | null =>
                canSplitPa
                  ? round2(headlineStats.diffPaPct! * (euro / headlineStats.euroDiff!))
                  : null

              const buckets = [
                { key: 'stocks', label: 'Einzelaktien', euroDiff: stocksDiff },
                { key: 'etfs', label: 'ETFs', euroDiff: etfsDiff },
                { key: 'crypto', label: 'Krypto', euroDiff: cryptoDiff },
                { key: 'fees', label: 'Ordergebühren', euroDiff: -feeCost },
                { key: 'other', label: 'Sonstiges', euroDiff: residual },
              ]
                .filter(b => Math.abs(b.euroDiff) >= 10)
                .sort((a, b) => Math.abs(b.euroDiff) - Math.abs(a.euroDiff))
                .map(b => ({
                  key: b.key,
                  label: b.label,
                  euroDiff: Math.round(b.euroDiff),
                  paPct: paShare(b.euroDiff),
                }))

              const rankedPositions = [...positionDiffs].sort((a, b) => a.euroDiff - b.euroDiff)
              const worstPos = rankedPositions[0]
              const bestPos = rankedPositions[rankedPositions.length - 1]

              const cashDrag = useTransactions
                ? calculateCashDragVsBenchmark({
                    chartData,
                    transactions: twrTransactions,
                    cashPosition,
                    benchmarkPrices: vtBenchmark,
                  })
                : null

              benchmarkComparison.attribution = {
                benchmarkLabel: 'FTSE All-World',
                totalEuroDiff: headlineStats.euroDiff,
                totalDiffPaPct: headlineStats.diffPaPct,
                buckets,
                worst:
                  worstPos && worstPos.euroDiff <= -10
                    ? { symbol: worstPos.symbol, euroDiff: Math.round(worstPos.euroDiff) }
                    : null,
                best:
                  bestPos && bestPos.euroDiff >= 10
                    ? { symbol: bestPos.symbol, euroDiff: Math.round(bestPos.euroDiff) }
                    : null,
                cashDragEuro: cashDrag !== null ? Math.round(cashDrag) : null,
              }
            }
          }
        }
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
      benchmarkComparison, // Kennzahlen: Depot vs. Benchmarks (p.a.-Differenz + Euro-Betrag)
      // Risiko-Kennzahlen: nur Premium — sonst Locked-Flag fürs UI-Teaser
      riskMeasures,
      riskMeasuresLocked: !isPremiumUser ? true : undefined,
      // Quant-Analysen (nur wenn per quant:true angefragt): Korrelation,
      // Stresstests, Monte-Carlo, Faktorregression — Premium-only
      quant: quantAnalysis,
      quantLocked: quant && !isPremiumUser ? true : undefined,
      meta: {
        totalPoints: chartData.length,
        sampledPoints: sampledData.length,
        transactionsUsed: useTransactions,
        // 'deposits': Wert inkl. Cash vs. kumulierte Netto-Einzahlungen.
        // 'cost_basis': Wertpapierwert vs. Kostenbasis der Positionen.
        investedMode,
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
