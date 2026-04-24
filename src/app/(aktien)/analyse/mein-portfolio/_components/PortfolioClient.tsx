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
import AnalysisTab from './AnalysisTab'
import PortfolioAllocation from './PortfolioAllocation'
import PortfolioValueChart from './PortfolioValueChart'
import EarningsPreviewCard from './EarningsPreviewCard'
import SoldPositions from './SoldPositions'
import AddFAB from './AddFAB'
import AddPositionModal from './AddPositionModal'
import AddActivityModal from './AddActivityModal'
import ImportWizardModal from './import/ImportWizardModal'
import EditPositionModal from './EditPositionModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import EditTransactionModal from './EditTransactionModal'
import DeleteTransactionModal from './DeleteTransactionModal'
import type { Holding, Tab, Transaction } from '../_lib/types'

export interface SuperInvestorOverlap {
  count: number
  investors: { name: string; slug: string }[]
}

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
    stockValue,
    cashPosition,
    totalGainLoss,
    totalGainLossPercent,
    totalDividends,
    totalRealizedGain,
    totalFees,
    totalReturn,
    totalReturnPercent,
    xirrPercent,
    realizedGainByTxId,
    loading,
    formatCurrency,
    formatStockPrice,
    formatPercentage,
  } = usePortfolio()

  const [tab, setTab] = useState<Tab>('holdings')
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [activityDefault, setActivityDefault] = useState<{
    activity: 'sell' | 'topup' | 'dividend' | 'cash' | 'transfer'
    holdingId?: string
  }>({ activity: 'sell' })
  const [showImport, setShowImport] = useState(false)
  const [editHolding, setEditHolding] = useState<Holding | null>(null)
  const [deleteHolding, setDeleteHolding] = useState<Holding | null>(null)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteTransactionState, setDeleteTransactionState] = useState<Transaction | null>(null)

  // Tag-Quotes (separater Quote-Stream für die "Heute"-Performance im Hero).
  const [dayChangeBySymbol, setDayChangeBySymbol] = useState<Record<string, number>>({})
  const [dayChangePercentBySymbol, setDayChangePercentBySymbol] = useState<Record<string, number>>({})
  // Superinvestor-Overlap pro Symbol (einmalig pro Ticker-Set gefetcht)
  const [overlapBySymbol, setOverlapBySymbol] = useState<Record<string, SuperInvestorOverlap>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    if (t === 'transaktionen' || t === 'dividenden' || t === 'analyse') setTab(t)
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
          const changeMap: Record<string, number> = {}
          const pctMap: Record<string, number> = {}
          for (const q of data.quotes) {
            if (typeof q.change === 'number') changeMap[q.symbol] = q.change
            if (typeof q.changePercent === 'number') pctMap[q.symbol] = q.changePercent
          }
          setDayChangeBySymbol(changeMap)
          setDayChangePercentBySymbol(pctMap)
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

  // Superinvestor-Overlap — einmal pro Ticker-Set fetchen (Cache serverseitig)
  useEffect(() => {
    if (holdings.length === 0) {
      setOverlapBySymbol({})
      return
    }
    const tickers = [...new Set(holdings.map(h => h.symbol))]
    let cancelled = false

    fetch('/api/portfolio/super-investor-overlap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setOverlapBySymbol(data as Record<string, SuperInvestorOverlap>)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [holdings])

  // Tagesperformance aggregiert
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

  const handleSelectPortfolio = (id: string | null) => {
    const params = new URLSearchParams(window.location.search)
    if (id === null) {
      params.set('depot', 'all')
    } else {
      params.set('depot', id)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const openActivity = (
    activity: 'sell' | 'topup' | 'dividend' | 'cash' | 'transfer',
    holdingId?: string
  ) => {
    setActivityDefault({ activity, holdingId })
    setShowAddActivity(true)
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
          stockValue={stockValue}
          totalValue={totalValue}
          totalGainLoss={totalGainLoss}
          totalGainLossPercent={totalGainLossPercent}
          totalReturn={totalReturn}
          totalReturnPercent={totalReturnPercent}
          todayChange={todayChange}
          todayChangePercent={todayChangePercent}
          cashPosition={cashPosition}
          brokerCredit={portfolio?.broker_credit ?? 0}
          totalDividends={totalDividends}
          totalRealizedGain={totalRealizedGain}
          totalFees={totalFees}
          xirrPercent={xirrPercent}
          positionsCount={holdings.length}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />

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

        {!loading && holdings.length > 0 && (
          <EarningsPreviewCard
            symbols={[...new Set(holdings.map(h => h.symbol))]}
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
              dayChangeBySymbol={dayChangeBySymbol}
              dayChangePercentBySymbol={dayChangePercentBySymbol}
              overlapBySymbol={overlapBySymbol}
              formatCurrency={formatCurrency}
              formatStockPrice={formatStockPrice}
              formatPercentage={formatPercentage}
              onTopUp={h => openActivity('topup', h.id)}
              onSell={h => openActivity('sell', h.id)}
              onAddDividend={h => openActivity('dividend', h.id)}
              onEdit={h => setEditHolding(h)}
              onDelete={h => setDeleteHolding(h)}
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
          <TransactionsTab
            transactions={transactions}
            realizedGainByTxId={realizedGainByTxId}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
            onEdit={t => setEditTransaction(t)}
            onDelete={t => setDeleteTransactionState(t)}
          />
        ) : tab === 'dividenden' ? (
          <DividendsTab
            transactions={transactions}
            totalDividends={totalDividends}
            formatCurrency={formatCurrency}
          />
        ) : tab === 'analyse' ? (
          <AnalysisTab
            holdings={holdings}
            cashPosition={cashPosition}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        ) : null}
      </main>

      {/* FAB + Modals */}
      {!loading && (
        <AddFAB
          onAddPosition={() => setShowAddPosition(true)}
          onAddActivity={() => {
            setActivityDefault({ activity: 'sell' })
            setShowAddActivity(true)
          }}
          onImport={() => setShowImport(true)}
        />
      )}
      <AddPositionModal open={showAddPosition} onClose={() => setShowAddPosition(false)} />
      <AddActivityModal
        open={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        defaultActivity={activityDefault.activity}
        defaultHoldingId={activityDefault.holdingId}
      />
      <ImportWizardModal open={showImport} onClose={() => setShowImport(false)} />
      <EditPositionModal
        holding={editHolding}
        onClose={() => setEditHolding(null)}
      />
      <DeleteConfirmModal
        holding={deleteHolding}
        onClose={() => setDeleteHolding(null)}
      />
      <EditTransactionModal
        transaction={editTransaction}
        onClose={() => setEditTransaction(null)}
      />
      <DeleteTransactionModal
        transaction={deleteTransactionState}
        onClose={() => setDeleteTransactionState(null)}
      />
    </div>
  )
}
