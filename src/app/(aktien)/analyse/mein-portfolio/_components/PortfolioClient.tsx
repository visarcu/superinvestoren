'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePortfolio } from '@/hooks/usePortfolio'
import PortfolioHeader from './PortfolioHeader'
import PortfolioValueHero from './PortfolioValueHero'
import PortfolioTabs from './PortfolioTabs'
import HoldingsTab from './HoldingsTab'
import TransactionsTab from './TransactionsTab'
import DividendsTab from './DividendsTab'
import type { Tab } from '../_lib/types'

export default function PortfolioClient() {
  const router = useRouter()
  const pathname = usePathname()

  const {
    portfolio,
    allPortfolios,
    holdings,
    transactions,
    isAllDepotsView,
    totalValue,
    cashPosition,
    totalGainLoss,
    totalGainLossPercent,
    totalDividends,
    totalRealizedGain,
    loading,
    formatCurrency,
    formatStockPrice,
    formatPercentage,
  } = usePortfolio()

  const [tab, setTab] = useState<Tab>('holdings')

  // Tab aus URL synchronisieren (für Deep-Links / Browser-Back)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    if (t === 'transaktionen' || t === 'dividenden') setTab(t)
  }, [])

  // Tag-Performance aus Holdings (current_price - purchase_price entspricht NICHT Tagesänderung —
  // wir holen die Tagesänderung später aus dem Quote-Stream. Für Phase A reichen 0/0, weil das
  // Hero-Komponent gracefully handelt; echte Tagesänderung kommt mit dem Quote-Refresh-Stream
  // den der Hook ohnehin schon laufen hat).
  const todayChange = useMemo(() => {
    return holdings.reduce((sum, h) => {
      // Hook liefert keine separate "change"-Spalte → 0 als Fallback. Production-Page
      // berechnet das aus quote.change × quantity; das wird in Phase B (Quote-Stream) ergänzt.
      return sum + 0 * h.quantity
    }, 0)
  }, [holdings])

  const todayChangePercent = useMemo(() => {
    if (totalValue <= 0) return 0
    const yesterdayValue = totalValue - todayChange
    return yesterdayValue > 0 ? (todayChange / yesterdayValue) * 100 : 0
  }, [todayChange, totalValue])

  // Depot-Switcher → URL ?depot=<id> oder ?depot=all
  const handleSelectPortfolio = (id: string | null) => {
    const params = new URLSearchParams(window.location.search)
    if (id === null) {
      params.set('depot', 'all')
    } else {
      params.set('depot', id)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[#06060e] text-white flex flex-col">
      <PortfolioHeader
        portfolios={allPortfolios}
        activePortfolio={portfolio}
        isAllDepotsView={isAllDepotsView}
        onSelectPortfolio={handleSelectPortfolio}
      />

      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 py-6">
        <PortfolioValueHero
          loading={loading}
          hasHoldings={holdings.length > 0}
          totalValue={totalValue}
          totalGainLoss={totalGainLoss}
          totalGainLossPercent={totalGainLossPercent}
          todayChange={todayChange}
          todayChangePercent={todayChangePercent}
          cashPosition={cashPosition}
          totalDividends={totalDividends}
          totalRealizedGain={totalRealizedGain}
          positionsCount={holdings.length}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      </div>

      <PortfolioTabs tab={tab} onChange={setTab} />

      <main className="flex-1 px-6 sm:px-10 py-6 pb-32 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : tab === 'holdings' ? (
          <HoldingsTab
            holdings={holdings}
            totalValue={totalValue}
            isAllDepotsView={isAllDepotsView}
            formatCurrency={formatCurrency}
            formatStockPrice={formatStockPrice}
            formatPercentage={formatPercentage}
          />
        ) : tab === 'transaktionen' ? (
          <TransactionsTab transactions={transactions} formatCurrency={formatCurrency} />
        ) : tab === 'dividenden' ? (
          <DividendsTab
            transactions={transactions}
            totalDividends={totalDividends}
            formatCurrency={formatCurrency}
          />
        ) : null}
      </main>
    </div>
  )
}
