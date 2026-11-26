// src/lib/portfolio/history.ts
//
// Wertentwicklung, zeitgewichtete Rendite, Benchmark-Vergleich, Risiko und
// Quant-Analysen eines Depots. Genutzt von /api/portfolio-history (Depotseite)
// und der Finclue AI, damit beide dieselben Zahlen nennen. Nur serverseitig.

import { createClient } from '@supabase/supabase-js'
import { resolvePriceSource, yahooFallbackSymbol } from '@/lib/etfMasterLookup'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'
import {
  calculatePortfolioTwrByDate,
  calculateBenchmarkComparison,
  calculateCashDragVsBenchmark,
  calculateDepositBasedSeries,
  flowAmount,
  isCorpActionTransfer,
} from '@/lib/portfolioTwr'
import { orderCosts } from '@/lib/portfolio/cashFlows'
import { settleSplitBookings, walkCostBasis, withoutInternalTransfers } from '@/lib/portfolio/costBasis'
import { isETF } from '@/lib/etfUtils'
import { computeRiskMeasures, annualizedReturnPct, type RiskMeasures } from '@/lib/portfolioRisk'
import { SAMPLE_DEPOT_BROKER_NAME, SAMPLE_DEPOT_NOTE_PREFIX } from '@/lib/sampleDepotShared'
import {
  computeCorrelationMatrix,
  computeStressTest,
  computeAssetBeta,
  computeWeeklyBeta,
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
import { fetchFmpJson, isOutage } from '@/lib/marketData/fmpRequest'
import { fetchYahooFx, isFxPair } from '@/lib/marketData/yahooFx'
import { missedSplitDivisors, yahooSplitEvents } from '@/lib/marketData/yahooSplits'
import type { Instrument } from '@/lib/marketData/types'
import factorFile from '@/data/factors/developed5FactorsDaily.json'
import { findLookthroughEntry } from '@/data/etfLookthrough'
import { downsampleLttb } from '@/lib/downsampleSeries'
import {
  applySpinoffCostSplit,
  completeSpinoffAdjustment,
  detectSpinoffEvents,
  findSpinoffPriceAdjustment,
  type SpinoffPriceAdjustment,
  type SplitEvent,
} from '@/lib/spinoffAdjustment'
import { appliedSplits, completeSplitAdjustment, formatSplitLabel } from '@/lib/splitAdjustment'

// Max. Punkte pro Chart-Reihe (~1 Handelsjahr in Tagesauflösung)
const CHART_MAX_POINTS = 260

interface HistoricalDataPoint {
  date: string
  close: number
}

export interface HoldingInput {
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
  name?: string | null
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

// Kurs-Währung je Börsen-Suffix. FMP/Yahoo liefern Kurse in der Heimatwährung
// des Listings (verifiziert u. a. NESN.SW in CHF, 8035.T in JPY) — ohne diese
// Zuordnung liefen alle Nicht-EUR/GBX-Titel als USD durch die Umrechnung.
// EUR-Suffixe deckt isEURTicker ab, London (Pence) isGBXTicker.
const SUFFIX_CURRENCY: Record<string, string> = {
  SW: 'CHF', T: 'JPY', TO: 'CAD', V: 'CAD', AX: 'AUD', HK: 'HKD',
  KS: 'KRW', KQ: 'KRW', TW: 'TWD', TWO: 'TWD', SS: 'CNY', SZ: 'CNY',
  SA: 'BRL', ST: 'SEK', OL: 'NOK', CO: 'DKK', NS: 'INR', BO: 'INR',
  JK: 'IDR', BK: 'THB', SI: 'SGD', NZ: 'NZD', WA: 'PLN', IS: 'TRY',
  MX: 'MXN', SR: 'SAR', QA: 'QAR', KW: 'KWD', JO: 'ZAR',
}

/** Notierungswährung laut Suffix, ohne Suffix USD. 'GBX' = Pence. */
function suffixCurrency(symbol: string): string {
  if (isEURTicker(symbol)) return 'EUR'
  if (isGBXTicker(symbol)) return 'GBX'
  const dot = symbol.lastIndexOf('.')
  if (dot < 0) return 'USD'
  return SUFFIX_CURRENCY[symbol.slice(dot + 1).toUpperCase()] || 'USD'
}

/**
 * Ab diesem Abstand zum Fensterende gilt eine Reihe als eingefroren (dieselbe Grenze
 * wie bei den Live-Kursen in quoteService). FMP führt umbenannte und eingestellte
 * Notierungen mit der alten Reihe weiter: SWF.DE endet am 22.01.2026 bei 83,73 €,
 * gehandelt wird das Papier als SWF.F. Ohne Prüfung galt der letzte Kurs bis heute.
 */
const FROZEN_SERIES_DAYS = 14

function endsEarly(points: HistoricalDataPoint[], toDate: string): boolean {
  const last = points[points.length - 1]
  return !!last && Date.parse(toDate) - Date.parse(last.date) > FROZEN_SERIES_DAYS * 86400000
}

/**
 * Eingefrorene Reihe durch eine frische ersetzen. null, wenn die neue nicht bis zum
 * Ende reicht oder am letzten gemeinsamen Tag mehr als 20 % daneben liegt: dann ist es
 * ein anderes Papier oder eine anders bereinigte Reihe. Davor liegende Tage bleiben.
 */
function replaceFrozen(
  frozen: HistoricalDataPoint[],
  fresh: HistoricalDataPoint[],
  toDate: string
): HistoricalDataPoint[] | null {
  if (fresh.length === 0 || endsEarly(fresh, toDate)) return null
  const last = frozen[frozen.length - 1]
  const overlap = fresh
    .filter(p => p.date <= last.date && Date.parse(last.date) - Date.parse(p.date) <= 10 * 86400000)
    .pop()
  if (!overlap || Math.abs(overlap.close / last.close - 1) > 0.2) return null
  return [...frozen.filter(p => p.date < fresh[0].date), ...fresh]
}

// Notfall-Näherungsraten (ccy→EUR), nur falls keine FX-Historie geladen werden
// konnte — gleiche Rolle wie GBP_EUR_APPROX. Die Größenordnung muss stimmen:
// vorher wurde in dem Fall der USD-Kurs angewandt (JPY-Titel ~150× daneben).
const FX_EUR_APPROX: Record<string, number> = {
  CHF: 1.06, JPY: 0.006, CAD: 0.66, AUD: 0.6, HKD: 0.11, KRW: 0.00063,
  TWD: 0.028, CNY: 0.12, BRL: 0.16, SEK: 0.088, NOK: 0.085, DKK: 0.134,
  INR: 0.01, IDR: 0.000055, THB: 0.026, SGD: 0.68, NZD: 0.55, PLN: 0.23,
  TRY: 0.021, MXN: 0.047, SAR: 0.24, QAR: 0.25, KWD: 2.9, ZAR: 0.049,
}

// In-memory cache für API-Responses (24h TTL)
const historyCache = new Map<string, { data: HistoricalDataPoint[], timestamp: number, ttl: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 Stunden
// War eine Quelle nur gestört (Zeitüberschreitung, Abruflimit, Serverfehler),
// gilt ein leeres oder ersatzweises Ergebnis nur kurz. Sonst rechnet der Verlauf
// einen Tag lang für alle Nutzer ohne dieses Papier oder ohne Wechselkurs.
const OUTAGE_TTL = 60 * 1000

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GBP→EUR Notfallrate, nur falls für einen Tag keine FX-Historie vorliegt
const GBP_EUR_APPROX = 1.17

/**
 * GBP→EUR je Handelstag, aufsteigend. Gemappte London-Notierungen
 * (EXCHANGE_FALLBACKS / etfMaster, z.B. HMWO.DE → HMWO.L) kommen in Pence
 * bzw. Pfund. Mit fester Rate trug ihre Wertlinie die GBP/EUR-Bewegung nicht
 * mit — Wert und TWR dieser Positionen lagen um die Wechselkursänderung daneben.
 */
async function loadGbpEurRates(fromDate: string, toDate: string): Promise<Array<[string, number]>> {
  const history = await fetchHistoricalPrices('EURGBP', fromDate, toDate)
  return history
    .filter(day => day.close > 0)
    .map(day => [day.date, 1 / day.close] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]))
}

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

  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY nicht konfiguriert')
  }

  // Preis-Quelle bestimmen: etfMaster hat Priorität
  const masterSource = resolvePriceSource(symbol)

  let historicalData: HistoricalDataPoint[] = []
  // Quelle gestört bzw. Pfundkurs nur mit der Notfallrate umgerechnet
  let outage = false
  let approximated = false

  // Helper: FMP Historical mit optionaler Währungs-Konvertierung
  const fetchFmpHistorical = async (fetchSymbol: string, exchange?: 'GBp' | 'GBP' | 'EUR') => {
    try {
      const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${fetchSymbol}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`
      const response = await fetchFmpJson(url)
      if (response.outage) outage = true
      if (response.data) {
        const data = response.data
        if (data.historical && Array.isArray(data.historical) && data.historical.length > 0) {
          const points: HistoricalDataPoint[] = data.historical
            .map((item: { date: string; close: number; adjClose?: number }) => ({
              date: item.date,
              close: adjusted && item.adjClose && item.adjClose > 0 ? item.adjClose : item.close,
            }))
            .reverse()
          if (exchange !== 'GBp' && exchange !== 'GBP') return points

          // Tageskurs des jeweiligen Handelstags (bzw. des letzten davor)
          const rates = await loadGbpEurRates(fromDate, toDate)
          if (rates.length === 0) approximated = true
          let rateIdx = 0
          let rate = rates[0]?.[1] ?? GBP_EUR_APPROX
          return points.map(point => {
            while (rateIdx < rates.length && rates[rateIdx][0] <= point.date) {
              rate = rates[rateIdx][1]
              rateIdx++
            }
            const pounds = exchange === 'GBp' ? point.close / 100 : point.close
            return { date: point.date, close: pounds * rate }
          })
        }
      }
    } catch {
      outage = true // weiter zu Fallbacks
    }
    return []
  }

  // Helper: Yahoo Finance Historical. Zeitraum ausdrücklich angeben: Mit
  // range=max liefert Yahoo Monatswerte, die am Monatsanfang stehen, aber den
  // Monatsschluss enthalten (Finanzkrise: −20 statt −38 % für den S&P 500).
  // Bis heute laden, damit auch Splits nach dem Fenster bekannt sind.
  const fetchYahooHistorical = async (yahooSymbol: string) => {
    try {
      const period1 = Math.floor(Date.parse(fromDate) / 1000) - 10 * 86400
      const period2 = Math.ceil(Date.now() / 86400000) * 86400
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d&region=DE&events=splits`
      const yahooRes = await fetch(yahooUrl, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      })
      if (isOutage(yahooRes.status)) outage = true
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json()
        const result = yahooData?.chart?.result?.[0]
        if (result?.timestamp?.length > 0) {
          const timestamps: number[] = result.timestamp
          const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || []
          const adjCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || []
          const closes = adjusted && adjCloses.length > 0 ? adjCloses : rawCloses
          // Über die ganze Reihe rechnen, nicht nur ab fromDate: Ein Split kurz
          // vor oder in dem Fenster braucht die Kurse auf beiden Seiten.
          const divisors = missedSplitDivisors(timestamps, closes, yahooSplitEvents(result))
          const fromTime = new Date(fromDate).getTime() / 1000
          const points: HistoricalDataPoint[] = []
          for (let i = 0; i < timestamps.length; i++) {
            const close = closes[i]
            if (close === null || close === undefined || close <= 0) continue
            if (timestamps[i] < fromTime) continue
            const d = new Date(timestamps[i] * 1000)
            points.push({ date: d.toISOString().split('T')[0], close: Math.round((close / divisors[i]) * 100) / 100 })
          }
          return points
        }
      }
    } catch {
      outage = true
    }
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
      historicalData = await fetchYahooHistorical(yahooFallbackSymbol(masterSource, symbol))
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

    // Versuch 3: Yahoo Finance. FMP führt alle Währungspaare, Yahoo wird für
    // sie nur gebraucht, wenn FMP gestört ist.
    if (historicalData.length === 0) {
      if (!isFxPair(symbol)) historicalData = await fetchYahooHistorical(symbol)
      else if (outage) historicalData = await fetchYahooFx(symbol, fromDate, toDate)
    }

  }

  // Versuch 4: Stammdaten. Broker-Ticker wie 'MUV2.EU' (Freedom24) oder
  // frisch gelernte US-Papiere kennt weder FMP noch Yahoo unter dem rohen
  // Symbol — die Notierung aus dem Instrument-Master schon. Ohne diesen
  // Schritt fielen solche Positionen still aus Wert- UND Investiert-Linie
  // (Dennis' Chart zeigte deshalb "weniger als die Hälfte"). Gilt auch für
  // Papiere aus etfMaster: BITF gibt es seit der Umbenennung nur noch als KEEL.
  const listings = [...new Set(
    [instrument?.yahooSymbol, yahooSymbolFromEodhd(instrument?.eodhdSymbol)]
      .filter((c): c is string => Boolean(c) && c !== symbol)
  )]
  if (historicalData.length === 0 && instrument) {
    for (const candidate of listings) {
      historicalData = await fetchYahooHistorical(candidate)
      if (historicalData.length > 0) break
    }
    if (historicalData.length === 0 && instrument.fmpSymbol && instrument.fmpSymbol !== symbol) {
      historicalData = await fetchFmpHistorical(instrument.fmpSymbol)
    }
  }

  // Eingefrorene Reihe: erst dasselbe Kürzel bei Yahoo, dann die Notierung aus den
  // Stammdaten, sofern sie in derselben Währung notiert. Sonst bleibt die alte Reihe.
  if (endsEarly(historicalData, toDate) && !isFxPair(symbol)) {
    const sameCurrency = instrument?.currency?.toUpperCase() === suffixCurrency(symbol)
    for (const candidate of [symbol, ...(sameCurrency ? listings : [])]) {
      const replaced = replaceFrozen(historicalData, await fetchYahooHistorical(candidate), toDate)
      if (replaced) {
        historicalData = replaced
        break
      }
    }
  }

  // Cache speichern (auch leere Ergebnisse → verhindert wiederholte Requests)
  const provisional =
    approximated || (outage && (historicalData.length === 0 || isFxPair(symbol) || endsEarly(historicalData, toDate)))
  historyCache.set(cacheKey, { data: historicalData, timestamp: Date.now(), ttl: provisional ? OUTAGE_TTL : CACHE_TTL })
  return historicalData
}

interface CorporateActionReference {
  /** Split-bereinigte Schlusskurse (Yahoo bereinigt Spin-offs durchgehend) */
  closes: Map<string, number>
  splits: SplitEvent[]
}

const corporateActionCache = new Map<string, { data: CorporateActionReference | null; timestamp: number; ttl: number }>()

/**
 * Split-Ereignisse und bereinigte Kurse eines Spin-off-Mutterpapiers von Yahoo.
 * Yahoo führt Spin-offs als Split mit krummem Verhältnis (SPGI 1057:1000 zum
 * 01.07.2026); FMP kennt diesen Eintrag nicht und hat die Historie nur zum
 * Teil bereinigt. Wird nur für erkannte Spin-off-Mütter geladen.
 */
async function fetchCorporateActionReference(
  yahooSymbol: string,
  fromDate: string,
  toDate: string
): Promise<CorporateActionReference | null> {
  const cacheKey = `${yahooSymbol}_${fromDate}_${toDate}`
  const cached = corporateActionCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cached.ttl) return cached.data

  let data: CorporateActionReference | null = null
  let outage = false
  try {
    const period1 = Math.floor(Date.parse(fromDate) / 1000)
    const period2 = Math.floor(Date.parse(toDate) / 1000) + 86400
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d&events=splits`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) })
    if (isOutage(res.status)) outage = true
    if (res.ok) {
      const result = (await res.json())?.chart?.result?.[0]
      if (result) {
        const toDay = (ts: number) => new Date(ts * 1000).toISOString().split('T')[0]
        const timestamps: number[] = result.timestamp || []
        const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []
        const events = yahooSplitEvents(result)
        const divisors = missedSplitDivisors(timestamps, closes, events)
        const closeMap = new Map<string, number>()
        timestamps.forEach((ts, i) => {
          const close = closes[i]
          if (close && close > 0) closeMap.set(toDay(ts), close / divisors[i])
        })
        const splits = events
          .map(s => ({ date: toDay(s.date), numerator: s.numerator, denominator: s.denominator }))
        data = { closes: closeMap, splits }
      }
    }
  } catch {
    outage = true // ohne Referenz bleibt die Kursreihe, wie sie ist
  }

  corporateActionCache.set(cacheKey, { data, timestamp: Date.now(), ttl: outage ? OUTAGE_TTL : CACHE_TTL })
  return data
}

export interface PortfolioHistoryInput {
  portfolioId?: string
  portfolioIds?: string[]
  holdings?: HoldingInput[]
  cashPosition?: number
  days?: number
  /** Quant-Analysen (Korrelation, Stresstests, Monte-Carlo, Faktoren) mitberechnen, Premium */
  quant?: boolean
}

export interface PortfolioHistoryResponse {
  status: number
  body: any
}

const reply = (body: any, init?: { status: number }): PortfolioHistoryResponse => ({ status: init?.status ?? 200, body })

/**
 * userId kommt aus dem geprüften Login, nie aus der Anfrage: Portfolios werden
 * darüber auf ihren Besitzer geprüft.
 */
export async function computePortfolioHistory(
  user: { id: string; isPremium: boolean },
  input: PortfolioHistoryInput
): Promise<PortfolioHistoryResponse> {
  try {
    const isPremiumUser = user.isPremium
    const { portfolioId, portfolioIds, cashPosition = 0, days = 30, quant = false } = input

    let holdings: HoldingInput[] = input.holdings ?? []
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return reply({ success: true, data: [] })
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
    let ownedPortfolios: Array<{ id: string; broker_name: string | null }> = []
    if (requestedIds.length > 0) {
      const { data } = await supabase
        .from('portfolios')
        .select('id, broker_name')
        .eq('user_id', user.id)
        .in('id', requestedIds)
      ownedPortfolios = data || []
      earlyValidIds = ownedPortfolios.map(p => p.id)
      if (earlyValidIds.length === 0) {
        return reply({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Beispieldepot: Risiko-Kennzahlen und Quant-Analysen auch ohne Premium
    // (öffentliche Musterdaten, Vorgeschmack auf Premium). Nur wenn
    // ausschließlich das unveränderte Beispieldepot angefragt ist: Kennzeichen
    // plus nur die Käufe und Dividenden, die /api/portfolio/sample angelegt hat. Ein eigenes
    // Depot mit gleichem Brokernamen bleibt damit gesperrt.
    let isUntouchedSampleDepot = false
    if (
      !isPremiumUser &&
      ownedPortfolios.length > 0 &&
      ownedPortfolios.every(p => p.broker_name === SAMPLE_DEPOT_BROKER_NAME)
    ) {
      const { data: sampleTx } = await supabase
        .from('portfolio_transactions')
        .select('type, notes')
        .in('portfolio_id', earlyValidIds)
      isUntouchedSampleDepot =
        !!sampleTx &&
        sampleTx.length > 0 &&
        sampleTx.every(
          tx =>
            (tx.type === 'buy' || tx.type === 'dividend') &&
            typeof tx.notes === 'string' &&
            tx.notes.startsWith(SAMPLE_DEPOT_NOTE_PREFIX),
        )
    }
    if (isUntouchedSampleDepot) {
      // Positionen aus der Datenbank statt aus der Anfrage: sonst ließen sich
      // mit der ID des Beispieldepots fremde Positionen analysieren
      const { data: sampleHoldings } = await supabase
        .from('portfolio_holdings')
        .select('portfolio_id, symbol, quantity, purchase_date, purchase_price')
        .in('portfolio_id', earlyValidIds)
      if (sampleHoldings && sampleHoldings.length > 0) {
        holdings = sampleHoldings as HoldingInput[]
      } else {
        isUntouchedSampleDepot = false
      }
    }
    const canUseProAnalytics = isPremiumUser || isUntouchedSampleDepot

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
          .select('portfolio_id, date, symbol, name, quantity, price, total_value, fee, type, notes')
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
        // Umzüge im selben Depot (Lagerstellenwechsel) zählen nicht: Die Position
        // gehört dem Nutzer durchgehend. Sonst bricht der Verlauf für die Tage
        // zwischen Aus- und Einbuchung ein (Scalable 05.12.2025: 50.000 → 15.000 €).
        // Vom Broker gebuchte Splits zählen rückwirkend: Die Kurse stehen auch vor
        // dem Split auf der neuen Stückzahl.
        allTransactions = withoutInternalTransfers(settleSplitBookings(transactions))

        const currentHoldingKeys = new Set<string>()
        holdings.forEach(h => {
          const symbol = h.symbol?.toUpperCase()
          if (!symbol) return
          currentHoldingKeys.add(symbol)
          if (h.portfolio_id) currentHoldingKeys.add(`${h.portfolio_id}|${symbol}`)
          else if (validIds.length === 1) currentHoldingKeys.add(`${validIds[0]}|${symbol}`)
        })

        const groupedSecurityTxs = new Map<string, Transaction[]>()
        allTransactions.forEach((tx: Transaction) => {
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
          if (raw.length > 0 && !endsEarly(raw, toDate)) return raw
          // Rohe Kette leer oder eingefroren → Stammdaten-Notierung versuchen;
          // unbekannte Symbole einmalig über die FMP-Suche lernen (persistiert).
          let instrument = instrumentsBySymbol.get(symbol.toUpperCase()) || null
          if (!instrument && raw.length === 0) {
            instrument = await resolveSymbolViaSearch(symbol).catch(() => null)
          }
          if (!instrument) return raw
          const viaInstrument = await fetchHistoricalPrices(symbol, fromDate, toDate, false, instrument)
          // Eine eingefrorene Reihe wird nur in ihrer eigenen Währung ersetzt
          if (raw.length === 0 && viaInstrument.length > 0 && instrument.currency) {
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

    // 1b. Kurs unmittelbar vor dem Fenster nachladen, wenn ein schon gehaltenes
    // Papier am ersten Chart-Tag keinen hat. Beginnt das Fenster an einem Tag,
    // an dem nur manche Börsen offen waren (31.12.: USA ja, Xetra nein), fehlten
    // diese Positionen sonst am ersten Tag und tauchten am nächsten als
    // Schein-Gewinn auf (+278 % "seit Jahresanfang").
    const firstLoadedDate = [...pricesBySymbol.values()]
      .flatMap(prices => [...prices.keys()])
      .reduce<string | null>((min, date) => (min === null || date < min ? date : min), null)
    if (firstLoadedDate) {
      const heldAtStart = new Set<string>()
      if (useTransactions) {
        transactionsBySymbol.forEach((txs, symbol) => {
          const shares = txs.reduce((sum, tx) => {
            if (tx.date > firstLoadedDate) return sum
            return tx.type === 'buy' || tx.type === 'transfer_in' ? sum + Number(tx.quantity) : sum - Number(tx.quantity)
          }, 0)
          if (shares > 0.0001) heldAtStart.add(symbol)
        })
      } else {
        holdings.forEach(h => {
          if (!h.purchase_date || h.purchase_date <= firstLoadedDate) heldAtStart.add(h.symbol)
        })
      }
      const bufferFrom = new Date(Date.parse(firstLoadedDate) - 10 * 86400000).toISOString().split('T')[0]
      const bufferTo = new Date(Date.parse(firstLoadedDate) - 86400000).toISOString().split('T')[0]
      const needsCarry = [...heldAtStart].filter(symbol => {
        const prices = pricesBySymbol.get(symbol)
        return !!prices && prices.size > 0 && !prices.has(firstLoadedDate)
      })
      for (let i = 0; i < needsCarry.length; i += batchSize) {
        await Promise.all(needsCarry.slice(i, i + batchSize).map(async symbol => {
          const viaInstrument = priceCurrencyBySymbol.has(symbol) ? instrumentsBySymbol.get(symbol.toUpperCase()) ?? null : null
          const before = await fetchHistoricalPrices(symbol, bufferFrom, bufferTo, false, viaInstrument)
          // Die Ausweichquelle liefert auch Tage im Fenster mit
          const last = before
            .filter(day => day.close > 0 && day.date < firstLoadedDate && day.date >= bufferFrom)
            .sort((x, y) => x.date.localeCompare(y.date))
            .pop()
          if (last) pricesBySymbol.get(symbol)!.set(last.date, last.close)
        }))
      }
    }

    // 2a-1. Umgerechnete Buchungen (Split, ISIN-Umstellung) brauchen eine
    // durchgehend bereinigte Kurshistorie. FMP liefert sie nicht immer: ULVR.L
    // ist nach der Zusammenlegung 8:9 nur bis zum 12.11.2025 zurück bereinigt,
    // die Position spränge an dem Tag um 12,5 %.
    const splitsBySymbol = new Map<string, Map<string, number>>()
    securityTransactions.forEach(tx => {
      appliedSplits(tx.notes).forEach(({ date, ratio }) => {
        if (date <= fromDate) return
        if (!splitsBySymbol.has(tx.symbol)) splitsBySymbol.set(tx.symbol, new Map())
        splitsBySymbol.get(tx.symbol)!.set(date, ratio)
      })
    })
    await Promise.all([...splitsBySymbol].map(async ([symbol, splits]) => {
      const prices = pricesBySymbol.get(symbol)
      if (!prices || prices.size === 0) return
      const yahooSymbol = instrumentsBySymbol.get(symbol.toUpperCase())?.yahooSymbol || symbol
      const reference = await fetchCorporateActionReference(yahooSymbol, fromDate, toDate)
      if (!reference) return
      // Der jüngste Split zuerst: Er legt den Stand fest, an dem sich der ältere misst
      for (const [date, ratio] of [...splits].sort((a, b) => b[0].localeCompare(a[0]))) {
        const repaired = completeSplitAdjustment(prices, reference.closes, { date, ratio })
        if (repaired > 0) {
          console.log(`📊 ${symbol}: Split-Bereinigung (${formatSplitLabel(ratio)} vom ${date}) an ${repaired} Tagen nachgezogen`)
        }
      }
    }))

    // 2a-2. Spin-off-Mütter: Die TWR rechnet bei Spin-offs mit bereinigten
    // Mutter-Kursen und aufgeteilter Kostenbasis (SPIN-OFF-HINWEIS in
    // portfolioTwr.ts). FMP bereinigt aber nicht immer die ganze Historie —
    // SPGI ist nur vom 02.06. bis 30.06.2026 bereinigt, davor nicht, was am
    // 02.06. einen Schein-Absturz von −7,9 % erzeugte. Hier wird die Reihe
    // gegen Yahoo (durchgehend bereinigt) vervollständigt. Die gefundene
    // Bereinigung je Spin-off braucht die Kostenaufteilung weiter unten.
    const spinoffEvents = useTransactions ? detectSpinoffEvents(securityTransactions) : []
    const spinoffKey = (parentSymbol: string, date: string) => `${parentSymbol}|${date}`
    const spinoffAdjustments = new Map<string, SpinoffPriceAdjustment | null>()
    const shiftDays = (date: string, days: number) =>
      new Date(Date.parse(date) + days * 86400000).toISOString().split('T')[0]
    const spinoffParents = [...new Set(spinoffEvents.map(e => e.parentSymbol))]
      .filter(symbol => (pricesBySymbol.get(symbol)?.size || 0) > 0)
    await Promise.all(spinoffParents.map(async parent => {
      const events = spinoffEvents.filter(e => e.parentSymbol === parent)
      const bookingDates = events.map(e => e.date).sort()
      const referenceFrom = [fromDate, shiftDays(bookingDates[0], -40)].sort()[0]
      const referenceTo = [toDate, shiftDays(bookingDates[bookingDates.length - 1], 15)].sort()[0]
      const yahooSymbol = instrumentsBySymbol.get(parent.toUpperCase())?.yahooSymbol || parent
      const reference = await fetchCorporateActionReference(yahooSymbol, referenceFrom, referenceTo)
      const prices = pricesBySymbol.get(parent)!
      for (const event of events) {
        const key = spinoffKey(parent, event.date)
        if (spinoffAdjustments.has(key)) continue
        const adjustment = reference ? findSpinoffPriceAdjustment(reference.splits, event.date) : null
        spinoffAdjustments.set(key, adjustment)
        if (!reference || !adjustment) continue
        const repaired = completeSpinoffAdjustment(prices, reference.closes, adjustment)
        if (repaired > 0) {
          console.log(`📊 ${parent}: Spin-off-Bereinigung (Faktor ${adjustment.factor.toFixed(4)}, Ex-Tag ${adjustment.exDate}) an ${repaired} Tagen nachgezogen`)
        }
      }
    }))

    // Notierungswährung je Symbol: Instrument-Währung (Fallback-Lader) hat
    // Vorrang vor der Suffix-Heuristik; ohne Suffix gilt USD.
    const quoteCurrency = (symbol: string): string => {
      const instrumentCurrency = priceCurrencyBySymbol.get(symbol)
      return instrumentCurrency || suffixCurrency(symbol)
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
              // GBP→EUR = GBPUSD / EURUSD, bei Lücken der letzte Kurs davor. Kommt
              // nur eines der Paare von Yahoo, decken sich die Tage nicht.
              const eurUsd = eurUsdRateByDate.size > 0
                ? 1 / getRateForDate(eurUsdRateByDate, day.date, 0.92) // eurUsdRateByDate hat USD→EUR, invertieren
                : getRateForDate(eurUsdMap, day.date, 1.08)
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

    // 2c. FX-Historien für alle weiteren Notierungswährungen (CHF, JPY, CAD, …).
    // FMP führt Paare mal als CCYEUR, mal nur als EURCCY — beide Richtungen
    // versuchen, invertiert übernehmen.
    const extraCurrencies = [...new Set(uniqueSymbols.map(quoteCurrency))]
      .filter(c => !['EUR', 'USD', 'GBP', 'GBX'].includes(c))
    const fxEurRateByCurrency = new Map<string, Map<string, number>>()
    extraCurrencies.forEach(ccy => {
      const rateMap = new Map<string, number>()
      fxEurRateByCurrency.set(ccy, rateMap)
      fxPromises.push((async () => {
        try {
          const direct = await fetchHistoricalPrices(`${ccy}EUR`, fromDate, toDate)
          if (direct.length > 0) {
            direct.forEach(day => { if (day.close > 0) rateMap.set(day.date, day.close) })
          } else {
            const inverse = await fetchHistoricalPrices(`EUR${ccy}`, fromDate, toDate)
            inverse.forEach(day => { if (day.close > 0) rateMap.set(day.date, 1 / day.close) })
          }
          console.log(`💱 ${ccy}/EUR history: ${rateMap.size} data points`)
        } catch (e) {
          console.error(`Error loading ${ccy}/EUR history:`, e)
        }
      })())
    })

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
    // Kurse und Buchungen vor dem Fenster (1b) ergeben keinen Chart-Punkt
    const chartStart = firstLoadedDate ?? fromDate
    const sortedDates = Array.from(allDates).filter(date => date >= chartStart).sort()

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

    // Börsenkurs → EUR anhand der Notierungswährung (quoteCurrency: Instrument-
    // Währung vor Suffix-Heuristik — Pseudo-Ticker wie 'MUV2.EU' kämen sonst
    // fälschlich als USD daher). CHF/JPY/CAD & Co. laufen über die in 2c
    // geladenen FX-Historien; ohne Daten greift die Näherungsrate, und erst
    // als letztes das alte USD-Verhalten.
    function toEurPrice(symbol: string, price: number, date: string): number {
      const ccy = quoteCurrency(symbol)
      if (ccy === 'EUR') return price
      if (ccy === 'GBX') return (price / 100) * getGBPEURRateForDate(date)
      if (ccy === 'GBP') return price * getGBPEURRateForDate(date)
      if (ccy === 'USD') return price * getEURRateForDate(date)
      const rateMap = fxEurRateByCurrency.get(ccy)
      if (rateMap && rateMap.size > 0) {
        return price * getRateForDate(rateMap, date, FX_EUR_APPROX[ccy] ?? 1)
      }
      const approx = FX_EUR_APPROX[ccy]
      if (approx) return price * approx
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

    // 3b. Spin-offs, deren Import die Mutter nicht kannte (Trading 212, Trade
    // Republic): Kostenaufteilung im Speicher nachholen, passend zur
    // Mutter-Historie aus 2a-2. Ohne bekannte Bereinigung (Kellanova/WK Kellogg
    // 2023: FMP unbereinigt, echter Kursabschlag am Ex-Tag) bringt die Tochter
    // keine eigene Kostenbasis mit — sonst zählte sie in der TWR als frisches
    // Geld. Läuft nach der Marktwert-Schätzung, die sonst der Tochter wieder
    // ihren Marktwert gäbe.
    let spinoffSplitCount = 0
    spinoffEvents.forEach(event => {
      if (event.costSplit) return
      // Steht die Mutter nicht im Chart (keine Kurse), fehlt ihr Wert ohnehin —
      // dann gleicht die Tochter-Einbuchung als Zufluss genau das aus.
      if (!getPriceForDate(event.parentSymbol, shiftDays(event.date, -1))) return
      const adjustment = spinoffAdjustments.get(spinoffKey(event.parentSymbol, event.date)) ?? null
      applySpinoffCostSplit({
        event,
        parentTxs: securityTransactions.filter(
          tx => (tx.portfolio_id || '') === event.portfolioId && tx.symbol === event.parentSymbol
        ),
        fraction: adjustment ? 1 - 1 / adjustment.factor : 0,
        exDate: adjustment?.exDate ?? event.date,
      })
      spinoffSplitCount++
    })
    if (spinoffSplitCount > 0) {
      console.log(`📊 Spin-off cost split applied in memory for ${spinoffSplitCount} spin-off(s) without parent reference`)
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

    // Einstand nach jeder Buchung, je Symbol in zeitlicher Reihenfolge
    const costStepsBySymbol = new Map<string, Array<{ date: string; key: string; cost: number }>>()
    walkCostBasis(securityTransactions, ({ tx, key, totalCost }) => {
      if (!costStepsBySymbol.has(tx.symbol)) costStepsBySymbol.set(tx.symbol, [])
      costStepsBySymbol.get(tx.symbol)!.push({ date: tx.date, key, cost: totalCost })
    })

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

          // Bestand bis zu diesem Tag
          let sharesOwned = 0
          txs.forEach(tx => {
            if (tx.date > date) return
            if (tx.type === 'buy' || tx.type === 'transfer_in') sharesOwned += tx.quantity
            else if (tx.type === 'sell' || tx.type === 'transfer_out') sharesOwned -= tx.quantity
          })

          // Einstand (was der User bezahlt hat) nach der gemeinsamen Regel, je
          // Depot getrennt: In "Alle Depots" steht dasselbe Symbol aus mehreren
          // Depots, ein Verkauf in Depot B darf Depot A nicht verändern.
          const costByDepot = new Map<string, number>()
          for (const step of costStepsBySymbol.get(symbol) || []) {
            if (step.date > date) break
            costByDepot.set(step.key, step.cost)
          }
          let costBasis = 0 // In EUR
          costByDepot.forEach(cost => { costBasis += cost })

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
      const first = Array.from(priceMap.keys()).filter(date => date >= chartStart).sort()[0]
      if (first) firstPriceDateBySymbol.set(symbol, first)
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
    //
    // Fürs Cash-Konto zählen auch Buchungen von Papieren ohne Kurs im Fenster:
    // Beim 1-Jahres-Verlauf fielen sonst alle Käufe davor heraus, das Konto ging
    // nicht auf, und die Kurve zeigte nur die Wertpapiere (106.006 € statt 69.998 €
    // bei einem Depot mit Kredit). Wird ein Papier im Fenster gehalten, ohne dass
    // es für die Zeit Kurse gibt (umgestellt, übernommen), steht es zum Einstand
    // in der Kurve. Draußen bleiben nur Papiere ohne Kurs, die noch im Depot
    // liegen: Ihr Wert fehlt auch im aktuellen Depotwert.
    const valuedAtCost = new Set<string>()
    const unpricedOpen = new Set<string>()
    transactionsBySymbol.forEach((txs, symbol) => {
      let shares = 0
      let heldFrom: string | null = null
      for (const tx of txs) {
        shares += tx.type === 'buy' || tx.type === 'transfer_in' ? Number(tx.quantity) : -Number(tx.quantity)
        if (heldFrom === null && shares > 0.0001 && tx.date >= chartStart) heldFrom = tx.date
        if (tx.date < chartStart) heldFrom = shares > 0.0001 ? chartStart : null
      }
      if (heldFrom === null || hasPriceData(symbol, heldFrom)) return
      if (shares > 0.0001) unpricedOpen.add(symbol)
      else valuedAtCost.add(symbol)
    })
    const costWithoutPrice = (date: string): number => {
      let total = 0
      valuedAtCost.forEach(symbol => {
        if (getPriceForDate(symbol, date)) return
        const costByDepot = new Map<string, number>()
        for (const step of costStepsBySymbol.get(symbol) || []) {
          if (step.date > date) break
          costByDepot.set(step.key, step.cost)
        }
        costByDepot.forEach(cost => { total += cost })
      })
      return total
    }
    const ledgerTransactions = [
      ...securityTransactions.filter(tx => !unpricedOpen.has(tx.symbol)),
      ...allTransactions.filter(tx => !['buy', 'sell', 'transfer_in', 'transfer_out'].includes(tx.type)),
    ]
    const fullLedgerSeries = useTransactions
      ? calculateDepositBasedSeries({ chartData, transactions: ledgerTransactions, cashPosition })
      : null
    // Geht das vollständige Konto nicht auf, zählen nur Buchungen bewertbarer Papiere
    const depositSeries = fullLedgerSeries ?? (useTransactions
      ? calculateDepositBasedSeries({ chartData, transactions: twrTransactions, cashPosition })
      : null)
    const investedMode: 'deposits' | 'cost_basis' = depositSeries ? 'deposits' : 'cost_basis'
    // Warum keine echten Einzahlungen? 'missing' = keine Ein-/Auszahlungen
    // erfasst, 'mismatch' = vorhanden, aber passen nicht zum Cash-Bestand.
    // Das UI zeigt "Eingezahlt" dann als Schätzung mit Import-Hinweis.
    const cashLedger: 'ok' | 'missing' | 'mismatch' | undefined = depositSeries
      ? 'ok'
      : !useTransactions
        ? undefined
        : twrTransactions.some(tx => tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal')
          ? 'mismatch'
          : 'missing'

    // 6c. Eingezahltes Kapital je Datum — die zweite Kapital-Linie neben der
    // Kostenbasis. Mit plausiblem Cash-Ledger sind das die echten Netto-
    // Einzahlungen; ohne Ledger die Näherung Käufe − Verkaufserlöse −
    // Dividenden ± Depotüberträge (reinvestierte Erlöse zählen so nicht
    // doppelt). Nutzer-Wunsch: "nur die Einzahlungen, ohne das Reinvestieren".
    const contributedByDate = new Map<string, number>()
    if (depositSeries) {
      depositSeries.investedByDate.forEach((v, date) => contributedByDate.set(date, v))
    } else if (useTransactions) {
      // WICHTIG: nicht twrTransactions nehmen — deren hasPriceData-Filter
      // basiert auf den Kursen des geladenen Fensters und würfe alle Flows
      // VOR dem Fenster raus (contributed startete dann fälschlich bei 0).
      // securityTransactions sind bereits orphan-gefiltert.
      const contributionTxs = [
        ...securityTransactions,
        ...allTransactions.filter(tx => tx.type === 'dividend'),
      ]
      const flowByDate = new Map<string, number>()
      for (const tx of contributionTxs) {
        // Gleiches Flussmodell wie TWR und Benchmark: Corporate Actions führen
        // kein Kapital zu, Käufe zählen mit dem vollen Kaufpreis.
        if (isCorpActionTransfer(tx)) continue
        const amount = flowAmount(tx)
        if (amount <= 0) continue
        let flow = 0
        if (tx.type === 'buy') flow = amount + txFee(tx)
        // Netto-Erlös: die Verkaufsgebühr bleibt nicht als Cash übrig
        else if (tx.type === 'sell') flow = -(amount - txFee(tx))
        else if (tx.type === 'dividend') flow = -amount
        else if (tx.type === 'transfer_in') flow = amount
        else if (tx.type === 'transfer_out') flow = -amount
        if (flow !== 0) flowByDate.set(tx.date, (flowByDate.get(tx.date) || 0) + flow)
      }
      // Auf Chart-Daten kumulieren (Merge-Walk): Flows an Tagen ohne
      // Chart-Punkt (Wochenende) landen im nächsten Punkt, Flows vor dem
      // ersten Chart-Punkt zählen als Startkapital mit.
      const flowEntries = [...flowByDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      let running = 0
      let flowIdx = 0
      for (const point of chartData) {
        while (flowIdx < flowEntries.length && flowEntries[flowIdx][0] <= point.date) {
          running += flowEntries[flowIdx][1]
          flowIdx++
        }
        contributedByDate.set(point.date, Math.max(0, Math.round(running * 100) / 100))
      }
    }

    const displayChartData = chartData.map(point => {
      const costBasis = point.invested
      const contributed = contributedByDate.size > 0
        ? Math.round((contributedByDate.get(point.date) ?? costBasis) * 100) / 100
        : costBasis
      if (!depositSeries) {
        return { ...point, costBasis, contributed }
      }
      const value = Math.round(((depositSeries.valueByDate.get(point.date) ?? point.value) + (fullLedgerSeries ? costWithoutPrice(point.date) : 0)) * 100) / 100
      const invested = Math.round((depositSeries.investedByDate.get(point.date) ?? point.invested) * 100) / 100
      const performance = invested > 0
        ? Math.round(((value - invested) / invested) * 10000) / 100
        : 0
      return { date: point.date, value, invested, performance, costBasis, contributed }
    })

    // Datenpunkte für den Chart reduzieren: bis ~1 Jahr volle Tagesauflösung,
    // darüber LTTB, damit Hochs/Tiefs erhalten bleiben
    const sampledData = downsampleLttb(displayChartData, CHART_MAX_POINTS, p => p.value)

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
      // Vergleichsindizes aus derselben Handelszeit wie das Depot: überwiegend
      // Xetra-Papiere gegen die Xetra-ETFs, sonst die US-ETFs. Gemischt schließt
      // die eine Seite viereinhalb Stunden später; ein Welt-ETF auf Xetra hatte
      // gegen den VT in New York ein Tages-Beta von 0,55 statt rund 1.
      const costOf = (h: HoldingInput) => (h.purchase_price || 0) * h.quantity
      const totalCost = holdings.reduce((sum, h) => sum + costOf(h), 0)
      const eurListedCost = holdings.reduce((sum, h) => (isEURTicker(h.symbol) ? sum + costOf(h) : sum), 0)
      const preferXetra = totalCost > 0 && eurListedCost / totalCost >= 0.5
      const loadBenchmarks = (symbols: readonly string[]) =>
        Promise.all(symbols.map(symbol => fetchHistoricalPrices(symbol, fromDate, toDate, true)))
      const coversWindow = (history: HistoricalDataPoint[]) => {
        const first = history.reduce<string | null>((min, d) => (min === null || d.date < min ? d.date : min), null)
        return first !== null && Date.parse(first) <= Date.parse(fromDate) + 10 * 86400000
      }
      let benchmarksInEur = false
      let benchmarkHistories: HistoricalDataPoint[][] = []
      if (preferXetra) {
        // S&P 500, MSCI World, FTSE All-World, alle thesaurierend in Euro
        benchmarkHistories = await loadBenchmarks(['SXR8.DE', 'EUNL.DE', 'VWCE.DE'])
        benchmarksInEur = benchmarkHistories.every(coversWindow)
      }
      if (!benchmarksInEur) benchmarkHistories = await loadBenchmarks(['SPY', 'URTH', 'VT'])
      const [spyHistory, urthHistory, vtHistory] = benchmarkHistories

      if (spyHistory.length > 0 && chartData.length > 0) {
        const firstPortfolioDate = chartData[0].date

        // Benchmarks in EUR umrechnen: das Depot wird in EUR bewertet, also
        // muss die Benchmark denselben Währungseffekt tragen (unhedged Sicht
        // eines EUR-Anlegers). Kurse sind bereits dividendenbereinigt (adjClose).
        const normalizeBenchmarkHistory = (history: HistoricalDataPoint[]) =>
          [...history]
            .filter(d => d.close > 0)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ date: d.date, close: benchmarksInEur ? d.close : d.close * getEURRateForDate(d.date) }))

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
          if (canUseProAnalytics) {
            const portfolioWealth = chartData.map(point => ({
              date: point.date,
              value: 1 + (twrByDate.get(point.date) || 0) / 100,
            }))
            // Benchmark-Serien aufs Depot-Fenster clippen: fromDate liegt bis
            // zu 7 Tage VOR dem ersten Chart-Tag (Ladepuffer). Ungeclippt
            // enthielte die Benchmark-Spalte Handelstage, die das Depot nie
            // erlebt hat — bei Sub-Jahres-Fenstern kippte dadurch das
            // p.a.-Ranking der Tabelle gegen die (fensterkonforme)
            // Benchmark-Headline.
            const clipToChart = (series: Array<{ date: string; close: number }>) =>
              series
                .filter(p => p.date >= firstPortfolioDate)
                .map(p => ({ date: p.date, value: p.close }))
            const vtSeries = clipToChart(vtBenchmark)

            const xeonHistory = await fetchHistoricalPrices('XEON.DE', fromDate, toDate)
            const riskFreePct = annualizedReturnPct(
              xeonHistory.map(p => ({ date: p.date, value: p.close })),
            )

            riskMeasures = {
              riskFreePct: riskFreePct !== null ? round2(riskFreePct) : null,
              portfolio: computeRiskMeasures(portfolioWealth, riskFreePct, vtSeries),
              ftseAllWorld: computeRiskMeasures(vtSeries, riskFreePct),
              sp500: computeRiskMeasures(clipToChart(spyBenchmark), riskFreePct),
              msciWorld: computeRiskMeasures(clipToChart(urthBenchmark), riskFreePct),
            }
          }

          // 8b3. Quant-Analysen (Premium, nur auf Anfrage — der Analyse-Tab
          // setzt quant:true, der Dashboard-Chart nicht): Korrelationsmatrix,
          // Stresstests, Monte-Carlo-Projektion, Fama-French-Faktorregression.
          if (quant && canUseProAnalytics) {
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
                betaBySymbol.set(
                  symbol,
                  series ? computeWeeklyBeta(series, spyEurSeries) ?? computeAssetBeta(series, spyEurSeries) : null
                )
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
                // Ohne Dollarkurs von damals keine Aussage: In Dollar gerechnet
                // stand der Zinsschock 2022 bei −24,4 statt −14,7 %.
                if (fxWindowMap.size === 0) continue

                // Fenster-FX je Notierungswährung — die Krisen-Wechselkurse von
                // damals (2008: GBP −20 % ggü. EUR), nicht die heutigen. Ohne
                // Daten fürs Fenster zählt die Position wie eine ohne Kurse
                // (Zwillingsfonds, sonst Beta).
                const windowCurrencies = new Set<string>()
                weightBySymbol.forEach((_, symbol) => windowCurrencies.add(quoteCurrency(symbol)))
                const windowFxByCurrency = new Map<string, Map<string, number>>()
                await Promise.all(
                  [...windowCurrencies]
                    .filter(c => c !== 'EUR' && c !== 'USD' && c !== 'GBX')
                    .concat(windowCurrencies.has('GBX') ? ['GBP'] : [])
                    .map(async rawCcy => {
                      const ccy = rawCcy === 'GBX' ? 'GBP' : rawCcy
                      if (windowFxByCurrency.has(ccy)) return
                      const rateMap = new Map<string, number>()
                      windowFxByCurrency.set(ccy, rateMap)
                      try {
                        if (ccy === 'GBP') {
                          // GBP→EUR über Kreuzrate GBPUSD × (USD→EUR), wie im Haupt-Loader
                          const gbpUsd = await fetchHistoricalPrices('GBPUSD', scenario.from, scenario.to)
                          gbpUsd.forEach(day => {
                            const usdToEur = fxWindowMap.get(day.date)
                            if (day.close > 0 && usdToEur) rateMap.set(day.date, day.close * usdToEur)
                          })
                        } else {
                          const direct = await fetchHistoricalPrices(`${ccy}EUR`, scenario.from, scenario.to)
                          if (direct.length > 0) {
                            direct.forEach(day => { if (day.close > 0) rateMap.set(day.date, day.close) })
                          } else {
                            const inverse = await fetchHistoricalPrices(`EUR${ccy}`, scenario.from, scenario.to)
                            inverse.forEach(day => { if (day.close > 0) rateMap.set(day.date, 1 / day.close) })
                          }
                        }
                      } catch { /* Fenster ohne FX */ }
                    })
                )

                const toWindowEurSeries = (symbol: string, history: HistoricalDataPoint[]): QuantSeriesPoint[] => {
                  const ccy = quoteCurrency(symbol)
                  const rateMap = ccy === 'USD'
                    ? fxWindowMap
                    : windowFxByCurrency.get(ccy === 'GBX' ? 'GBP' : ccy)
                  if (ccy !== 'EUR' && !(rateMap && rateMap.size > 0)) return []
                  return history
                    .filter(d => d.close > 0)
                    .map(d => ({
                      date: d.date,
                      // GBX: ÷100 kürzt sich in der Rendite — Rohkurs × GBP-Rate reicht.
                      value: ccy === 'EUR' ? d.close : d.close * getRateForDate(rateMap!, d.date, 1),
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

                // Aktien-ETFs ohne damalige Kurse: echte Rendite des Zwillingsfonds
                // aus der Look-Through-Tabelle, sonst der Weltmarkt (VT). Eine
                // Beta-Näherung würde den Verlust breiter ETFs stark unterschätzen.
                const proxyReturnBySymbol = new Map<string, number>()
                const proxyCache = new Map<string, Promise<number | null>>()
                const proxyReturn = (proxy: string): Promise<number | null> => {
                  let pending = proxyCache.get(proxy)
                  if (!pending) {
                    pending = fetchHistoricalPrices(proxy, scenario.from, scenario.to, true)
                      .then(prices => windowReturnPct(toWindowEurSeries(proxy, prices), scenario.from, scenario.to))
                      .catch(() => null)
                    proxyCache.set(proxy, pending)
                  }
                  return pending
                }
                await Promise.all(symbols.map(async symbol => {
                  if (windowReturnBySymbol.get(symbol) != null) return
                  const entry = findLookthroughEntry(instrumentsBySymbol.get(symbol.toUpperCase())?.isin ?? null, symbol)
                  if (!entry || entry.assetClass !== 'equity') return
                  const parts = await Promise.all((entry.proxies ?? []).map(async p => ({ weight: p.weight, value: await proxyReturn(p.symbol) })))
                  const known = parts.filter((p): p is { weight: number; value: number } => p.value !== null)
                  const weight = known.reduce((sum, p) => sum + p.weight, 0)
                  const value = weight >= 0.5
                    ? known.reduce((sum, p) => sum + p.weight * p.value, 0) / weight
                    : await proxyReturn('VT')
                  if (value !== null) proxyReturnBySymbol.set(symbol, value)
                }))

                const result = computeStressTest(
                  scenario,
                  weightBySymbol,
                  windowReturnBySymbol,
                  betaBySymbol,
                  marketReturn,
                  securitiesValueEur,
                  proxyReturnBySymbol,
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
          // Euro-Gap exakt auf Positionen, Gebühren und Steuern verteilen. Nicht
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
              let taxUnits = 0
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
                  // Wie im Headline-Vergleich: Eine Corporate Action kauft keine
                  // Benchmark-Anteile, die Stücke zählen aber für den Endwert —
                  // sonst stünde die Spin-off-Tochter mit Wert 0 in der Liste.
                  const benchmarkUnits = isCorpActionTransfer(tx) ? 0 : flowAmount(tx) / p
                  if (tx.type === 'buy' || tx.type === 'transfer_in') {
                    units += benchmarkUnits
                    shares += Number(tx.quantity) || 0
                  } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
                    units -= benchmarkUnits
                    shares -= Number(tx.quantity) || 0
                  } else {
                    return
                  }
                  const costs = orderCosts(tx)
                  feeUnits += costs.fee / p
                  taxUnits += costs.tax / p
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
              const taxCost = taxUnits * benchEndPrice
              const groupSum = (group: 'stocks' | 'etfs' | 'crypto') =>
                positionDiffs.filter(p => p.group === group).reduce((s, p) => s + p.euroDiff, 0)
              const stocksDiff = groupSum('stocks')
              const etfsDiff = groupSum('etfs')
              const cryptoDiff = groupSum('crypto')
              const residual = headlineStats.euroDiff - (stocksDiff + etfsDiff + cryptoDiff - feeCost - taxCost)

              // p.a.-Anteile proportional zum Euro-Beitrag. Nur wenn das Gap
              // groß genug ist und die Buckets sich nicht gegenseitig aufheben —
              // sonst würden die anteiligen Prozentwerte absurd groß.
              const grossSum =
                Math.abs(stocksDiff) + Math.abs(etfsDiff) + Math.abs(cryptoDiff) + Math.abs(feeCost) + Math.abs(taxCost)
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
                { key: 'taxes', label: 'Steuern auf Verkäufe', euroDiff: -taxCost },
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

    const sampledPerformance = downsampleLttb(performanceData, CHART_MAX_POINTS, p => p.portfolioPerformance)

    return reply({
      success: true,
      data: sampledData, // Wertentwicklung: { date, value, invested, performance }
      performanceData: sampledPerformance, // Performance: { date, portfolioPerformance, spyPerformance } in %
      benchmarkComparison, // Kennzahlen: Depot vs. Benchmarks (p.a.-Differenz + Euro-Betrag)
      // Risiko-Kennzahlen: nur Premium — sonst Locked-Flag fürs UI-Teaser
      riskMeasures,
      riskMeasuresLocked: !canUseProAnalytics ? true : undefined,
      // Quant-Analysen (nur wenn per quant:true angefragt): Korrelation,
      // Stresstests, Monte-Carlo, Faktorregression — Premium-only
      quant: quantAnalysis,
      quantLocked: quant && !canUseProAnalytics ? true : undefined,
      meta: {
        totalPoints: chartData.length,
        sampledPoints: sampledData.length,
        transactionsUsed: useTransactions,
        // 'deposits': Wert inkl. Cash vs. kumulierte Netto-Einzahlungen.
        // 'cost_basis': Wertpapierwert vs. Kostenbasis der Positionen.
        investedMode,
        cashLedger,
        dateRange: {
          from: chartData[0]?.date || null,
          to: chartData[chartData.length - 1]?.date || null
        }
      }
    })

  } catch (error) {
    console.error('Portfolio-History API Fehler:', error)
    return reply(
      { error: 'Fehler beim Abrufen der Portfolio-Historie', success: false },
      { status: 500 }
    )
  }
}
