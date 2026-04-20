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
import PortfolioAllocation from './PortfolioAllocation'
import PortfolioValueChart from './PortfolioValueChart'
import SoldPositions from './SoldPositions'
import AddFAB from './AddFAB'
import AddPositionModal from './AddPositionModal'
import AddActivityModal from './AddActivityModal'
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
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [showAddActivity, setShowAddActivity] = useState(false)

  // Tag-Quotes (separater Quote-Stream für die "Heute"-Performance im Hero).
  // usePortfolio liefert nur den Closing-Wert pro Holding, keine Tagesänderung.
  // Wir aggregieren change × quantity zur Portfolio-Tagesperformance.
  const [dayChangeBySymbol, setDayChangeBySymbol] = useState<Record<string, number>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    if (t === 'transaktionen' || t === 'dividenden') setTab(t)
  }, [])

  // Quote-Stream für Tagesänderungen (initial + alle 30s)
  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map(h => h.symbol))].join(',')
    let cancelled = false

    const fetchChanges = () => {
      fetch(`/api/v1/quotes/batch?symbols=${symbols}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (cancelled || !data?.quotes) return
          const map: Record<string, number> = {}
          for (const q of data.quotes) {
            if (typeof q.change === 'number') map[q.symbol] = q.change
          }
          setDayChangeBySymbol(map)
        })
        .catch(() => {})
    }

    fetchChanges()
    const interval = setInterval(fetchChanges, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [holdings])

  // Tagesperformance aggregiert (in Quote-Währung; Multi-Currency-Konvertierung kommt
  // mit Phase C / Historical-Endpoint. Für US-only Portfolios und reine EUR-Portfolios
  // ist die Aggregation aktuell korrekt.)
  const todayChange = useMemo(() => {
    return holdings.reduce((sum, h) => {
      const change = dayChangeBySymbol[h.symbol]
      return change !== undefined ? sum + change * h.quantity : sum
    }, 0)
  }, [holdings, dayChangeBySymbol])

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

        {/* Wertentwicklungs-Chart (auch in "Alle Depots" Ansicht) */}
        {!loading && holdings.length > 0 && (
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
        )}
      </div>

      <PortfolioTabs tab={tab} onChange={setTab} />

      <main className="flex-1 px-6 sm:px-10 py-6 pb-32 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : tab === 'holdings' ? (
          <>
            <HoldingsTab
              holdings={holdings}
              totalValue={totalValue}
              isAllDepotsView={isAllDepotsView}
              formatCurrency={formatCurrency}
              formatStockPrice={formatStockPrice}
              formatPercentage={formatPercentage}
            />
            {holdings.length > 0 && (
              <PortfolioAllocation
                holdings={holdings}
                cashPosition={cashPosition}
                formatCurrency={formatCurrency}
              />
            )}
            <SoldPositions
              transactions={transactions}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
            />
          </>
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

      {/* FAB + Modals */}
      {!loading && (
        <AddFAB
          onAddPosition={() => setShowAddPosition(true)}
          onAddActivity={() => setShowAddActivity(true)}
        />
      )}
      <AddPositionModal open={showAddPosition} onClose={() => setShowAddPosition(false)} />
      <AddActivityModal open={showAddActivity} onClose={() => setShowAddActivity(false)} />
    </div>
  )
}
