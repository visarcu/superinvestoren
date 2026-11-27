// src/hooks/usePortfolio.ts - Zentraler Portfolio-Hook
'use client'

import { hasPremiumAccess } from '@/lib/premiumAccess'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { resolveDepotKey } from '@/lib/depotRoutes'
import { countedDepots } from '@/lib/sampleDepotShared'
import { useSearchParams } from 'next/navigation'
import { signInHref } from '@/lib/siteHosts'
import { todayIso } from '@/lib/localDate'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotesWithChanges, detectTickerCurrency } from '@/lib/fmp'
import { useCurrency } from '@/lib/CurrencyContext'
import { formatMoney } from '@/lib/displayFormat'
import { getEURRate, currencyManager, ExchangeRateError } from '@/lib/portfolioCurrency'
import { valueBeforeSpinoff } from '@/lib/spinoffAdjustment'
import { fetchEurRatesFor } from '@/lib/portfolioValuation'
import {
  alignDayChange,
  calculateDepotReturn,
  calculateDepotXirr,
  calculateHistoricalPerfByDepot,
  calculateRealizedGains,
  estimateMissingAmounts,
  filterPerformanceTransactions,
  latestTradingDay,
  summarizeDepot,
  tradingDayLabel,
  valuateHolding,
  type DepotSummary,
  type Holding,
  type Portfolio,
  type Transaction,
} from '@/lib/portfolio/metrics'

export type { DepotHistoricalPerf, DepotSummary, Holding, Portfolio, RealizedGainInfo, Transaction } from '@/lib/portfolio/metrics'

/**
 * Buchung schreiben und jeden Fehler werfen. Vorher wurde das Ergebnis des
 * Inserts nicht geprüft: Das Formular meldete Erfolg, Bestand oder Bargeld
 * waren geändert, aber die Buchung fehlte (keine Rendite, kein Verlauf).
 */
async function insertTransaction(row: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .insert(row)
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/**
 * Buchung zuerst, Bestand oder Bargeld danach. Scheitert der zweite Schritt,
 * kommt die Buchung wieder weg, damit nichts Halbes stehen bleibt.
 */
async function bookTransaction(row: Record<string, unknown>, apply: () => Promise<void>): Promise<void> {
  const txId = await insertTransaction(row)
  try {
    await apply()
  } catch (applyError) {
    await supabase.from('portfolio_transactions').delete().eq('id', txId)
    throw applyError
  }
}

// ---- Buchungen löschen und bearbeiten: Wirkung auf Bargeld und Bestand ----

/** Zeile aus portfolio_transactions, wie sie in der Datenbank liegt */
interface StoredTransactionRow {
  id: string
  portfolio_id: string
  type: string
  symbol: string
  name: string | null
  quantity: number | string | null
  price: number | string | null
  total_value: number | string | null
  fee: number | string | null
  date: string
  notes: string | null
}

const STORED_TRANSACTION_COLUMNS = 'id, portfolio_id, type, symbol, name, quantity, price, total_value, fee, date, notes'
const EPS_SHARES = 1e-6

const num = (value: unknown): number => Number(value) || 0

/** Betrag einer Buchung: total_value, sonst Stück × Kurs */
function bookedAmount(tx: Pick<StoredTransactionRow, 'total_value' | 'quantity' | 'price'>): number {
  const total = num(tx.total_value)
  return total > 0 ? total : Math.abs(num(tx.quantity) * num(tx.price))
}

/** Einstand eines Kaufs, Kaufgebühren eingeschlossen (wie lib/portfolio/costBasis) */
function buyCost(tx: Pick<StoredTransactionRow, 'total_value' | 'quantity' | 'price' | 'fee'>): number {
  return bookedAmount(tx) + Math.abs(num(tx.fee))
}

/** Felder einer Buchung, die ihre Kontobewegung bestimmen: gespeicherte Zeile oder neue Buchung */
type CashRelevantRow = {
  type: string
  total_value: number | string | null
  quantity: number | string | null
  price: number | string | null
  fee?: number | string | null
  notes?: string | null
}

/**
 * Kontobewegung einer Buchung aus Sicht des Bargelds, dieselbe Regel wie beim
 * Import (CSVImportModal): Käufe belasten das Konto samt Gebühr, Verkäufe
 * bringen den Erlös abzüglich Gebühr, Dividenden und Einzahlungen kommen dazu,
 * Auszahlungen gehen ab. Depotüberträge bewegen kein Geld.
 */
function cashEffect(tx: CashRelevantRow): number {
  const amount = bookedAmount(tx)
  const fee = Math.abs(num(tx.fee))
  switch (tx.type) {
    case 'cash_deposit': return amount
    case 'cash_withdrawal': return -amount
    case 'dividend': return amount
    case 'buy': return -(valueBeforeSpinoff(amount, tx.notes) + fee)
    case 'sell': return amount - fee
    default: return 0
  }
}

async function loadStoredTransaction(txId: string): Promise<StoredTransactionRow> {
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select(STORED_TRANSACTION_COLUMNS)
    .eq('id', txId)
    .single()
  if (error) throw error
  return data as unknown as StoredTransactionRow
}

const isCashBooking = (type: string) => type === 'cash_deposit' || type === 'cash_withdrawal'

// ---- Eingaben prüfen: eine Regel für alle Formulare und Bearbeitungen ----

/** Buchungsdatum: vollständig, gültig und nicht in der Zukunft */
function assertBookingDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
    throw new Error('Bitte ein gültiges Datum angeben')
  }
  if (date > todayIso()) throw new Error('Das Datum darf nicht in der Zukunft liegen')
}

function assertPositiveAmount(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} muss größer als 0 sein`)
}

function assertNonNegativeAmount(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} darf nicht negativ sein`)
}

/**
 * Hinweis über Positionen, die ohne Kurs oder ohne Wechselkurs zum Einstand
 * zählen (price_missing aus valuateHolding). Vorher entstand der Hinweis je
 * Depot beim Laden der Kurse: In "Alle Depots" überschrieb das zuletzt
 * geladene Depot die Meldung der anderen, und ein fehlender Wechselkurs
 * (Fremdwährungspositionen still zum Einstand, Gewinn 0) blieb ganz stumm.
 */
function priceBanner(holdings: Holding[]): string | null {
  const missing = [...new Set(holdings.filter(h => h.price_missing).map(h => h.symbol))]
  if (missing.length === 0) return null
  if (holdings.length > 1 && missing.length === holdings.length) {
    return 'Kurse konnten nicht geladen werden. Die Positionen zählen vorerst zum Einstand.'
  }
  return `Kurse nicht verfügbar für: ${missing.join(', ')}. Diese Positionen zählen zum Einstand.`
}

/**
 * Folgt das Bargeld dieses Depots den Käufen, Verkäufen und Dividenden? Der
 * Import rechnet das Bargeld aus allen Buchungen, sobald Ein- oder
 * Auszahlungen dabei sind (CSVImportModal), sonst lässt er es in Ruhe. Nach
 * derselben Regel bewegen von Hand erfasste Käufe, Verkäufe und Dividenden
 * das Bargeld, und ihr Löschen oder Bearbeiten nimmt die Bewegung zurück. In
 * einem Depot ohne Geldbewegungen bleibt das Bargeld in Ruhe: Im Beispieldepot
 * stünden sonst nach dem Löschen eines Kaufs 101 € Guthaben.
 */
async function depotTracksCash(portfolioId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select('id')
    .eq('portfolio_id', portfolioId)
    .in('type', ['cash_deposit', 'cash_withdrawal'])
    .limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

/** Bargeld eines Depots um delta verschieben (Buchung gelöscht oder geändert) */
async function shiftCash(portfolioId: string, delta: number): Promise<void> {
  if (Math.abs(delta) < 0.005) return
  const { data, error } = await supabase
    .from('portfolios')
    .select('cash_position')
    .eq('id', portfolioId)
    .single()
  if (error) throw error
  const next = Math.round((num(data.cash_position) + delta) * 100) / 100
  const { error: updateError } = await supabase
    .from('portfolios')
    .update({ cash_position: next })
    .eq('id', portfolioId)
  if (updateError) throw updateError
}

/**
 * Bestand eines Papiers um eine Buchung verschieben. deltaQuantity in Stück,
 * deltaCost in Euro; ohne deltaCost bleibt der Durchschnittskurs stehen
 * (Verkauf zurückgenommen oder geändert). Gibt es die Position nicht mehr und
 * kommen Stücke dazu, entsteht sie neu mit fallbackPrice als Einstand.
 */
async function shiftHolding(params: {
  portfolioId: string
  symbol: string
  name: string | null
  date: string
  deltaQuantity: number
  deltaCost?: number
  fallbackPrice: number
}): Promise<void> {
  const { portfolioId, symbol, name, date, deltaQuantity, deltaCost, fallbackPrice } = params
  if (Math.abs(deltaQuantity) < EPS_SHARES && !deltaCost) return

  const { data: rows, error } = await supabase
    .from('portfolio_holdings')
    .select('id, quantity, purchase_price')
    .eq('portfolio_id', portfolioId)
    .eq('symbol', symbol)
    .order('quantity', { ascending: false })
    .limit(1)
  if (error) throw error
  const holding = rows?.[0]

  if (!holding) {
    if (deltaQuantity <= EPS_SHARES) return
    const price = deltaCost !== undefined && deltaCost > 0 ? deltaCost / deltaQuantity : fallbackPrice
    const { error: insertError } = await supabase
      .from('portfolio_holdings')
      .insert({
        portfolio_id: portfolioId,
        symbol,
        name: name || symbol,
        quantity: deltaQuantity,
        purchase_price: price,
        purchase_date: date,
        purchase_currency: 'EUR',
      })
    if (insertError) throw insertError
    return
  }

  const oldQuantity = num(holding.quantity)
  const oldPrice = num(holding.purchase_price)
  const newQuantity = oldQuantity + deltaQuantity
  if (newQuantity <= EPS_SHARES) {
    const { error: deleteError } = await supabase.from('portfolio_holdings').delete().eq('id', holding.id)
    if (deleteError) throw deleteError
    return
  }
  const newCost = deltaCost === undefined
    ? oldPrice * newQuantity
    : Math.max(0, oldQuantity * oldPrice + deltaCost)
  const { error: updateError } = await supabase
    .from('portfolio_holdings')
    .update({ quantity: newQuantity, purchase_price: newCost / newQuantity })
    .eq('id', holding.id)
  if (updateError) throw updateError
}

/**
 * @param routeDepotKey Depot aus dem Pfad des Workspace ('all', Kurzname oder
 *   Depot-ID, siehe lib/depotRoutes). Ohne Angabe gilt ?depot=… (ältere Seiten).
 */
export function usePortfolio(routeDepotKey?: string) {
  const searchParams = useSearchParams()
  const { currency, setCurrency, formatCurrency: formatCompactCurrency, formatStockPrice, formatPercentage } = useCurrency()

  // Depotbeträge wie im Kontoauszug immer mit Cents ("16.821,40 €" statt
  // "16.821,4 €"). Ab einer Million bleibt die gekürzte Schreibweise.
  const formatCurrency = (amount: number, type: 'currency' | 'number' = 'currency'): string => {
    if (type === 'number' || Math.abs(amount) >= 1_000_000) return formatCompactCurrency(amount, type)
    // Rundung auf 0 ohne Vorzeichen ("-0,00 €")
    const rounded = Math.round(amount * 100) / 100
    return formatMoney(rounded === 0 ? 0 : rounded, currency)
  }

  // Ohne Depot in Pfad oder ?depot=…: Default auf 'all' (Sicht über alle Depots).
  // So landet der User nicht versehentlich auf einem leeren Default-Portfolio,
  // wenn er bereits weitere Depots angelegt hat.
  const depotIdParam = routeDepotKey ?? searchParams.get('depot') ?? 'all'

  // Core State
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [allPortfolios, setAllPortfolios] = useState<Portfolio[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  // Kennzahlen je Depot, nur in der Sicht "Alle Depots" geladen (auch fürs Beispieldepot)
  const [depotSummaries, setDepotSummaries] = useState<Map<string, DepotSummary>>(new Map())
  const [loading, setLoading] = useState(true)
  // true, sobald Positionen und Buchungen einmal geladen sind. Vorher steht nur der
  // Rahmen (Name, Bargeld), daraus darf noch kein Depotwert gerechnet werden.
  const [dataReady, setDataReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ohne Sitzung geht es zur Anmeldung; bis dahin kein Onboarding zeigen
  const [redirecting, setRedirecting] = useState(false)

  // "Alle Depots"-Sicht aus dem geladenen Portfolio ableiten — nicht aus dem URL-Param.
  // Wenn nur ein Depot existiert, fällt loadPortfolio auch bei depot=all auf das einzelne
  // Depot zurück; in dem Fall ist isAllDepotsView korrekt false.
  const isAllDepotsView = portfolio?.id === 'all'

  // Zuletzt geöffnetes Depot ('all' oder ID). Rückfall, wenn der Kurzname in
  // der URL nicht mehr passt, z. B. direkt nach dem Umbenennen.
  const loadedDepotRef = useRef<string | null>(null)

  // Laufende Nummer des letzten Ladevorgangs, damit ein überholter nichts mehr überschreibt
  const loadSeqRef = useRef(0)

  // Premium State
  const [isPremium, setIsPremium] = useState(false)

  // Exchange Rate State
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null)
  const [priceLoadError, setPriceLoadError] = useState<string | null>(null)

  // Force EUR
  useEffect(() => {
    setCurrency('EUR')
  }, [])

  // Depots, die in "Alle Depots" zählen (ohne Beispieldepot, sobald es ein eigenes gibt)
  const countedPortfolios = useMemo(() => countedDepots(allPortfolios), [allPortfolios])

  // Computed Values
  const cashPosition = useMemo(() => {
    if (isAllDepotsView) {
      return countedPortfolios.reduce((sum, p) => sum + (p.cash_position || 0), 0)
    }
    return portfolio?.cash_position || 0
  }, [portfolio, countedPortfolios, isAllDepotsView])

  // Führt das geladene Depot Geld (Regel: depotTracksCash)? Dann zeigen die
  // Buchungsformulare, was nach Kauf, Verkauf oder Dividende vom Bargeld bleibt
  const tracksCash = useMemo(
    () => !isAllDepotsView && transactions.some(tx => isCashBooking(tx.type)),
    [transactions, isAllDepotsView]
  )

  const totalInvested = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.purchase_price_display * h.quantity), 0)
  }, [holdings])

  const stockValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.value, 0)
  }, [holdings])

  const totalValue = useMemo(() => stockValue + cashPosition, [stockValue, cashPosition])

  const totalGainLoss = useMemo(() => stockValue - totalInvested, [stockValue, totalInvested])

  const totalGainLossPercent = useMemo(() => {
    return totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0
  }, [totalGainLoss, totalInvested])

  // Tagesgewinn/-verlust über alle Positionen (letzter Handelstag).
  // Prozent bezogen auf den Depotwert von gestern (heutiger Wert − Änderung).
  const dayGainLoss = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.day_change_value || 0), 0)
  }, [holdings])

  // Beschriftung zum Handelstag: "Heute", sonst z. B. "Mo., 23.11."
  const dayLabel = useMemo(() => tradingDayLabel(latestTradingDay(holdings)), [holdings])

  const dayGainLossPercent = useMemo(() => {
    const previousValue = stockValue - dayGainLoss
    return previousValue > 0 ? (dayGainLoss / previousValue) * 100 : 0
  }, [stockValue, dayGainLoss])

  const performanceTransactions = useMemo(
    () => filterPerformanceTransactions(transactions, holdings),
    [transactions, holdings]
  )

  const enrichedPerformanceTransactions = useMemo(
    () => estimateMissingAmounts(performanceTransactions, holdings),
    [performanceTransactions, holdings]
  )

  // Realisierte Gewinne + Dividenden aus Transaktionshistorie
  const realizedGains = useMemo(
    () => calculateRealizedGains(enrichedPerformanceTransactions),
    [enrichedPerformanceTransactions]
  )
  const { totalRealizedGain, totalDividends, realizedGainByTxId } = realizedGains

  // Historische Performance pro (symbol, portfolio_id) — für Ghost-Rows in der
  // "Alle Depots"-Ansicht (Position wurde transferiert, aber Depot X hat noch
  // historische Dividenden/Realized dort erzielt). Nur sinnvoll mit Portfolio-Info.
  const historicalPerfByDepot = useMemo(
    () => isAllDepotsView ? calculateHistoricalPerfByDepot(transactions) : new Map(),
    [transactions, isAllDepotsView]
  )

  // Gesamtrendite mit allen Teilen (Kursgewinn, Realisiert, Dividenden, Zinsen,
  // Gebühren, Steuern, Überträge), siehe calculateDepotReturn
  const depotReturn = useMemo(
    () => calculateDepotReturn(performanceTransactions, holdings, realizedGains),
    [performanceTransactions, holdings, realizedGains]
  )
  const totalReturn = depotReturn.total
  const totalReturnPercent = depotReturn.totalPercent
  // Ordergebühren ohne Steuern, schon im Einstand bzw. in Realisiert enthalten
  const totalFees = depotReturn.orderFees

  // XIRR Berechnung — korrekt mit allen Transaktionen
  const xirrPercent = useMemo(
    () => calculateDepotXirr(enrichedPerformanceTransactions, holdings, stockValue),
    [enrichedPerformanceTransactions, holdings, stockValue]
  )

  // Load Exchange Rate
  const loadExchangeRate = useCallback(async () => {
    setExchangeRateError(null)
    try {
      const rate = await currencyManager.getCurrentUSDtoEURRate()
      setExchangeRate(rate)
    } catch (error) {
      if (error instanceof ExchangeRateError) {
        setExchangeRateError(error.message)
      } else {
        setExchangeRateError('Wechselkurs konnte nicht geladen werden')
      }
    }
  }, [])

  // Load Holdings for a portfolio
  const loadHoldingsForPortfolio = useCallback(async (portfolioId: string): Promise<Holding[]> => {
    const { data: holdingsData, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('portfolio_id', portfolioId)

    if (holdingsError) throw holdingsError
    if (!holdingsData || holdingsData.length === 0) return []

    const symbols = holdingsData.map(h => h.symbol)
    let currentPrices: Record<string, number> = {}
    const dayChangePctBySymbol: Record<string, number> = {}
    const tradedOnBySymbol: Record<string, string | null> = {}

    try {
      const quotes = await getBulkQuotesWithChanges(symbols)
      currentPrices = {}
      for (const [symbol, quote] of Object.entries(quotes)) {
        currentPrices[symbol] = quote.price
        dayChangePctBySymbol[symbol] = quote.changesPercentage
        tradedOnBySymbol[symbol] = quote.tradedOn
      }
    } catch {
      // Positionen bleiben stehen und zählen zum Einstand (valuateHolding);
      // der Hinweis dazu entsteht in loadPortfolio aus den price_missing-Flags.
    }

    // Wechselkurse für ALLE vorkommenden Quote-Währungen laden (USD, GBP,
    // JPY, CHF, CAD, AUD …) — vorher wurden nur USD/GBP konvertiert und z.B.
    // ein Mitsubishi-Kurs von 4.800 ¥ als 4.800 € gewertet.
    const currencies = new Set(symbols.map(s => detectTickerCurrency(s)))
    const rates = await fetchEurRatesFor(currencies)

    return holdingsData.map((h: any) =>
      valuateHolding(
        h,
        currentPrices[h.symbol] || 0,
        dayChangePctBySymbol[h.symbol] ?? 0,
        rates,
        tradedOnBySymbol[h.symbol] ?? null,
      )
    )
  }, [currency])

  // Load Transactions
  // Transaktionen paginiert laden: PostgREST kappt bei 1000 Zeilen — größere
  // Depots verlören sonst still ihre ältesten Buchungen (Rendite, realisierte
  // Gewinne und Dividenden wären falsch).
  const loadAllTransactionRows = useCallback(async (portfolioId: string): Promise<Transaction[]> => {
    const PAGE_SIZE = 1000
    const rows: Transaction[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error: txError } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false })
        // Stabile Reihenfolge bei gleichem Datum, sonst verrutschen Seitengrenzen
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      // Ein Fehler ist kein Ende der Daten: Sonst galten die ersten Seiten als
      // vollständig, und Realisiert, Dividenden und XIRR rechneten mit halber Historie.
      if (txError) throw txError
      if (!data || data.length === 0) break
      rows.push(...data)
      if (data.length < PAGE_SIZE) break
    }
    return rows
  }, [])

  // Main Load Function
  // Depot, Bargeld, Positionen und Buchungen wechseln immer gemeinsam. Sonst stünde
  // beim Laden kurz der Wert des einen Depots unter dem Namen des anderen, beim
  // ersten Öffnen sogar nur das (womöglich negative) Bargeld als Depotwert.
  const loadPortfolio = useCallback(async (depotId?: string | null) => {
    const seq = ++loadSeqRef.current
    const isOutdated = () => seq !== loadSeqRef.current
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (isOutdated()) return
      if (!user) {
        // Keine Sitzung (abgelaufen oder abgemeldet): zur Anmeldung mit
        // Rücksprung auf die aktuelle Depotseite. "/login" führte ins 404.
        setRedirecting(true)
        if (typeof window !== 'undefined') window.location.assign(signInHref())
        return
      }

      // Premium Status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_premium, subscription_status, subscription_end_date')
        .eq('user_id', user.id)
        .single()
      // Ein Lesefehler ist kein Kostenlos-Konto: Der bisherige Stand bleibt,
      // sonst sah ein zahlender Nutzer bei einem Supabase-Aussetzer Schlösser.
      if (profileError) console.error('Profil konnte nicht geladen werden:', profileError.message)
      else setIsPremium(hasPremiumAccess(profile))

      // All Portfolios
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
      if (isOutdated()) return
      // Ein Fehler ist kein leeres Konto: Sonst sah ein Bestandskunde das
      // Onboarding "Leg dein erstes Depot an" und legte ein zweites Depot an.
      if (portfoliosError) throw portfoliosError

      // Erstes Laden: Rahmen (Name, Reiter, Depotliste) sofort zeigen, die Werte folgen.
      // Danach bleibt bis zum Ende der bisherige Stand stehen.
      const showShell = (next: Portfolio) => {
        setAllPortfolios(prev => prev.length > 0 ? prev : (portfolios || []))
        setPortfolio(prev => prev ?? next)
      }

      // "Alle Depots"-Sicht — nur sinnvoll ab zwei Depots. Bei genau einem Depot
      // wird direkt dieses geladen (sonst wären Import, Umbenennen und Cash
      // ausgeblendet und der FAB würde nach dem einzigen Depot fragen).
      // Depot aus der URL: 'all', Kurzname oder ID (siehe lib/depotRoutes)
      let target = depotId ? resolveDepotKey(depotId, portfolios || []) : 'all'
      if (target === null) {
        const last = loadedDepotRef.current
        target = last && (last === 'all' || (portfolios || []).some(p => p.id === last)) ? last : 'all'
      }

      if (target === 'all' && portfolios && portfolios.length > 1) {
        const counted = countedDepots(portfolios as Portfolio[])
        const allDepots: Portfolio = {
          id: 'all',
          name: 'Alle Depots',
          currency: 'EUR',
          cash_position: counted.reduce((sum, p) => sum + (p.cash_position || 0), 0),
          broker_credit: counted.reduce((sum, p) => sum + (p.broker_credit || 0), 0),
          created_at: new Date().toISOString()
        }
        showShell(allDepots)

        // Alle Depots parallel laden — sequenziell dauerte bei mehreren Depots
        // spürbar lange und die Seite zeigte derweil "keine Positionen".
        // Das Beispieldepot wird für die Depotliste mitgeladen, zählt aber nicht.
        const perDepot = await Promise.all(
          (portfolios as Portfolio[]).map(async pf => {
            const [h, tx] = await Promise.all([
              loadHoldingsForPortfolio(pf.id),
              loadAllTransactionRows(pf.id),
            ])
            // Portfolio-Info an jede Position und Buchung anhängen
            const depotInfo = {
              portfolio_id: pf.id,
              portfolio_name: pf.name || 'Depot',
              broker_type: pf.broker_type,
              broker_name: pf.broker_name,
              broker_color: pf.broker_color,
            }
            return {
              id: pf.id,
              holdings: h.map(holding => ({ ...holding, ...depotInfo })),
              transactions: tx.map(row => ({ ...row, ...depotInfo })),
            }
          })
        )
        if (isOutdated()) return
        const countedIds = new Set(counted.map(pf => pf.id))
        // Ein Handelstag für alle Depots, sonst mischt die Summe heute und gestern
        const tradingDay = latestTradingDay(perDepot.filter(d => countedIds.has(d.id)).flatMap(d => d.holdings))
        for (const depot of perDepot) depot.holdings = alignDayChange(depot.holdings, tradingDay) as typeof depot.holdings
        const countedData = perDepot.filter(d => countedIds.has(d.id))
        loadedDepotRef.current = 'all'
        setAllPortfolios(portfolios)
        setPortfolio(allDepots)
        setDepotSummaries(new Map(perDepot.map(d => [d.id, summarizeDepot(d.holdings, d.transactions)])))
        setHoldings(countedData.flatMap(d => d.holdings))
        setPriceLoadError(priceBanner(countedData.flatMap(d => d.holdings)))
        setTransactions(
          countedData
            .flatMap(d => d.transactions)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        )
        setDataReady(true)
        return
      }

      // Noch gar kein Depot vorhanden → Onboarding-Zustand.
      // Es wird bewusst KEIN Depot automatisch angelegt: der User soll sein
      // erstes Depot selbst (inkl. Broker-Zuordnung) erstellen.
      if (!portfolios || portfolios.length === 0) {
        setAllPortfolios([])
        setPortfolio(null)
        setHoldings([])
        setTransactions([])
        setPriceLoadError(null)
        setDataReady(false)
        return
      }

      // Specific or default portfolio
      const portfolioData = target !== 'all'
        ? portfolios.find(p => p.id === target) || portfolios[0]
        : portfolios[0]

      showShell(portfolioData)

      // Load holdings and transactions in parallel
      const [h, tx] = await Promise.all([
        loadHoldingsForPortfolio(portfolioData.id),
        loadAllTransactionRows(portfolioData.id)
      ])
      if (isOutdated()) return

      loadedDepotRef.current = portfolioData.id
      setAllPortfolios(portfolios)
      setPortfolio(portfolioData)
      setHoldings(alignDayChange(h))
      setPriceLoadError(priceBanner(h))
      setTransactions(tx)
      setDataReady(true)

    } catch (error: any) {
      if (isOutdated()) return
      console.error('Error loading portfolio:', error)
      setError(error.message || 'Fehler beim Laden des Portfolios')
    } finally {
      // Ein überholter Ladevorgang darf den laufenden nicht als fertig melden
      if (!isOutdated()) setLoading(false)
    }
  }, [loadHoldingsForPortfolio, loadAllTransactionRows])

  // Initial load und Depotwechsel. Zeigt die URL nur anders auf dasselbe
  // Depot (ID → Kurzname), wird nicht neu geladen. Läuft gerade ein Ladevorgang
  // für ein anderes Depot (schnell hin und zurück), muss er überholt werden.
  useEffect(() => {
    if (portfolio && allPortfolios.length > 0) {
      let target = resolveDepotKey(depotIdParam, allPortfolios)
      if (target === 'all' && allPortfolios.length <= 1) target = allPortfolios[0].id
      if (target === portfolio.id && !loading) return
    }
    loadPortfolio(depotIdParam)
    setTimeout(() => loadExchangeRate(), 500)
  }, [depotIdParam])

  // Refresh
  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      loadPortfolio(depotIdParam),
      loadExchangeRate()
    ])
    setRefreshing(false)
  }, [loadPortfolio, depotIdParam, loadExchangeRate])

  // Mutations
  const addPosition = useCallback(async (params: {
    stock: { symbol: string; name: string }
    quantity: number
    purchasePrice: number
    purchaseDate: string
    fees?: number
    investmentCase?: string | null
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { stock, quantity, purchasePrice, purchaseDate, fees = 0, investmentCase } = params
    assertPositiveAmount(quantity, 'Die Stückzahl')
    assertPositiveAmount(purchasePrice, 'Der Kaufkurs')
    assertNonNegativeAmount(fees, 'Die Gebühr')
    assertBookingDate(purchaseDate)
    const priceWithFees = purchasePrice + (fees / quantity)

    const trimmedCase = investmentCase?.trim().slice(0, 1000) || null
    const row = {
      portfolio_id: portfolio.id,
      type: 'buy',
      symbol: stock.symbol,
      name: stock.name,
      quantity,
      price: priceWithFees,
      total_value: quantity * purchasePrice + fees,
      date: purchaseDate,
      notes: fees > 0 ? `Kaufpreis: ${purchasePrice.toFixed(2)}€, Gebühren: ${fees.toFixed(2)}€` : null
    }
    // Führt das Depot Geld, geht der Kaufbetrag samt Gebühr vom Bargeld ab, wie
    // beim Import. Vorher blieb das Bargeld bei Käufen aus dem Formular immer
    // stehen: Wer Ein- und Auszahlungen bucht, musste jeden Kauf danach über
    // die Cash-Korrektur selbst nachziehen.
    const tracksCash = await depotTracksCash(portfolio.id)
    await bookTransaction(row, async () => {
      const { error } = await supabase
        .from('portfolio_holdings')
        .insert({
          portfolio_id: portfolio.id,
          symbol: stock.symbol,
          name: stock.name,
          quantity,
          purchase_price: priceWithFees,
          purchase_date: purchaseDate,
          purchase_currency: 'EUR',
          investment_case: trimmedCase,
          investment_case_updated_at: trimmedCase ? new Date().toISOString() : null,
        })
      if (error) throw error
      if (tracksCash) await shiftCash(portfolio.id, cashEffect(row))
    })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const addCash = useCallback(async (amount: number, date?: string) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')
    if (!Number.isFinite(amount) || amount === 0) throw new Error('Bitte einen Betrag ungleich 0 angeben')
    if (date) assertBookingDate(date)

    const newCash = (portfolio.cash_position || 0) + amount
    await bookTransaction({
      portfolio_id: portfolio.id,
      type: amount > 0 ? 'cash_deposit' : 'cash_withdrawal',
      symbol: 'CASH',
      name: amount > 0 ? 'Einzahlung' : 'Auszahlung',
      quantity: 1,
      price: Math.abs(amount),
      total_value: Math.abs(amount),
      date: date || todayIso()
    }, async () => {
      const { error } = await supabase
        .from('portfolios')
        .update({ cash_position: newCash })
        .eq('id', portfolio.id)
      if (error) throw error
    })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const updatePosition = useCallback(async (holdingId: string, updates: {
    quantity?: number
    purchase_price?: number
    purchase_date?: string
  }) => {
    if (updates.quantity !== undefined) assertPositiveAmount(updates.quantity, 'Die Stückzahl')
    if (updates.purchase_price !== undefined) assertPositiveAmount(updates.purchase_price, 'Der Einstandskurs')
    if (updates.purchase_date !== undefined) assertBookingDate(updates.purchase_date)

    // 1. Hole die aktuelle Holding um Symbol + altes Datum zu kennen
    const holding = holdings.find(h => h.id === holdingId)

    // 2. Update die Holding
    const { error } = await supabase
      .from('portfolio_holdings')
      .update({ ...updates, purchase_currency: 'EUR' })
      .eq('id', holdingId)
    if (error) throw error

    // 3. Synchronisiere die zugehörige Buy-Transaktion
    if (holding && portfolio?.id) {
      const txUpdates: Record<string, any> = {}
      if (updates.purchase_date) txUpdates.date = updates.purchase_date
      if (updates.quantity !== undefined) txUpdates.quantity = updates.quantity
      if (updates.purchase_price !== undefined) txUpdates.price = updates.purchase_price
      if (updates.quantity !== undefined || updates.purchase_price !== undefined) {
        const qty = updates.quantity ?? holding.quantity
        const price = updates.purchase_price ?? holding.purchase_price_display
        txUpdates.total_value = qty * price
      }

      if (Object.keys(txUpdates).length > 0) {
        // Nur wenn genau ein Kauf und sonst keine Bestandsbuchung zu dem Papier
        // existiert, ist die Position dieser eine Kauf und wird mitgeschrieben.
        // Vorher bekam bei mehreren Käufen der älteste die Gesamtstückzahl, und
        // Verlauf, realisierte Gewinne und "Seit Kauf" stimmten nicht mehr.
        const { data: related, error: relatedError } = await supabase
          .from('portfolio_transactions')
          .select(STORED_TRANSACTION_COLUMNS)
          .eq('portfolio_id', portfolio.id)
          .eq('symbol', holding.symbol)
          .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])
          .limit(2)
        if (relatedError) throw relatedError

        const rows = (related || []) as unknown as StoredTransactionRow[]
        if (rows.length === 1 && rows[0].type === 'buy') {
          const before = rows[0]
          const { error: txError } = await supabase
            .from('portfolio_transactions')
            .update(txUpdates)
            .eq('id', before.id)
          if (txError) throw txError
          // Bargeld wie beim Bearbeiten derselben Buchung in der Buchungsliste:
          // Führt das Depot Geld, wandert die Differenz des Kaufbetrags mit.
          const after = { ...before, ...txUpdates } as StoredTransactionRow
          const cashDelta = cashEffect(after) - cashEffect(before)
          if (Math.abs(cashDelta) >= 0.005 && await depotTracksCash(portfolio.id)) {
            await shiftCash(portfolio.id, cashDelta)
          }
        }
      }
    }

    await loadPortfolio(depotIdParam)
  }, [holdings, portfolio, loadPortfolio, depotIdParam])

  const deletePosition = useCallback(async (holdingId: string) => {
    const holding = holdings.find(h => h.id === holdingId)

    // Besteht die Position nur aus Käufen und Einbuchungen, kommen diese
    // Buchungen mit weg. In Depots, deren Bargeld aus den Buchungen stammt,
    // kommt der Kaufbetrag zurück, wie beim Löschen derselben Buchung in der
    // Buchungsliste. Vorher blieb das Bargeld um den Kauf zu niedrig.
    let removable: StoredTransactionRow[] = []
    if (holding?.symbol && portfolio?.id && portfolio.id !== 'all') {
      const { data: symbolTransactions, error: txLoadError } = await supabase
        .from('portfolio_transactions')
        .select(STORED_TRANSACTION_COLUMNS)
        .eq('portfolio_id', portfolio.id)
        .eq('symbol', holding.symbol)
      if (txLoadError) throw txLoadError

      const rows = (symbolTransactions || []) as unknown as StoredTransactionRow[]
      const removableTypes = new Set(['buy', 'transfer_in'])
      if (rows.length > 0 && rows.every(tx => removableTypes.has(tx.type))) removable = rows
    }

    const { error } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('id', holdingId)
    if (error) throw error

    if (removable.length > 0 && portfolio?.id) {
      const { error: txDeleteError } = await supabase
        .from('portfolio_transactions')
        .delete()
        .in('id', removable.map(tx => tx.id))
      if (txDeleteError) throw txDeleteError

      const cashBack = removable.reduce((sum, tx) => sum - cashEffect(tx), 0)
      if (Math.abs(cashBack) >= 0.005 && await depotTracksCash(portfolio.id)) {
        await shiftCash(portfolio.id, cashBack)
      }
    }

    await loadPortfolio(depotIdParam)
  }, [holdings, portfolio, loadPortfolio, depotIdParam])

  const topUpPosition = useCallback(async (holding: Holding, params: {
    quantity: number
    price: number
    date: string
    fees?: number
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { quantity: newQty, price: newPrice, date: topUpDate, fees = 0 } = params
    assertPositiveAmount(newQty, 'Die Stückzahl')
    assertPositiveAmount(newPrice, 'Der Kaufkurs')
    assertNonNegativeAmount(fees, 'Die Gebühr')
    assertBookingDate(topUpDate)
    const priceWithFees = newPrice + (fees / newQty)
    const oldQty = holding.quantity
    const oldPrice = holding.purchase_price
    const totalQty = oldQty + newQty
    const weightedAvgPrice = ((oldQty * oldPrice) + (newQty * priceWithFees)) / totalQty

    const row = {
      portfolio_id: portfolio.id,
      type: 'buy',
      symbol: holding.symbol,
      name: holding.name,
      quantity: newQty,
      price: priceWithFees,
      total_value: newQty * newPrice + fees,
      date: topUpDate,
      notes: fees > 0 ? `Aufstockung - Gebühren: ${fees.toFixed(2)}€` : 'Aufstockung'
    }
    // Bargeld wie bei addPosition: nur in Depots, die Geld führen
    const tracksCash = await depotTracksCash(portfolio.id)
    await bookTransaction(row, async () => {
      const { error } = await supabase
        .from('portfolio_holdings')
        .update({
          quantity: totalQty,
          purchase_price: weightedAvgPrice,
          purchase_date: holding.purchase_date < topUpDate ? holding.purchase_date : topUpDate
        })
        .eq('id', holding.id)
      if (error) throw error
      if (tracksCash) await shiftCash(portfolio.id, cashEffect(row))
    })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const sellPosition = useCallback(async (holdingId: string, params: {
    quantity: number
    price: number
    date: string
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) throw new Error('Position nicht gefunden')

    const { quantity, price, date } = params
    assertPositiveAmount(quantity, 'Die Stückzahl')
    if (!Number.isFinite(price) || price < 0) throw new Error('Bitte einen gültigen Verkaufskurs angeben')
    assertBookingDate(date)
    if (quantity > holding.quantity + EPS_SHARES) {
      throw new Error(`Im Bestand sind nur ${holding.quantity.toLocaleString('de-DE', { maximumFractionDigits: 6 })} Stück`)
    }

    const row = {
      portfolio_id: portfolio.id,
      type: 'sell',
      symbol: holding.symbol,
      name: holding.name,
      quantity,
      price,
      total_value: quantity * price,
      date
    }
    // Der Erlös kommt dem Bargeld zu, wenn das Depot Geld führt (siehe addPosition)
    const tracksCash = await depotTracksCash(portfolio.id)
    await bookTransaction(row, async () => {
      if (quantity >= holding.quantity - EPS_SHARES) {
        // Vollverkauf — Holding löschen
        const { error } = await supabase
          .from('portfolio_holdings')
          .delete()
          .eq('id', holdingId)
        if (error) throw error
      } else {
        // Teilverkauf — Menge reduzieren
        const { error } = await supabase
          .from('portfolio_holdings')
          .update({ quantity: holding.quantity - quantity })
          .eq('id', holdingId)
        if (error) throw error
      }
      if (tracksCash) await shiftCash(portfolio.id, cashEffect(row))
    })

    await loadPortfolio(depotIdParam)
  }, [portfolio, holdings, loadPortfolio, depotIdParam])

  const addDividend = useCallback(async (holdingId: string, params: {
    amount: number
    date: string
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) throw new Error('Position nicht gefunden')

    const { amount, date } = params
    assertPositiveAmount(amount, 'Der Betrag')
    assertBookingDate(date)

    // Kein Bestand zu ändern. Die Dividende kommt dem Bargeld zu, wenn das
    // Depot Geld führt (siehe addPosition)
    const row = {
      portfolio_id: portfolio.id,
      type: 'dividend',
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      price: holding.quantity > 0 ? amount / holding.quantity : 0,
      total_value: amount,
      date
    }
    const tracksCash = await depotTracksCash(portfolio.id)
    await bookTransaction(row, async () => {
      if (tracksCash) await shiftCash(portfolio.id, cashEffect(row))
    })

    await loadPortfolio(depotIdParam)
  }, [portfolio, holdings, loadPortfolio, depotIdParam])

  // Depotübertrag: transfer_in (Einbuchung) oder transfer_out (Ausbuchung)
  const addTransfer = useCallback(async (params: {
    direction: 'in' | 'out'
    stock: { symbol: string; name: string }
    quantity: number
    price: number
    date: string
    notes?: string
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { direction, stock, quantity, price, date, notes } = params
    const type = direction === 'in' ? 'transfer_in' : 'transfer_out'

    // Bestehende Holding suchen
    const existingHolding = holdings.find(h => h.symbol === stock.symbol)

    assertPositiveAmount(quantity, 'Die Stückzahl')
    if (!Number.isFinite(price) || price < 0) throw new Error('Bitte einen gültigen Kurs angeben')
    assertBookingDate(date)
    if (direction === 'out') {
      // Eine Ausbuchung über den Bestand hinaus erzeugte Phantomstücke in
      // Einstand und realisierten Gewinnen.
      if (!existingHolding) throw new Error('Zu diesem Papier gibt es keine Position zum Ausbuchen')
      if (quantity > existingHolding.quantity + EPS_SHARES) throw new Error('Die Ausbuchung übersteigt den Bestand')
    }

    await bookTransaction({
      portfolio_id: portfolio.id,
      type,
      symbol: stock.symbol,
      name: stock.name,
      quantity,
      price,
      total_value: quantity * price,
      date,
      notes: notes || (direction === 'in' ? 'Einbuchung (Depotübertrag)' : 'Ausbuchung (Depotübertrag)')
    }, async () => {
      if (direction === 'in') {
        // Einbuchung: Holding erstellen oder aufstocken
        if (existingHolding) {
          const totalQty = existingHolding.quantity + quantity
          const avgPrice = ((existingHolding.quantity * existingHolding.purchase_price) + (quantity * price)) / totalQty
          const { error } = await supabase
            .from('portfolio_holdings')
            .update({
              quantity: totalQty,
              purchase_price: avgPrice,
              purchase_date: existingHolding.purchase_date < date ? existingHolding.purchase_date : date
            })
            .eq('id', existingHolding.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('portfolio_holdings')
            .insert({
              portfolio_id: portfolio.id,
              symbol: stock.symbol,
              name: stock.name,
              quantity,
              purchase_price: price,
              purchase_date: date,
              purchase_currency: 'EUR'
            })
          if (error) throw error
        }
      } else if (existingHolding) {
        // Ausbuchung: Holding reduzieren oder löschen
        const { error } = quantity >= existingHolding.quantity
          ? await supabase.from('portfolio_holdings').delete().eq('id', existingHolding.id)
          : await supabase
              .from('portfolio_holdings')
              .update({ quantity: existingHolding.quantity - quantity })
              .eq('id', existingHolding.id)
        if (error) throw error
      }
    })

    await loadPortfolio(depotIdParam)
  }, [portfolio, holdings, loadPortfolio, depotIdParam])

  // Duplikat-Prüfung: Prüft ob eine ähnliche Transaktion bereits existiert
  const checkDuplicate = useCallback(async (params: {
    type: string
    symbol: string
    date: string
    quantity: number
    price: number
  }): Promise<Transaction | null> => {
    if (!portfolio?.id) return null

    const { type, symbol, date, quantity, price } = params

    const { data } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .eq('type', type)
      .eq('symbol', symbol)
      .eq('date', date)
      .limit(20)

    if (!data || data.length === 0) return null

    // Menge und Preis mit Toleranz vergleichen
    const match = data.find((tx: any) => {
      const qtyMatch = Math.abs(tx.quantity - quantity) < 0.01
      const priceMatch = Math.abs(tx.price - price) < 0.02
      return qtyMatch && priceMatch
    })

    return match || null
  }, [portfolio])

  const updateCashPosition = useCallback(async (newAmount: number) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    if (!Number.isFinite(newAmount)) throw new Error('Bitte einen gültigen Betrag angeben')
    const difference = newAmount - (portfolio.cash_position || 0)

    const applyCash = async () => {
      const { error } = await supabase
        .from('portfolios')
        .update({ cash_position: newAmount })
        .eq('id', portfolio.id)
      if (error) throw error
    }

    if (difference !== 0) {
      await bookTransaction({
        portfolio_id: portfolio.id,
        type: difference > 0 ? 'cash_deposit' : 'cash_withdrawal',
        symbol: 'CASH',
        name: difference > 0 ? 'Einzahlung' : 'Auszahlung',
        quantity: 1,
        price: Math.abs(difference),
        total_value: Math.abs(difference),
        date: todayIso()
      }, applyCash)
    } else {
      await applyCash()
    }

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  // Name und Kredit auch in der Depotliste ändern. Vorher wurde nur das
  // geladene Depot angepasst: Seitenleiste und Kurzname in der Adresse zeigten
  // den alten Namen, und nach einem Reload passte der alte Kurzname zu keinem
  // Depot mehr, man landete in "Alle Depots". Mit der aktualisierten Liste
  // berechnet der Workspace den neuen Kurznamen und schreibt die Adresse um.
  const patchLoadedPortfolio = useCallback((portfolioId: string, patch: Partial<Portfolio>) => {
    setPortfolio(prev => prev ? { ...prev, ...patch } : null)
    setAllPortfolios(prev => prev.map(p => (p.id === portfolioId ? { ...p, ...patch } : p)))
  }, [])

  const updateBrokerCredit = useCallback(async (amount: number) => {
    if (!portfolio?.id || portfolio.id === 'all') throw new Error('Kein Portfolio ausgewählt')
    const { error } = await supabase
      .from('portfolios')
      .update({ broker_credit: amount })
      .eq('id', portfolio.id)
    if (error) throw error
    patchLoadedPortfolio(portfolio.id, { broker_credit: amount })
  }, [portfolio, patchLoadedPortfolio])

  const updatePortfolioName = useCallback(async (name: string) => {
    if (!portfolio?.id || portfolio.id === 'all') throw new Error('Kein Portfolio ausgewählt')
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Bitte einen Namen eingeben')

    const { error } = await supabase
      .from('portfolios')
      .update({ name: trimmed })
      .eq('id', portfolio.id)
    if (error) throw error

    patchLoadedPortfolio(portfolio.id, { name: trimmed })
  }, [portfolio, patchLoadedPortfolio])

  // Einzelne Buchung bearbeiten (Datum, Menge, Preis, Gebühren, Notiz) und die
  // Wirkung nachziehen: Das Bargeld um die Differenz der Kontobewegung, bei
  // Käufen und Verkäufen den Bestand um die geänderten Stücke. Vorher änderte
  // sich nur die Zeile, Depotwert und Positionen passten nicht mehr dazu.
  const updateTransaction = useCallback(async (txId: string, updates: {
    date?: string
    quantity?: number
    price?: number
    fee?: number
    notes?: string | null
    total_value?: number
  }) => {
    if (updates.date !== undefined) assertBookingDate(updates.date)
    if (updates.quantity !== undefined) assertPositiveAmount(updates.quantity, 'Die Stückzahl')
    if (updates.price !== undefined && (!Number.isFinite(updates.price) || updates.price < 0)) {
      throw new Error('Bitte einen gültigen Kurs angeben')
    }
    if (updates.fee !== undefined) assertNonNegativeAmount(updates.fee, 'Die Gebühr')

    const before = await loadStoredTransaction(txId)

    const payload: Record<string, unknown> = { ...updates }
    // total_value nur neu rechnen, wenn Stückzahl oder Kurs wirklich anders
    // sind. Importierte Käufe tragen den Kurs gerundet und den Betrag exakt;
    // eine bloße Notizänderung verschob sonst Bargeld und Einstand um Cents.
    const quantityChanged = updates.quantity !== undefined && Math.abs(updates.quantity - num(before.quantity)) > EPS_SHARES
    const priceChanged = updates.price !== undefined && Math.abs(updates.price - num(before.price)) > 1e-9
    if (payload.total_value === undefined && (quantityChanged || priceChanged)) {
      const q = updates.quantity ?? num(before.quantity)
      const p = updates.price ?? num(before.price)
      payload.total_value = q * p
    }
    const after = { ...before, ...payload } as StoredTransactionRow

    const { error } = await supabase
      .from('portfolio_transactions')
      .update(payload)
      .eq('id', txId)
    if (error) throw error

    const cashDelta = cashEffect(after) - cashEffect(before)
    if (cashDelta !== 0 && (isCashBooking(before.type) || await depotTracksCash(before.portfolio_id))) {
      await shiftCash(before.portfolio_id, cashDelta)
    }

    const quantityDelta = num(after.quantity) - num(before.quantity)
    const position = { portfolioId: before.portfolio_id, symbol: before.symbol, name: before.name, date: after.date }
    if (before.type === 'buy') {
      const costDelta = buyCost(after) - buyCost(before)
      if (Math.abs(quantityDelta) > EPS_SHARES || Math.abs(costDelta) > 0.005) {
        await shiftHolding({ ...position, deltaQuantity: quantityDelta, deltaCost: costDelta, fallbackPrice: num(after.price) })
      }
    } else if (before.type === 'sell' && Math.abs(quantityDelta) > EPS_SHARES) {
      // Zurückkommende Stücke zum damaligen Durchschnittskurs, nicht zum
      // Verkaufskurs: Sonst stand eine korrigierte Vollverkaufs-Position mit
      // dem Erlös als Einstand da.
      const basis = realizedGainByTxId.get(txId)?.avgCostBasis
      await shiftHolding({ ...position, deltaQuantity: -quantityDelta, fallbackPrice: basis && basis > 0 ? basis : num(after.price) })
    }

    await loadPortfolio(depotIdParam)
  }, [realizedGainByTxId, loadPortfolio, depotIdParam])

  // Buchung löschen und ihre Wirkung zurücknehmen. Vorher verschwand nur die
  // Zeile: Eine gelöschte Einzahlung ließ das Bargeld stehen, ein gelöschter
  // Kauf die Position. Depotüberträge bleiben wie bisher Bestandssache des
  // Nutzers (Splits und Spin-offs laufen ebenfalls als Übertrag). Beim
  // Bargeld gilt die Regel des Imports, siehe depotTracksCash.
  const deleteTransaction = useCallback(async (txId: string) => {
    const row = await loadStoredTransaction(txId)

    const { error } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('id', txId)
    if (error) throw error

    // Ein- und Auszahlungen immer, Käufe/Verkäufe/Dividenden nur in Depots,
    // deren Bargeld aus den Buchungen stammt
    if (isCashBooking(row.type) || await depotTracksCash(row.portfolio_id)) {
      await shiftCash(row.portfolio_id, -cashEffect(row))
    }

    const position = { portfolioId: row.portfolio_id, symbol: row.symbol, name: row.name, date: row.date }
    if (row.type === 'buy') {
      await shiftHolding({ ...position, deltaQuantity: -num(row.quantity), deltaCost: -buyCost(row), fallbackPrice: num(row.price) })
    } else if (row.type === 'sell') {
      // Die Stücke kommen zum damaligen Durchschnittskurs zurück in den Bestand
      const basis = realizedGainByTxId.get(txId)?.avgCostBasis
      await shiftHolding({ ...position, deltaQuantity: num(row.quantity), fallbackPrice: basis && basis > 0 ? basis : num(row.price) })
    }

    await loadPortfolio(depotIdParam)
  }, [realizedGainByTxId, loadPortfolio, depotIdParam])

  // Depot komplett löschen inkl. aller Holdings, Transaktionen und des
  // Portfolio-Eintrags selbst. Verwendet von der Depots-Übersicht.
  const deletePortfolio = useCallback(async (portfolioId: string) => {
    if (!portfolioId || portfolioId === 'all') {
      throw new Error('Ungültige Depot-ID')
    }
    // Reihenfolge wichtig: FK-Referenzen zuerst löschen
    await supabase.from('portfolio_holdings').delete().eq('portfolio_id', portfolioId)
    await supabase.from('portfolio_transactions').delete().eq('portfolio_id', portfolioId)
    const { error } = await supabase.from('portfolios').delete().eq('id', portfolioId)
    if (error) throw error

    await loadPortfolio(depotIdParam)
  }, [loadPortfolio, depotIdParam])

  // Ein komplettes Depot leeren: alle Holdings + Transaktionen löschen,
  // Cash-Position und Broker-Kredit auf 0 setzen. Das Depot selbst bleibt
  // bestehen (mit Namen & Broker-Type). Hilfreich vor einem kompletten
  // Re-Import aus einer aktualisierten CSV.
  const clearDepot = useCallback(async (portfolioId: string) => {
    if (!portfolioId || portfolioId === 'all') {
      throw new Error('Ungültige Depot-ID')
    }

    // 1) Holdings löschen
    const { error: holdErr } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('portfolio_id', portfolioId)
    if (holdErr) throw holdErr

    // 2) Transaktionen löschen
    const { error: txErr } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('portfolio_id', portfolioId)
    if (txErr) throw txErr

    // 3) Cash + Kredit zurücksetzen
    const { error: resetErr } = await supabase
      .from('portfolios')
      .update({ cash_position: 0, broker_credit: 0 })
      .eq('id', portfolioId)
    if (resetErr) throw resetErr

    await loadPortfolio(depotIdParam)
  }, [loadPortfolio, depotIdParam])

  const exportToCSV = useCallback(() => {
    const headers = ['Symbol', 'Name', 'Anzahl', 'Kaufpreis', 'Aktueller Preis', 'Wert', 'G/V', 'G/V %']
    const rows = holdings.map(h => [
      h.symbol, h.name, h.quantity,
      h.purchase_price_display, h.current_price_display,
      h.value, h.gain_loss, h.gain_loss_percent
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_${portfolio?.name}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }, [holdings, portfolio])

  return {
    // Data
    portfolio,
    allPortfolios,
    countedPortfolios,
    depotSummaries,
    holdings,
    transactions,
    isPremium,
    isAllDepotsView,
    depotIdParam,
    // true, sobald der Ladevorgang durch ist und der User noch kein Depot hat.
    // Nicht bei Ladefehler oder Weiterleitung zur Anmeldung.
    hasNoDepots: !loading && !error && !redirecting && allPortfolios.length === 0,
    redirecting,

    // Computed
    totalValue,
    totalInvested,
    stockValue,
    cashPosition,
    tracksCash,
    totalGainLoss,
    totalGainLossPercent,
    dayGainLoss,
    dayGainLossPercent,
    dayLabel,
    totalRealizedGain,
    totalDividends,
    totalFees,
    totalReturn,
    totalReturnPercent,
    depotReturn,
    realizedGainByTxId,
    historicalPerfByDepot,
    xirrPercent,
    activeInvestments: holdings.length,

    // State
    loading,
    dataReady,
    refreshing,
    error,
    exchangeRate,
    exchangeRateError,
    priceLoadError,

    // Currency
    formatCurrency,
    formatStockPrice,
    formatPercentage,

    // Actions
    refresh,
    loadPortfolio,
    loadExchangeRate,
    addPosition,
    addCash,
    updatePosition,
    deletePosition,
    topUpPosition,
    sellPosition,
    addDividend,
    addTransfer,
    updateCashPosition,
    updateBrokerCredit,
    updatePortfolioName,
    updateTransaction,
    deleteTransaction,
    clearDepot,
    deletePortfolio,
    exportToCSV,
  }
}
