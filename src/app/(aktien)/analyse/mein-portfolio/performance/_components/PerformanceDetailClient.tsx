'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/hooks/usePortfolio'
import PortfolioValueChart from '../../_components/PortfolioValueChart'
import PerformanceStatsGrid from './PerformanceStatsGrid'
import BestWorstPositions from './BestWorstPositions'

export default function PerformanceDetailClient() {
  const router = useRouter()
  const {
    holdings,
    transactions,
    allPortfolios,
    portfolio,
    isAllDepotsView,
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercent,
    totalRealizedGain,
    totalDividends,
    totalReturn,
    totalReturnPercent,
    xirrPercent,
    cashPosition,
    loading,
    formatCurrency,
    formatPercentage,
  } = usePortfolio()

  const dividends = useMemo(() => transactions.filter(t => t.type === 'dividend'), [transactions])

  return (
    <div className="min-h-screen bg-[#06060e] text-white flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center gap-4 border-b border-white/[0.03] max-w-6xl mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          aria-label="Zurück"
        >
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Performance</h1>
          <p className="text-[12px] text-white/25">
            {isAllDepotsView ? 'Alle Depots' : portfolio?.name ?? '–'}
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 py-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/30 text-[14px]">Keine Performance-Daten</p>
            <p className="text-white/30 text-[12px] mt-1">Füge erst Positionen hinzu.</p>
          </div>
        ) : (
          <>
            <PerformanceStatsGrid
              totalValue={totalValue}
              totalInvested={totalInvested}
              totalGainLoss={totalGainLoss}
              totalGainLossPercent={totalGainLossPercent}
              totalRealizedGain={totalRealizedGain}
              totalDividends={totalDividends}
              totalReturn={totalReturn}
              totalReturnPercent={totalReturnPercent}
              xirrPercent={xirrPercent}
              dividendCount={dividends.length}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
            />

            <PortfolioValueChart
              portfolioId={portfolio?.id ?? null}
              portfolioIds={isAllDepotsView ? allPortfolios.map(p => p.id) : undefined}
              holdings={holdings.map(h => ({
                symbol: h.symbol,
                quantity: h.quantity,
                purchase_price: h.purchase_price,
                purchase_date: h.purchase_date,
              }))}
              cashPosition={cashPosition}
              formatCurrency={formatCurrency}
            />

            <BestWorstPositions holdings={holdings} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
          </>
        )}
      </div>
    </div>
  )
}
