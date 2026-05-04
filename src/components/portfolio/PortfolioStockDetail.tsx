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

// Lokale EUR-Formatter — Portfolio-Werte sind durchgehend in EUR umgerechnet,
// daher fix EUR hier (statt useCurrency, das initial USD als Default hat).
const formatStockPriceEUR = (price: number): string => {
  if (!price && price !== 0) return '–'
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
  return `${formatted} €`
}

const formatPercentageDE = (value: number, showSign = true): string => {
  if (!value && value !== 0) return '–'
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatted}%`
}

export default function PortfolioStockDetail({ ticker }: PortfolioStockDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const portfolioId = searchParams.get('portfolioId')
  const totalValueParam = parseFloat(searchParams.get('totalValue') || '0')
  const formatStockPrice = formatStockPriceEUR
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

  const tickerCurrency = useMemo(() => detectTickerCurrency(ticker), [ticker])
  const isEURStock = tickerCurrency === 'EUR'
  const isGBXStock = tickerCurrency === 'GBP' // .L Ticker → FMP liefert GBX (Pence)

  // Allokation berechnen
  const allocation = useMemo(() => {
    if (!totalValueParam || totalValueParam <= 0 || !performance) return null
    return (performance.currentValue / totalValueParam) * 100
  }, [totalValueParam, performance])

  // ETF-Info: Hook lädt Daten für unbekannte ETFs, danach findet getETFBySymbol sie im Cache
  const { loading: etfLoading, fetchedCount } = useETFInfo([ticker])
  const etfInfo = useMemo(() => getETFBySymbol(ticker), [ticker, fetchedCount])

  // Daten laden
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)

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
        if (histRes.ok) {
          const { historical = [] } = await histRes.json()
          historyData = (historical as any[])
            .slice()
            .reverse()
            .map((h: any) => ({ date: h.date, close: h.close }))

          // Cross-Validierung: Prüfe ob Live-Quote plausibel ist
          // FMP liefert für EU-ETFs oft veraltete Kurse → nur verwenden wenn
          // die Abweichung zum letzten historischen Close < 10% ist
          if (livePrice && livePrice > 0 && historyData.length > 0) {
            const lastHistClose = historyData[historyData.length - 1].close
            const deviation = Math.abs(livePrice - lastHistClose) / lastHistClose
            if (deviation > 0.10) {
              // Live-Quote weicht > 10% ab → wahrscheinlich veraltet, ignorieren
              livePrice = null
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
        if (isEURStock) {
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

        if (isAll) {
          // Multi-Depot: Alle Portfolios des Users laden
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || cancelled) return

          const { data: portfolios } = await supabase
            .from('portfolios')
            .select('id, name, broker_type, broker_name, broker_color')
            .eq('user_id', user.id)

          if (!portfolios || cancelled) return

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
  }, [ticker, portfolioId, isEURStock])

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
        transferInCount++
        result.push({
          date: tx.date,
          priceEUR: tx.price,
          quantity: tx.quantity,
          label: `E${transferInCount}`,
          type: 'buy',
        })
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

    return result
  }, [allTransactions])

  // Aktueller EUR-Preis
  const currentPriceEUR = useMemo(() => {
    if (!history.length) return null
    const latestPrice = history[history.length - 1].close
    if (isEURStock) return latestPrice
    if (isGBXStock && gbpEurRate) return (latestPrice / 100) * gbpEurRate
    if (!eurRate) return null
    return latestPrice * eurRate
  }, [history, eurRate, gbpEurRate, isEURStock, isGBXStock])

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
    if (portfolioId) {
      router.push(`/analyse/portfolio/dashboard?depot=${portfolioId}`)
    } else {
      router.back()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header — schlank mit Logo, Symbol, Name, aktueller Kurs */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 hover:bg-neutral-900/60 rounded-lg transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeftIcon className="w-4 h-4 text-neutral-400" />
          </button>
          <Logo ticker={ticker} alt={ticker} className="w-9 h-9" padding="none" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-white tracking-tight truncate">
              {stockName || ticker}
            </h1>
            <p className="text-[11px] text-neutral-500 tabular-nums">
              {ticker}
              {currentPriceEUR !== null && <> · {formatCurrency(currentPriceEUR)}</>}
            </p>
          </div>
        </div>

        {/* Performance Pill rechts */}
        {performance && currentPriceEUR !== null && (
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Gesamtrendite</p>
              <p className={`text-lg font-semibold tracking-tight tabular-nums ${perfColor(performance.totalReturn)}`}>
                {performance.totalReturn >= 0 ? '+' : ''}{formatCurrency(performance.totalReturn)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {history.length > 0 ? (
        <WorkingStockChart
          ticker={ticker}
          data={history}
          purchaseMarkers={chartMarkers.length > 0 ? chartMarkers : undefined}
        />
      ) : (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-12 text-center">
          <p className="text-[13px] text-neutral-500">Keine Kursdaten verfügbar</p>
        </div>
      )}

      {/* Performance Cards — als Grid mit border-Separators */}
      {performance && currentPriceEUR !== null && (
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-800/80 border border-neutral-800/80 rounded-xl overflow-hidden">
          {/* Kursgewinn — bei geschlossener Position den realisierten Kursgewinn zeigen */}
          <div className="bg-neutral-950 p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
              {performance.remainingQuantity === 0 ? 'Realisierter Kursgewinn' : 'Kursgewinn'}
            </p>
            {performance.remainingQuantity === 0 ? (
              <>
                <p className={`text-xl font-semibold tracking-tight tabular-nums ${perfColor(performance.totalRealizedGain)}`}>
                  {performance.totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(performance.totalRealizedGain)}
                </p>
                {performance.totalInvested > 0 && (
                  <p className={`text-[11px] tabular-nums mt-1 ${perfColor(performance.totalRealizedGain)}`}>
                    {performance.totalRealizedGain >= 0 ? '+' : ''}{((performance.totalRealizedGain / performance.totalInvested) * 100).toFixed(1)}%
                  </p>
                )}
              </>
            ) : (
              <>
                <p className={`text-xl font-semibold tracking-tight tabular-nums ${perfColor(performance.unrealizedGain)}`}>
                  {performance.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(performance.unrealizedGain)}
                </p>
                <p className={`text-[11px] tabular-nums mt-1 ${perfColor(performance.unrealizedGainPercent)}`}>
                  {performance.unrealizedGainPercent >= 0 ? '+' : ''}{performance.unrealizedGainPercent.toFixed(1)}%
                </p>
              </>
            )}
          </div>

          {/* Realisierte Gewinne */}
          <div className="bg-neutral-950 p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">Realisiert</p>
            <p className={`text-xl font-semibold tracking-tight tabular-nums ${performance.totalRealizedGain !== 0 ? perfColor(performance.totalRealizedGain) : 'text-neutral-600'}`}>
              {performance.totalRealizedGain !== 0
                ? `${performance.totalRealizedGain >= 0 ? '+' : ''}${formatCurrency(performance.totalRealizedGain)}`
                : formatCurrency(0)
              }
            </p>
          </div>

          {/* Dividenden */}
          <div className="bg-neutral-950 p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">Dividenden</p>
            <p className={`text-xl font-semibold tracking-tight tabular-nums ${performance.totalDividends > 0 ? 'text-emerald-400' : 'text-neutral-600'}`}>
              {performance.totalDividends > 0
                ? `+${formatCurrency(performance.totalDividends)}`
                : formatCurrency(0)
              }
            </p>
          </div>

          {/* Position / Wert */}
          <div className="bg-neutral-950 p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
              {performance.remainingQuantity === 0 ? 'Status' : 'Aktueller Wert'}
            </p>
            {performance.remainingQuantity === 0 ? (
              <>
                <p className="text-xl font-semibold text-neutral-400 tracking-tight">Geschlossen</p>
                <p className="text-[11px] text-neutral-500 mt-1">Position verkauft</p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-white tracking-tight tabular-nums">
                  {formatCurrency(performance.currentValue)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                  {performance.remainingQuantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.
                  {allocation !== null && <> · {allocation.toFixed(1)}%</>}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gebühren / Orderkosten */}
      {(() => {
        const totalFees = allTransactions.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0)
        if (totalFees <= 0) return null
        return (
          <div className="mt-2 px-4 py-2.5 bg-neutral-950 border border-neutral-800/80 rounded-xl flex items-center justify-between">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Ordergebühren gesamt</p>
            <p className="text-[13px] font-semibold text-amber-400/90 tabular-nums">
              {formatCurrency(totalFees)}
            </p>
          </div>
        )
      })()}

      {/* ETF TER-Kosten */}
      {etfInfo?.ter !== undefined && performance && performance.currentValue > 0 && (
        (() => {
          const yearCost = calculateTERCost(performance.currentValue, etfInfo.ter)
          const savings = calculateTERSavings(performance.currentValue, etfInfo.ter)
          const showSavings = etfInfo.ter > 0.20 && savings.savingsPerYear >= 1

          return (
            <div className="mt-5 bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
              <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">ETF-Kosten</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">TER</p>
                  <p className="text-[13px] font-semibold text-white tabular-nums">{formatTER(etfInfo.ter)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Jährl. Kosten</p>
                  <p className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(yearCost)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Anbieter</p>
                  <p className="text-[13px] font-semibold text-white truncate">{etfInfo.issuer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Kategorie</p>
                  <p className="text-[13px] font-semibold text-white truncate">{etfInfo.category}</p>
                </div>
              </div>

              {showSavings && (
                <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-amber-300 mb-1">
                        Sparpotenzial: {formatCurrency(savings.savingsPerYear)}/Jahr
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        Mit einer TER von 0,20% würdest du {formatCurrency(savings.savingsPerYear)}/Jahr sparen ({formatCurrency(savings.savingsOver5Years)} über 5 Jahre, {formatCurrency(savings.savingsOver10Years)} über 10 Jahre).
                      </p>
                      <p className="text-[10px] text-neutral-600 mt-2">
                        Keine Anlageberatung. Tatsächliche Kosten können abweichen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()
      )}

      {/* Multi-Depot Breakdown */}
      {isMultiDepot && depotBreakdowns.length > 1 && (
        <div className="mt-5">
          <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Aufschlüsselung nach Depot</h3>

          <div className="space-y-2">
            {depotBreakdowns.map((depot) => {
              const brokerName = getBrokerDisplayName(depot.brokerType, depot.brokerName)
              const brokerCol = getBrokerColor(depot.brokerType, depot.brokerColor)
              const p = depot.performance

              return (
                <div
                  key={depot.portfolioId}
                  className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-4"
                >
                  {/* Depot Header */}
                  <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-neutral-800/80">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: brokerCol }} />
                    <span className="text-[13px] font-semibold text-white">{depot.portfolioName}</span>
                    {brokerName !== depot.portfolioName && (
                      <span className="text-[11px] text-neutral-500">{brokerName}</span>
                    )}
                  </div>

                  {/* Depot Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Position</p>
                      <p className="text-[13px] font-semibold text-white tabular-nums">
                        {p.remainingQuantity > 0
                          ? `${p.remainingQuantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.`
                          : 'Verkauft'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Kursgewinn</p>
                      <p className={`text-[13px] font-semibold tabular-nums ${perfColor(p.unrealizedGain)}`}>
                        {p.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(p.unrealizedGain)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Realisiert</p>
                      <p className={`text-[13px] font-semibold tabular-nums ${p.totalRealizedGain !== 0 ? perfColor(p.totalRealizedGain) : 'text-neutral-600'}`}>
                        {p.totalRealizedGain !== 0
                          ? `${p.totalRealizedGain >= 0 ? '+' : ''}${formatCurrency(p.totalRealizedGain)}`
                          : formatCurrency(0)
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Dividenden</p>
                      <p className={`text-[13px] font-semibold tabular-nums ${p.totalDividends > 0 ? 'text-emerald-400' : 'text-neutral-600'}`}>
                        {p.totalDividends > 0 ? `+${formatCurrency(p.totalDividends)}` : formatCurrency(0)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaktionshistorie */}
      {allTransactions.length > 0 && currentPriceEUR !== null && performance && (
        <div className="mt-5 bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80">
            <h3 className="text-sm font-semibold text-white tracking-tight">Transaktionen</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {allTransactions.length} Buchung{allTransactions.length !== 1 ? 'en' : ''} · chronologisch
            </p>
          </div>

          <div>
            {(() => {
              const sorted = [...allTransactions].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
              )
              let buyIdx = 0
              let sellIdx = 0
              let divIdx = 0
              let transferIdx = 0

              return sorted.map((tx) => {
                if (tx.type === 'buy') {
                  buyIdx++
                  const label = `K${buyIdx}`
                  const cost = tx.quantity * tx.price
                  const value = tx.quantity * currentPriceEUR
                  const gainLoss = value - cost
                  const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0
                  const isPositive = gainLoss >= 0

                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[auto,1fr,1fr,auto] items-center gap-3 px-5 py-2.5 border-b border-neutral-800/60 hover:bg-neutral-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full tabular-nums">
                          {label}
                        </span>
                        <span className="text-[11px] text-neutral-500 tabular-nums">{formatDate(tx.date)}</span>
                      </div>
                      <span className="text-[11px] text-emerald-400/70 font-medium uppercase tracking-wider">Kauf</span>
                      <div className="text-[12px] text-neutral-300 tabular-nums text-right">
                        {tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} × {formatCurrency(tx.price)}
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className={`text-[13px] font-semibold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(gainLoss)}
                        </p>
                        <p className={`text-[10px] tabular-nums ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                          {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                }

                if (tx.type === 'sell') {
                  sellIdx++
                  const label = `V${sellIdx}`
                  const rgInfo = performance.realizedGainByTxId.get(tx.id)
                  const realizedGain = rgInfo?.realizedGain ?? 0
                  const realizedPercent = rgInfo?.realizedGainPercent ?? 0
                  const isPositive = realizedGain >= 0

                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[auto,1fr,1fr,auto] items-center gap-3 px-5 py-2.5 border-b border-neutral-800/60 hover:bg-neutral-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-full tabular-nums">
                          {label}
                        </span>
                        <span className="text-[11px] text-neutral-500 tabular-nums">{formatDate(tx.date)}</span>
                      </div>
                      <span className="text-[11px] text-red-400/70 font-medium uppercase tracking-wider">Verkauf</span>
                      <div className="text-[12px] text-neutral-300 tabular-nums text-right">
                        {tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} × {formatCurrency(tx.price)}
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className={`text-[13px] font-semibold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(realizedGain)}
                        </p>
                        <p className={`text-[10px] tabular-nums ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                          {isPositive ? '+' : ''}{realizedPercent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                }

                if (tx.type === 'dividend') {
                  divIdx++
                  const label = `D${divIdx}`

                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[auto,1fr,1fr,auto] items-center gap-3 px-5 py-2.5 border-b border-neutral-800/60 hover:bg-neutral-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full tabular-nums">
                          {label}
                        </span>
                        <span className="text-[11px] text-neutral-500 tabular-nums">{formatDate(tx.date)}</span>
                      </div>
                      <span className="text-[11px] text-blue-400/70 font-medium uppercase tracking-wider">Dividende</span>
                      <div />
                      <div className="text-right min-w-[100px]">
                        <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                          +{formatCurrency(tx.total_value)}
                        </p>
                      </div>
                    </div>
                  )
                }

                if (tx.type === 'transfer_in' || tx.type === 'transfer_out') {
                  transferIdx++
                  const label = `T${transferIdx}`
                  const isIn = tx.type === 'transfer_in'

                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[auto,1fr,1fr,auto] items-center gap-3 px-5 py-2.5 border-b border-neutral-800/60 hover:bg-neutral-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 flex items-center justify-center bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full tabular-nums">
                          {label}
                        </span>
                        <span className="text-[11px] text-neutral-500 tabular-nums">{formatDate(tx.date)}</span>
                      </div>
                      <span className="text-[11px] text-violet-400/70 font-medium uppercase tracking-wider">{isIn ? 'Einbuchung' : 'Ausbuchung'}</span>
                      <div className="text-[12px] text-neutral-300 tabular-nums text-right">
                        {tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} × {formatCurrency(tx.price)}
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-[12px] text-neutral-400 tabular-nums">
                          {formatCurrency(tx.quantity * tx.price)}
                        </p>
                      </div>
                    </div>
                  )
                }

                return null
              })
            })()}

            {/* Gesamt-Zeile */}
            {allTransactions.length > 1 && performance && (
              <div className="grid grid-cols-[auto,1fr,1fr,auto] items-center gap-3 px-5 py-3 bg-neutral-900/40">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 flex items-center justify-center bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold rounded-full">
                    Σ
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">Gesamt</span>
                </div>
                <div />
                <div className="text-[12px] text-neutral-300 tabular-nums text-right">
                  {performance.remainingQuantity > 0
                    ? `${performance.remainingQuantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.`
                    : 'Position geschlossen'
                  }
                </div>
                <div className="text-right min-w-[100px]">
                  <p className={`text-[13px] font-semibold tabular-nums ${perfColor(performance.totalReturn)}`}>
                    {performance.totalReturn >= 0 ? '+' : ''}{formatCurrency(performance.totalReturn)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keine Transaktionen */}
      {allTransactions.length === 0 && !loading && (
        <div className="mt-5 bg-neutral-900/30 rounded-xl border border-neutral-800/80 border-dashed p-10 text-center">
          <p className="text-[13px] text-neutral-500">Keine Transaktionen für {ticker} vorhanden.</p>
        </div>
      )}
    </div>
  )
}
