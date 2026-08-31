// src/components/portfolio/PortfolioStockDetail.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getEURRate } from '@/lib/portfolioCurrency'
import { detectTickerCurrency } from '@/lib/fmp'
import { perfColor } from '@/utils/formatters'
import { calculateSymbolPerformance, type SymbolPerformance } from '@/utils/portfolioCalculations'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import WorkingStockChart from '@/components/WorkingStockChart'
import type { PurchaseMarker } from '@/components/WorkingStockChart'
import Logo from '@/components/Logo'
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { getETFBySymbol, calculateTERSavings, calculateTERCost, formatTER } from '@/lib/etfUtils'
import { useETFInfo } from '@/hooks/useETFInfo'
import InvestmentCaseCard from '@/components/portfolio/InvestmentCaseCard'

interface FullTransaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  fee?: number
  date: string
  portfolio_id: string
  notes?: string | null
}

interface DepotBreakdown {
  portfolioId: string
  portfolioName: string
  brokerType: string | null
  brokerName: string | null
  brokerColor: string | null
  transactions: FullTransaction[]
  performance: SymbolPerformance
}

interface PortfolioStockDetailProps {
  ticker: string
}

// Lokaler Prozent-Formatter — Portfolio-Werte sind durchgehend in EUR
// umgerechnet (statt useCurrency, das initial USD als Default hat).
const formatPercentageDE = (value: number, showSign = true): string => {
  if (!value && value !== 0) return '–'
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatted}%`
}

const formatQuantity = (value: number): string =>
  value.toLocaleString('de-DE', { maximumFractionDigits: 4 })

// Flache Karten wie im Portfolio-Workspace
const CARD = 'bg-theme-card border border-theme rounded-xl'
const STAT_CARD = `${CARD} p-4`

// Kennzahl-Zeile im Detail-Panel
function DetailRow({
  label,
  value,
  valueClass = 'text-theme-primary',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[12px] text-neutral-500">{label}</span>
      <span className={`text-[13px] font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}

// Platzhalter, solange Kurse und Buchungen laden — Kopfzeile steht schon
function StockDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 h-14 w-72 max-w-full rounded-xl border border-theme bg-theme-card" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map(item => (
          <div key={item} className="h-28 rounded-xl border border-theme bg-theme-card" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr,0.85fr]">
        <div className="h-[430px] rounded-xl border border-theme bg-theme-card" />
        <div className="h-[430px] rounded-xl border border-theme bg-theme-card" />
      </div>
    </div>
  )
}

export default function PortfolioStockDetail({ ticker }: PortfolioStockDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const portfolioId = searchParams.get('portfolioId')
  const returnTo = searchParams.get('returnTo')
  const totalValueParam = parseFloat(searchParams.get('totalValue') || '0')
  const formatPercentage = formatPercentageDE

  const [history, setHistory] = useState<{ date: string; close: number }[]>([])
  const [markers, setMarkers] = useState<PurchaseMarker[]>([])
  const [eurRate, setEurRate] = useState<number | null>(null)
  const [gbpEurRate, setGbpEurRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [allTransactions, setAllTransactions] = useState<FullTransaction[]>([])
  const [performance, setPerformance] = useState<SymbolPerformance | null>(null)
  const [depotBreakdowns, setDepotBreakdowns] = useState<DepotBreakdown[]>([])
  const [isMultiDepot, setIsMultiDepot] = useState(false)
  const [stockName, setStockName] = useState<string>('')
  const [historyInEUR, setHistoryInEUR] = useState(false)
  // FX-Aufspaltung (Kurs- vs. Währungseffekt) — nur für Nicht-EUR-Positionen
  // mit gespeicherter Kaufrate berechenbar, aggregiert über alle Depots
  const [fxSplit, setFxSplit] = useState<{ plExclFx: number; plFromFx: number } | null>(null)

  const tickerCurrency = useMemo(() => detectTickerCurrency(ticker), [ticker])
  const isEURStock = tickerCurrency === 'EUR'
  const isGBXStock = tickerCurrency === 'GBP' // .L Ticker → FMP liefert GBX (Pence)

  // Allokation berechnen
  const allocation = useMemo(() => {
    if (!totalValueParam || totalValueParam <= 0 || !performance) return null
    return (performance.currentValue / totalValueParam) * 100
  }, [totalValueParam, performance])

  // ETF-Info: Hook lädt Daten für unbekannte ETFs, danach findet getETFBySymbol sie im Cache
  const { fetchedCount } = useETFInfo([ticker])
  const etfInfo = useMemo(() => getETFBySymbol(ticker), [ticker, fetchedCount])

  // Daten laden
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setHistoryInEUR(isEURStock)

      try {
        // Historische Kurse + Live-Quote + Wechselkurse parallel laden
        // Für nicht-EUR-Ticker: Historical-API rechnet direkt in EUR um (wie Parqet)
        const histUrl = isEURStock
          ? `/api/historical/${ticker}`
          : `/api/historical/${ticker}?convertToEUR=true`
        const [histRes, quoteRes, eurRateResult, gbpEurRateResult] = await Promise.all([
          fetch(histUrl),
          fetch(`/api/quotes?symbols=${encodeURIComponent(ticker)}`).catch(() => null),
          isEURStock ? Promise.resolve(null) : getEURRate().catch(() => null),
          isGBXStock ? fetch('/api/exchange-rate?from=GBP&to=EUR')
            .then(r => r.ok ? r.json() : null)
            .then(d => d?.rate || null)
            .catch(() => null)
          : Promise.resolve(null),
        ])

        if (cancelled) return

        // Live-Quote parsen (FMP + Yahoo Fallback)
        let livePrice: number | null = null
        if (quoteRes && quoteRes.ok) {
          const quotes = await quoteRes.json()
          if (Array.isArray(quotes) && quotes.length > 0) {
            livePrice = quotes[0].price || null
          }
        }

        // Historische Kurse
        let historyData: { date: string; close: number }[] = []
        let loadedHistoryInEUR = isEURStock
        if (histRes.ok) {
          const histJson = await histRes.json()
          const { historical = [] } = histJson
          loadedHistoryInEUR = isEURStock || histJson?._currency === 'EUR' || histJson?._converted === true
          historyData = (historical as any[])
            .slice()
            .reverse()
            .map((h: any) => ({ date: h.date, close: h.close }))

          setHistoryInEUR(loadedHistoryInEUR)

          const toEURPrice = (price: number | null): number | null => {
            if (!price || price <= 0) return null
            if (isEURStock) return price
            if (isGBXStock && gbpEurRateResult) return (price / 100) * gbpEurRateResult
            if (!isGBXStock && eurRateResult) return price * eurRateResult
            if (loadedHistoryInEUR) return null
            return price
          }

          // Cross-Validierung: Prüfe ob Live-Quote plausibel ist
          // FMP liefert für EU-ETFs oft veraltete Kurse → nur verwenden wenn
          // die Abweichung zum letzten historischen Close < 10% ist
          if (livePrice && livePrice > 0 && historyData.length > 0) {
            const lastHistClose = historyData[historyData.length - 1].close
            const comparableLivePrice = toEURPrice(livePrice)
            const deviation = comparableLivePrice
              ? Math.abs(comparableLivePrice - lastHistClose) / lastHistClose
              : Infinity
            if (deviation > 0.10) {
              // Live-Quote weicht > 10% ab → wahrscheinlich veraltet, ignorieren
              livePrice = null
            } else {
              livePrice = comparableLivePrice
            }
          }

          // Wenn Live-Quote plausibel und aktueller als der letzte Datenpunkt,
          // füge ihn als heutigen Datenpunkt hinzu
          if (livePrice && livePrice > 0 && historyData.length > 0) {
            const today = new Date().toISOString().split('T')[0]
            const lastDate = historyData[historyData.length - 1].date
            if (lastDate < today) {
              historyData.push({ date: today, close: livePrice })
            } else if (lastDate === today) {
              // Heutigen Datenpunkt mit Live-Preis aktualisieren
              historyData[historyData.length - 1].close = livePrice
            }
          }

          setHistory(historyData)
        }

        if (eurRateResult) {
          setEurRate(eurRateResult)
        }
        if (gbpEurRateResult) {
          setGbpEurRate(gbpEurRateResult)
        }

        // Aktuellen EUR-Preis: Historische Daten bevorzugen (Yahoo Fallback = aktuell),
        // Live-Quote nur wenn plausibel (nach Cross-Validierung oben)
        const histLatestPrice = historyData.length > 0 ? historyData[historyData.length - 1].close : 0
        const latestPrice = histLatestPrice > 0
          ? histLatestPrice
          : (livePrice && livePrice > 0 ? livePrice : 0)
        let currentPriceEUR: number
        if (loadedHistoryInEUR) {
          currentPriceEUR = latestPrice
        } else if (isEURStock) {
          currentPriceEUR = latestPrice
        } else if (isGBXStock && gbpEurRateResult) {
          // .L Ticker: FMP liefert GBX (Pence) → ÷100 = GBP → ×Rate = EUR
          currentPriceEUR = (latestPrice / 100) * gbpEurRateResult
        } else if (eurRateResult) {
          currentPriceEUR = latestPrice * eurRateResult
        } else {
          currentPriceEUR = latestPrice
        }

        // Transaktionen laden je nach Modus
        const isAll = portfolioId === 'all' || !portfolioId
        let fxPortfolioIds: string[] = []

        if (isAll) {
          // Multi-Depot: Alle Portfolios des Users laden
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || cancelled) return

          const { data: portfolios } = await supabase
            .from('portfolios')
            .select('id, name, broker_type, broker_name, broker_color')
            .eq('user_id', user.id)

          if (!portfolios || cancelled) return
          fxPortfolioIds = portfolios.map(p => p.id)

          const breakdowns: DepotBreakdown[] = []
          const allTxs: FullTransaction[] = []

          for (const p of portfolios) {
            const { data: txs } = await supabase
              .from('portfolio_transactions')
              .select('*')
              .eq('portfolio_id', p.id)
              .eq('symbol', ticker)
              .in('type', ['buy', 'sell', 'dividend', 'transfer_in', 'transfer_out'])
              .order('date', { ascending: true })

            if (!txs || txs.length === 0) continue
            if (cancelled) return

            const portfolioTxs = txs.map((tx: any) => ({ ...tx, portfolio_id: p.id }))
            allTxs.push(...portfolioTxs)

            // Name aus erster Transaktion
            if (!stockName && txs[0]?.name) {
              setStockName(txs[0].name)
            }

            const perf = calculateSymbolPerformance(portfolioTxs, currentPriceEUR)

            breakdowns.push({
              portfolioId: p.id,
              portfolioName: p.name,
              brokerType: p.broker_type,
              brokerName: p.broker_name,
              brokerColor: p.broker_color,
              transactions: portfolioTxs,
              performance: perf,
            })
          }

          if (cancelled) return

          setDepotBreakdowns(breakdowns)
          setIsMultiDepot(breakdowns.length > 0)

          // Sortiere alle Transaktionen chronologisch
          allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          setAllTransactions(allTxs)

          // Aggregierte Performance über alle Depots
          if (allTxs.length > 0) {
            setPerformance(calculateSymbolPerformance(allTxs, currentPriceEUR))
          }
        } else {
          // Single-Depot
          const { data: txs } = await supabase
            .from('portfolio_transactions')
            .select('*')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', ticker)
            .in('type', ['buy', 'sell', 'dividend', 'transfer_in', 'transfer_out'])
            .order('date', { ascending: true })

          if (cancelled) return

          if (txs && txs.length > 0) {
            const portfolioTxs = txs.map((tx: any) => ({ ...tx, portfolio_id: portfolioId }))
            setAllTransactions(portfolioTxs)
            setPerformance(calculateSymbolPerformance(portfolioTxs, currentPriceEUR))

            if (txs[0]?.name) {
              setStockName(txs[0].name)
            }
          }

          setIsMultiDepot(false)
          if (portfolioId) fxPortfolioIds = [portfolioId]
        }

        // FX-Aufspaltung: gleiche Rechnung wie usePortfolio (Kaufkurs in
        // Quote-Währung rekonstruieren, Kurs- und Währungsanteil trennen)
        const currentFxRate = isEURStock ? null : isGBXStock ? gbpEurRateResult : eurRateResult
        if (currentFxRate && currentFxRate > 0 && currentPriceEUR > 0 && fxPortfolioIds.length > 0) {
          const { data: holdRows } = await supabase
            .from('portfolio_holdings')
            .select('quantity, purchase_price, purchase_fx_rate')
            .in('portfolio_id', fxPortfolioIds)
            .eq('symbol', ticker)

          if (cancelled) return

          const effectiveApiPrice = currentPriceEUR / currentFxRate
          let exclSum = 0
          let fromSum = 0
          let hasAny = false
          for (const row of holdRows || []) {
            const purchaseFxRate = row.purchase_fx_rate ? Number(row.purchase_fx_rate) : null
            const quantity = Number(row.quantity) || 0
            if (!purchaseFxRate || purchaseFxRate <= 0 || quantity <= 0) continue
            const purchasePriceOrig = (Number(row.purchase_price) || 0) / purchaseFxRate
            exclSum += (effectiveApiPrice - purchasePriceOrig) * quantity * purchaseFxRate
            fromSum += effectiveApiPrice * quantity * (currentFxRate - purchaseFxRate)
            hasAny = true
          }
          setFxSplit(hasAny ? { plExclFx: exclSum, plFromFx: fromSum } : null)
        } else {
          setFxSplit(null)
        }

        // Marker generieren (aus allTransactions oder gerade geladenen txs)
        // Wird über separates useMemo gemacht
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [ticker, portfolioId, isEURStock, isGBXStock])

  // Marker aus Transaktionen erzeugen
  const chartMarkers = useMemo(() => {
    const result: PurchaseMarker[] = []
    let buyCount = 0
    let sellCount = 0

    // Chronologisch sortiert
    const sorted = [...allTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let transferInCount = 0
    let dividendCount = 0

    for (const tx of sorted) {
      if (tx.type === 'buy') {
        buyCount++
        result.push({
          date: tx.date,
          priceEUR: tx.price,
          quantity: tx.quantity,
          label: `K${buyCount}`,
          type: 'buy',
        })
      } else if (tx.type === 'transfer_in') {
        // Spin-off-Einbuchungen eigens markieren (statt generisch "Einbuchung")
        if ((tx.notes || '').includes('Spin-off')) {
          result.push({
            date: tx.date,
            priceEUR: tx.price,
            quantity: tx.quantity,
            label: 'SO',
            type: 'spinoff',
          })
        } else {
          transferInCount++
          result.push({
            date: tx.date,
            priceEUR: tx.price,
            quantity: tx.quantity,
            label: `E${transferInCount}`,
            type: 'buy',
          })
        }
      } else if (tx.type === 'sell') {
        sellCount++
        result.push({
          date: tx.date,
          priceEUR: tx.price,
          quantity: tx.quantity,
          label: `V${sellCount}`,
          type: 'sell',
        })
      } else if (tx.type === 'dividend') {
        dividendCount++
        result.push({
          date: tx.date,
          priceEUR: tx.price,
          quantity: tx.quantity,
          label: `D${dividendCount}`,
          type: 'dividend',
        })
      }
    }

    // Mutterposition eines Spin-offs: die abgespaltene Aktie hat hier keine
    // eigene Buchung, aber die Käufe tragen die Note "Spin-off XYZ vom DATUM".
    // Daraus je Datum einen Spin-off-Marker ableiten, damit der Zeitpunkt (an
    // dem sich Stückzahl/Kostenbasis ändern) auch im Mutter-Chart sichtbar ist.
    const spinoffDates = new Set<string>()
    for (const tx of sorted) {
      const m = tx.notes?.match(/Spin-off\s+\S+\s+vom\s+(\d{4}-\d{2}-\d{2})/)
      if (m) spinoffDates.add(m[1])
    }
    for (const date of spinoffDates) {
      if (result.some(r => r.type === 'spinoff' && r.date === date)) continue
      // priceEUR = 0 → Marker landet auf der Kurslinie am Spin-off-Tag
      result.push({ date, priceEUR: 0, quantity: 0, label: 'SO', type: 'spinoff' })
    }

    return result
  }, [allTransactions])

  // Aktueller EUR-Preis
  const currentPriceEUR = useMemo(() => {
    if (!history.length) return null
    const latestPrice = history[history.length - 1].close
    if (historyInEUR) return latestPrice
    if (isEURStock) return latestPrice
    if (isGBXStock && gbpEurRate) return (latestPrice / 100) * gbpEurRate
    if (!eurRate) return null
    return latestPrice * eurRate
  }, [history, eurRate, gbpEurRate, historyInEUR, isEURStock, isGBXStock])

  const totalReturnPercent = useMemo(() => {
    if (!performance || performance.totalInvested <= 0) return 0
    return (performance.totalReturn / performance.totalInvested) * 100
  }, [performance])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  const handleBack = () => {
    if (returnTo?.startsWith('/analyse/portfolio/')) {
      router.push(returnTo)
      return
    }

    if (portfolioId) {
      router.push(`/analyse/portfolio/workspace?depot=${portfolioId === 'all' ? 'all' : portfolioId}&view=positions`)
    } else {
      router.back()
    }
  }

  // Ordergebühren aller Buchungen (Kaufgebühren stecken bereits in der Kostenbasis)
  const totalFees = allTransactions.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0)
  const isClosed = !!performance && performance.remainingQuantity === 0
  const hasReturnBreakdown =
    !!performance && (performance.totalRealizedGain !== 0 || performance.totalDividends > 0 || totalFees > 0)
  const depotLabel = !portfolioId || portfolioId === 'all' ? 'Alle Depots' : null

  // ETF-Kosten: nur mit bekannter TER und offener Position berechenbar
  const etfYearCost =
    etfInfo?.ter !== undefined && performance && performance.currentValue > 0
      ? calculateTERCost(performance.currentValue, etfInfo.ter)
      : null
  const etfSavings =
    etfInfo?.ter !== undefined && etfInfo.ter > 0.20 && performance && performance.currentValue > 0
      ? calculateTERSavings(performance.currentValue, etfInfo.ter)
      : null
  const showEtfSavings = !!etfSavings && etfSavings.savingsPerYear >= 1

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary">
      {/* Kopfzeile — gleiche Optik wie im Portfolio-Workspace */}
      <header className="sticky top-0 z-50 border-b border-theme bg-theme-primary">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Zurück zum Portfolio"
              aria-label="Zurück zum Portfolio"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <Logo ticker={ticker} alt={ticker} className="h-6 w-6 shrink-0 rounded-md" padding="none" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-theme-primary">
                {stockName || ticker}
              </p>
              <p className="truncate text-[11px] text-theme-muted">
                {ticker}{depotLabel ? ` · ${depotLabel}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
          >
            Zum Portfolio
          </button>
        </div>
      </header>

      <main className="w-full px-6 py-5 pb-20 lg:px-8">
        {loading ? (
          <StockDetailSkeleton />
        ) : (
          <>
            {/* Titelzeile mit den Kernzahlen — analog zur Depot-Kopfzeile */}
            <section className="mb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-xl font-semibold text-theme-primary">{stockName || ticker}</h1>
                    <span className="text-sm text-neutral-500">
                      {ticker}
                      {allTransactions.length > 0 && (
                        <> · {allTransactions.length} Buchung{allTransactions.length === 1 ? '' : 'en'}</>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-2xl font-semibold text-theme-primary tabular-nums">
                      {currentPriceEUR !== null ? formatCurrency(currentPriceEUR) : '–'}
                    </span>
                    {performance && (
                      <>
                        <span className={`text-sm font-medium tabular-nums ${perfColor(performance.totalReturn)}`}>
                          {performance.totalReturn >= 0 ? '+' : ''}{formatCurrency(performance.totalReturn)} · {formatPercentage(totalReturnPercent)}
                        </span>
                        <span className="text-sm text-neutral-500">gesamt</span>
                      </>
                    )}
                  </div>
                </div>

                {performance && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[11px] text-neutral-500">Bestand</p>
                      <p className="text-sm font-medium text-theme-primary tabular-nums">
                        {isClosed ? 'Verkauft' : `${formatQuantity(performance.remainingQuantity)} Stk.`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-neutral-500">Ø Einstand</p>
                      <p className="text-sm font-medium text-theme-primary tabular-nums">
                        {performance.currentAvgCostBasis > 0 ? formatCurrency(performance.currentAvgCostBasis) : '–'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-neutral-500">Depotanteil</p>
                      <p className="text-sm font-medium text-theme-primary tabular-nums">
                        {allocation !== null ? `${allocation.toFixed(1)} %` : '–'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-4">
              {/* Kennzahlen */}
              {performance && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className={STAT_CARD}>
                    <p className="mb-1 text-xs text-neutral-500">Positionswert</p>
                    {isClosed ? (
                      <>
                        <p className="text-lg font-semibold text-neutral-500 dark:text-neutral-400">Geschlossen</p>
                        <p className="mt-1 text-xs text-neutral-500">Position vollständig verkauft</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold text-theme-primary tabular-nums">
                          {formatCurrency(performance.currentValue)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500 tabular-nums">
                          {formatQuantity(performance.remainingQuantity)} Stk.
                          {allocation !== null && <> · {allocation.toFixed(1)} % Depotanteil</>}
                        </p>
                      </>
                    )}
                  </div>

                  <div className={STAT_CARD}>
                    <p className="mb-1 text-xs text-neutral-500">
                      {isClosed ? 'Realisierter Kursgewinn' : 'Kursgewinn'}
                    </p>
                    {isClosed ? (
                      <>
                        <p className={`text-lg font-semibold tabular-nums ${perfColor(performance.totalRealizedGain)}`}>
                          {performance.totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(performance.totalRealizedGain)}
                        </p>
                        {performance.totalInvested > 0 && (
                          <p className={`mt-1 text-xs tabular-nums ${perfColor(performance.totalRealizedGain, 'muted')}`}>
                            {formatPercentage((performance.totalRealizedGain / performance.totalInvested) * 100)} auf den Einsatz
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className={`text-lg font-semibold tabular-nums ${perfColor(performance.unrealizedGain)}`}>
                          {performance.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(performance.unrealizedGain)}
                        </p>
                        <p className={`mt-1 text-xs tabular-nums ${perfColor(performance.unrealizedGainPercent, 'muted')}`}>
                          {formatPercentage(performance.unrealizedGainPercent)} unrealisiert
                        </p>
                      </>
                    )}
                  </div>

                  <div className={STAT_CARD}>
                    <p className="mb-1 text-xs text-neutral-500">Gesamtrendite</p>
                    <p className={`text-lg font-semibold tabular-nums ${perfColor(performance.totalReturn)}`}>
                      {performance.totalReturn >= 0 ? '+' : ''}{formatCurrency(performance.totalReturn)}
                    </p>
                    <p className={`mt-1 text-xs tabular-nums ${perfColor(totalReturnPercent, 'muted')}`}>
                      {formatPercentage(totalReturnPercent)} gesamt
                    </p>

                    {hasReturnBreakdown && (
                      <div className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2 dark:border-white/[0.05]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-neutral-500">Kursgewinn</span>
                          <span className={`tabular-nums ${perfColor(performance.unrealizedGain, 'muted')}`}>
                            {performance.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(performance.unrealizedGain)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-neutral-500">Realisiert</span>
                          <span className={`tabular-nums ${perfColor(performance.totalRealizedGain, 'muted')}`}>
                            {performance.totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(performance.totalRealizedGain)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-neutral-500">Dividenden</span>
                          <span className="tabular-nums text-emerald-600/70 dark:text-emerald-400/70">
                            +{formatCurrency(performance.totalDividends)}
                          </span>
                        </div>
                        {totalFees > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-neutral-500">Ordergebühren</span>
                            <span className="tabular-nums text-amber-600/70 dark:text-amber-400/70">
                              -{formatCurrency(totalFees)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={STAT_CARD}>
                    <p className="mb-1 text-xs text-neutral-500">Kostenbasis</p>
                    <p className="text-lg font-semibold text-theme-primary tabular-nums">
                      {formatCurrency(performance.totalCostBasis)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 tabular-nums">
                      {performance.currentAvgCostBasis > 0
                        ? `Ø ${formatCurrency(performance.currentAvgCostBasis)} je Stück`
                        : `${formatCurrency(performance.totalInvested)} investiert`}
                    </p>
                  </div>
                </div>
              )}

              {/* Chart + Positionsdetails */}
              <div className="grid gap-4 xl:grid-cols-[1.55fr,0.85fr]">
                {history.length > 0 ? (
                  <WorkingStockChart
                    ticker={ticker}
                    data={history}
                    purchaseMarkers={chartMarkers.length > 0 ? chartMarkers : undefined}
                    displayCurrency="EUR"
                    chartHeightClass="h-[280px] xl:h-[320px]"
                  />
                ) : (
                  <section className={`${CARD} flex min-h-[280px] items-center justify-center p-6 text-center`}>
                    <p className="text-sm text-neutral-500">Keine Kursdaten verfügbar</p>
                  </section>
                )}

                <section className={`${CARD} p-5`}>
                  <h2 className="text-sm font-medium text-theme-primary">Positionsdetails</h2>
                  <p className="mt-1 text-xs text-theme-muted">Alle Werte in Euro</p>

                  <div className="mt-4 divide-y divide-neutral-100 dark:divide-white/[0.05]">
                    <DetailRow
                      label="Aktueller Kurs"
                      value={currentPriceEUR !== null ? formatCurrency(currentPriceEUR) : '–'}
                    />
                    {performance && (
                      <>
                        <DetailRow
                          label="Ø Einstand"
                          value={performance.currentAvgCostBasis > 0 ? formatCurrency(performance.currentAvgCostBasis) : '–'}
                        />
                        <DetailRow
                          label="Bestand"
                          value={isClosed ? 'Verkauft' : `${formatQuantity(performance.remainingQuantity)} Stk.`}
                        />
                        <DetailRow label="Kostenbasis" value={formatCurrency(performance.totalCostBasis)} />
                        <DetailRow label="Investiert gesamt" value={formatCurrency(performance.totalInvested)} />
                        <DetailRow
                          label="Realisiert"
                          value={`${performance.totalRealizedGain >= 0 ? '+' : ''}${formatCurrency(performance.totalRealizedGain)}`}
                          valueClass={performance.totalRealizedGain !== 0 ? perfColor(performance.totalRealizedGain) : 'text-neutral-500'}
                        />
                        <DetailRow
                          label="Dividenden"
                          value={`+${formatCurrency(performance.totalDividends)}`}
                          valueClass={performance.totalDividends > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}
                        />
                      </>
                    )}
                    {totalFees > 0 && (
                      <DetailRow
                        label="Ordergebühren"
                        value={`-${formatCurrency(totalFees)}`}
                        valueClass="text-amber-600 dark:text-amber-400"
                      />
                    )}
                    {allocation !== null && (
                      <DetailRow label="Depotanteil" value={`${allocation.toFixed(1)} %`} />
                    )}
                    {isMultiDepot && depotBreakdowns.length > 1 && (
                      <DetailRow label="Depots" value={`${depotBreakdowns.length}`} />
                    )}
                    {etfInfo?.ter !== undefined && (
                      <>
                        <DetailRow label="TER" value={formatTER(etfInfo.ter)} />
                        {etfYearCost !== null && (
                          <DetailRow label="Jährl. ETF-Kosten" value={formatCurrency(etfYearCost)} />
                        )}
                        {etfInfo.issuer && <DetailRow label="Anbieter" value={etfInfo.issuer} />}
                        {etfInfo.category && <DetailRow label="Kategorie" value={etfInfo.category} />}
                      </>
                    )}
                  </div>

                  {showEtfSavings && etfSavings && (
                    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
                      <div className="flex items-start gap-2.5">
                        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-amber-700 dark:text-amber-300">
                            Sparpotenzial: {formatCurrency(etfSavings.savingsPerYear)}/Jahr
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-theme-muted">
                            Mit einer TER von 0,20 % wären es {formatCurrency(etfSavings.savingsOver5Years)} über 5 Jahre
                            und {formatCurrency(etfSavings.savingsOver10Years)} über 10 Jahre.
                          </p>
                          <p className="mt-1.5 text-[10px] text-neutral-500">
                            Keine Anlageberatung. Tatsächliche Kosten können abweichen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Währungseffekt + Investment-Case */}
              <div className="grid gap-4 lg:grid-cols-2">
                  {fxSplit && Math.abs(fxSplit.plFromFx) > 0.01 && (
                    <section className={`${CARD} p-5`}>
                      <h2 className="text-sm font-medium text-theme-primary">Rendite-Aufschlüsselung</h2>
                      <p className="mt-1 text-xs text-theme-muted">Aktienkurs und Währung getrennt</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-theme bg-theme-secondary px-3.5 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-theme-primary">Kurs-Performance</p>
                            <p className="mt-0.5 text-[11px] text-neutral-500">
                              Wechselkurs seit Kauf unverändert gedacht
                            </p>
                          </div>
                          <p className={`shrink-0 text-sm font-semibold tabular-nums ${perfColor(fxSplit.plExclFx)}`}>
                            {fxSplit.plExclFx >= 0 ? '+' : ''}{formatCurrency(fxSplit.plExclFx)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-theme bg-theme-secondary px-3.5 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-theme-primary">Währungs-Effekt</p>
                            <p className="mt-0.5 text-[11px] text-neutral-500">
                              Nur aus der Wechselkurs-Bewegung seit Kauf
                            </p>
                          </div>
                          <p className={`shrink-0 text-sm font-semibold tabular-nums ${perfColor(fxSplit.plFromFx)}`}>
                            {fxSplit.plFromFx >= 0 ? '+' : ''}{formatCurrency(fxSplit.plFromFx)}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Investment-Case (geteilt mit mein-portfolio: gleiche DB-Spalten) */}
                  <InvestmentCaseCard ticker={ticker} portfolioId={portfolioId} />
              </div>

              {/* Aufschlüsselung nach Depot */}
              {isMultiDepot && depotBreakdowns.length > 1 && (
                <section className={`${CARD} p-5`}>
                  <h2 className="text-sm font-medium text-theme-primary">Aufschlüsselung nach Depot</h2>
                  <p className="mt-1 text-xs text-theme-muted">
                    {depotBreakdowns.length} Depots mit einer Position in {ticker}
                  </p>

                  <div className="mt-4">
                    <div className="hidden grid-cols-12 gap-4 px-2 pb-2 text-xs font-medium text-neutral-500 sm:grid">
                      <div className="col-span-4">Depot</div>
                      <div className="col-span-2 text-right">Bestand</div>
                      <div className="col-span-2 text-right">Kursgewinn</div>
                      <div className="col-span-2 text-right">Realisiert</div>
                      <div className="col-span-2 text-right">Dividenden</div>
                    </div>

                    {depotBreakdowns.map(depot => {
                      const brokerName = getBrokerDisplayName(depot.brokerType, depot.brokerName)
                      const brokerCol = getBrokerColor(depot.brokerType, depot.brokerColor)
                      const p = depot.performance

                      return (
                        <div
                          key={depot.portfolioId}
                          className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-neutral-100 px-2 py-3 last:border-b-0 dark:border-white/[0.05] sm:grid-cols-12 sm:items-center sm:gap-4"
                        >
                          <div className="col-span-2 flex min-w-0 items-center gap-2.5 sm:col-span-4">
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: brokerCol }}
                            />
                            <span className="truncate text-[13px] font-medium text-theme-primary">
                              {depot.portfolioName}
                            </span>
                            {brokerName !== depot.portfolioName && (
                              <span className="hidden truncate text-[11px] text-neutral-500 sm:inline">{brokerName}</span>
                            )}
                          </div>

                          <div className="sm:col-span-2 sm:text-right">
                            <p className="text-[11px] text-neutral-500 sm:hidden">Bestand</p>
                            <p className="text-[13px] text-theme-primary tabular-nums">
                              {p.remainingQuantity > 0 ? `${formatQuantity(p.remainingQuantity)} Stk.` : 'Verkauft'}
                            </p>
                          </div>

                          <div className="sm:col-span-2 sm:text-right">
                            <p className="text-[11px] text-neutral-500 sm:hidden">Kursgewinn</p>
                            <p className={`text-[13px] font-medium tabular-nums ${perfColor(p.unrealizedGain)}`}>
                              {p.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(p.unrealizedGain)}
                            </p>
                          </div>

                          <div className="sm:col-span-2 sm:text-right">
                            <p className="text-[11px] text-neutral-500 sm:hidden">Realisiert</p>
                            <p className={`text-[13px] tabular-nums ${p.totalRealizedGain !== 0 ? perfColor(p.totalRealizedGain) : 'text-neutral-500'}`}>
                              {p.totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(p.totalRealizedGain)}
                            </p>
                          </div>

                          <div className="sm:col-span-2 sm:text-right">
                            <p className="text-[11px] text-neutral-500 sm:hidden">Dividenden</p>
                            <p className={`text-[13px] tabular-nums ${p.totalDividends > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
                              +{formatCurrency(p.totalDividends)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Transaktionen */}
              {allTransactions.length > 0 && currentPriceEUR !== null && performance ? (
                <section className={`${CARD} p-5`}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-medium text-theme-primary">Transaktionen</h2>
                      <p className="mt-1 text-xs text-theme-muted">
                        {allTransactions.length} Buchung{allTransactions.length !== 1 ? 'en' : ''} · chronologisch ·
                        {' '}Kürzel wie im Chart
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-neutral-500">Ergebnis gesamt</p>
                      <p className={`whitespace-nowrap text-sm font-medium tabular-nums ${perfColor(performance.totalReturn)}`}>
                        {performance.totalReturn >= 0 ? '+' : ''}{formatCurrency(performance.totalReturn)}
                      </p>
                    </div>
                  </div>

                  <div className="hidden grid-cols-12 gap-4 px-2 pb-2 text-xs font-medium text-neutral-500 sm:grid">
                    <div className="col-span-3">Datum</div>
                    <div className="col-span-2">Typ</div>
                    <div className="col-span-3 text-right">Stück × Kurs</div>
                    <div className="col-span-2 text-right">Betrag</div>
                    <div className="col-span-2 text-right">Ergebnis</div>
                  </div>

                  {(() => {
                    const sorted = [...allTransactions].sort(
                      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                    )
                    // Laufende Nummern je Typ — gleiche Kürzel wie die Chart-Marker
                    const count = { buy: 0, sell: 0, dividend: 0, transfer: 0 }

                    return sorted.map(tx => {
                      let badge = ''
                      let badgeClass = ''
                      let typeLabel = ''
                      let typeClass = ''
                      let detail: string | null = null
                      let amount: string | null = null
                      let resultValue: number | null = null
                      let resultPercent: number | null = null

                      if (tx.type === 'buy') {
                        badge = `K${++count.buy}`
                        badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        typeLabel = 'Kauf'
                        typeClass = 'text-emerald-600/90 dark:text-emerald-400/80'
                        const cost = tx.quantity * tx.price
                        detail = `${formatQuantity(tx.quantity)} × ${formatCurrency(tx.price)}`
                        amount = formatCurrency(cost)
                        resultValue = tx.quantity * currentPriceEUR - cost
                        resultPercent = cost > 0 ? (resultValue / cost) * 100 : 0
                      } else if (tx.type === 'sell') {
                        badge = `V${++count.sell}`
                        badgeClass = 'bg-red-500/10 text-red-600 dark:text-red-400'
                        typeLabel = 'Verkauf'
                        typeClass = 'text-red-600/90 dark:text-red-400/80'
                        const rgInfo = performance.realizedGainByTxId.get(tx.id)
                        detail = `${formatQuantity(tx.quantity)} × ${formatCurrency(tx.price)}`
                        amount = formatCurrency(tx.quantity * tx.price)
                        resultValue = rgInfo?.realizedGain ?? 0
                        resultPercent = rgInfo?.realizedGainPercent ?? 0
                      } else if (tx.type === 'dividend') {
                        badge = `D${++count.dividend}`
                        badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        typeLabel = 'Dividende'
                        typeClass = 'text-blue-600/90 dark:text-blue-400/80'
                        resultValue = tx.total_value
                      } else {
                        const isIn = tx.type === 'transfer_in'
                        badge = `T${++count.transfer}`
                        badgeClass = 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        typeLabel = isIn ? 'Einbuchung' : 'Ausbuchung'
                        typeClass = 'text-violet-600/90 dark:text-violet-400/80'
                        detail = `${formatQuantity(tx.quantity)} × ${formatCurrency(tx.price)}`
                        amount = formatCurrency(tx.quantity * tx.price)
                      }

                      return (
                        <div
                          key={tx.id}
                          className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border-b border-neutral-100 px-2 py-2.5 transition-colors last:border-b-0 hover:bg-neutral-50 dark:border-white/[0.05] dark:hover:bg-white/[0.04] sm:grid-cols-12 sm:items-center sm:gap-4"
                        >
                          <div className="col-span-2 flex items-center gap-2.5 sm:col-span-3">
                            <span
                              className={`inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-md px-1 text-[10px] font-semibold tabular-nums ${badgeClass}`}
                            >
                              {badge}
                            </span>
                            <span className="text-[12px] text-neutral-500 tabular-nums">{formatDate(tx.date)}</span>
                            <span className={`text-[12px] font-medium sm:hidden ${typeClass}`}>{typeLabel}</span>
                          </div>

                          <div className={`hidden text-[12px] font-medium sm:col-span-2 sm:block ${typeClass}`}>
                            {typeLabel}
                          </div>

                          <div className="text-[12px] text-neutral-500 tabular-nums sm:col-span-3 sm:text-right">
                            {detail ?? '–'}
                          </div>

                          <div className="hidden text-[12px] text-theme-primary tabular-nums sm:col-span-2 sm:block sm:text-right">
                            {amount ?? '–'}
                          </div>

                          <div className="text-right sm:col-span-2">
                            {resultValue !== null ? (
                              <>
                                <p className={`text-[13px] font-semibold tabular-nums ${perfColor(resultValue)}`}>
                                  {resultValue >= 0 ? '+' : ''}{formatCurrency(resultValue)}
                                </p>
                                {resultPercent !== null && (
                                  <p className={`text-[10px] tabular-nums ${perfColor(resultPercent, 'muted')}`}>
                                    {formatPercentage(resultPercent)}
                                  </p>
                                )}
                              </>
                            ) : (
                              // Übertrag: Betrag-Spalte ist mobil ausgeblendet → hier einblenden
                              <p className="text-[12px] text-neutral-500 tabular-nums">
                                <span className="sm:hidden">{amount ?? '–'}</span>
                                <span className="hidden sm:inline">–</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </section>
              ) : (
                allTransactions.length === 0 && (
                  <section className={`${CARD} border-dashed p-10 text-center`}>
                    <p className="text-[13px] text-neutral-500">Keine Transaktionen für {ticker} vorhanden.</p>
                  </section>
                )
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
