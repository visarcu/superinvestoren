'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { calculateSymbolPerformance, type SymbolPerformance } from '@/utils/portfolioCalculations'
import StockDetailHeader from './StockDetailHeader'
import StockPerformanceCard from './StockPerformanceCard'
import StockHistoryChart, { type PurchaseMarker } from './StockHistoryChart'
import StockTransactionsList from './StockTransactionsList'
import InvestmentCaseCard from './InvestmentCaseCard'

interface Props {
  ticker: string
}

interface PricePoint {
  date: string
  close: number
}

export default function PortfolioStockDetailClient({ ticker }: Props) {
  const {
    transactions,
    holdings,
    loading: portfolioLoading,
    formatCurrency,
    formatPercentage,
  } = usePortfolio()

  const [history, setHistory] = useState<PricePoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Transaktionen für diesen Ticker (aus dem Hook gefiltert — egal ob Single- oder Alle-Depots-Ansicht)
  const symbolTxs = useMemo(
    () => transactions.filter(t => (t.symbol || '').toUpperCase() === ticker.toUpperCase()),
    [transactions, ticker]
  )

  // Holding für aktuellen Wert / Name (aus aggregierten Holdings)
  const symbolHolding = useMemo(
    () => holdings.find(h => h.symbol.toUpperCase() === ticker.toUpperCase()),
    [holdings, ticker]
  )

  // Alle Holding-IDs für dieses Symbol (Multi-Depot: ein Symbol kann in mehreren
  // Depots vorkommen — der Investment-Case wird auf alle gleichzeitig geschrieben)
  const symbolHoldingIds = useMemo(
    () =>
      holdings
        .filter(h => h.symbol.toUpperCase() === ticker.toUpperCase())
        .map(h => h.id),
    [holdings, ticker]
  )

  // FX-Split aggregiert über alle Holdings dieses Symbols (Multi-Depot)
  const { plExclFx, plFromFx } = useMemo(() => {
    const relevant = holdings.filter(h => h.symbol.toUpperCase() === ticker.toUpperCase())
    let exclSum: number | null = null
    let fromSum: number | null = null
    let hasAny = false
    for (const h of relevant) {
      if (typeof h.pl_excl_fx === 'number' && typeof h.pl_from_fx === 'number') {
        exclSum = (exclSum ?? 0) + h.pl_excl_fx
        fromSum = (fromSum ?? 0) + h.pl_from_fx
        hasAny = true
      }
    }
    return hasAny ? { plExclFx: exclSum, plFromFx: fromSum } : { plExclFx: null, plFromFx: null }
  }, [holdings, ticker])

  const stockName = symbolHolding?.name || symbolTxs[0]?.name || ticker
  const currentPriceEUR = symbolHolding?.current_price ?? 0

  // Performance via Average-Cost-Method
  const performance: SymbolPerformance | null = useMemo(() => {
    if (symbolTxs.length === 0) return null
    return calculateSymbolPerformance(
      symbolTxs.map(t => ({
        id: t.id,
        type: t.type,
        quantity: t.quantity,
        price: t.price,
        total_value: t.total_value,
        date: t.date,
      })),
      currentPriceEUR
    )
  }, [symbolTxs, currentPriceEUR])

  // Historische Kurse holen
  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    fetch(`/api/v1/historical/${ticker}?days=730`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return
        const points: PricePoint[] = (data?.historical || [])
          .map((p: any) => ({ date: p.date, close: p.close }))
          .sort((a: PricePoint, b: PricePoint) => a.date.localeCompare(b.date))
        setHistory(points)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticker])

  // Marker aus den Transaktionen ableiten (Position auf echtem Preis, nicht auf Schlusskurs)
  const markers: PurchaseMarker[] = useMemo(() => {
    return symbolTxs
      .filter(t =>
        (['buy', 'sell', 'transfer_in', 'transfer_out', 'dividend'] as const).includes(
          t.type as any
        )
      )
      .map(t => ({
        date: t.date,
        priceEUR: t.price,
        quantity: t.quantity,
        type: t.type as PurchaseMarker['type'],
      }))
  }, [symbolTxs])

  const isLoading = portfolioLoading

  return (
    <div className="min-h-screen bg-[#06060e] text-white flex flex-col">
      <StockDetailHeader ticker={ticker} name={stockName} />

      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 pb-32">
        {!isLoading && symbolTxs.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/30 text-[14px]">Keine Transaktionen für {ticker}</p>
            <p className="text-white/30 text-[12px] mt-1">
              Diese Aktie ist nicht in deinem Portfolio.
            </p>
          </div>
        ) : (
          <>
            <StockPerformanceCard
              performance={performance}
              currentPriceEUR={currentPriceEUR}
              plExclFx={plExclFx}
              plFromFx={plFromFx}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
              loading={isLoading}
            />

            <InvestmentCaseCard holdingIds={symbolHoldingIds} ticker={ticker} />

            <StockHistoryChart
              history={history}
              markers={markers}
              formatCurrency={formatCurrency}
              loading={historyLoading}
            />

            <StockTransactionsList transactions={symbolTxs} formatCurrency={formatCurrency} />
          </>
        )}
      </div>
    </div>
  )
}
