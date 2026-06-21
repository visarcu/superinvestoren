'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { usePortfolio } from '@/hooks/usePortfolio'
import QuickStats from '@/components/portfolio/QuickStats'
import PositionsTable from '@/components/portfolio/PositionsTable'
import PortfolioValueChart from '@/components/portfolio/PortfolioValueChart'
import PortfolioAllocation from '@/components/portfolio/PortfolioAllocation'
import TransactionsList from '@/components/portfolio/TransactionsList'
import AnalysisTab from '@/components/portfolio/AnalysisTab'
import DividendsTab from '@/components/portfolio/DividendsTab'
import AIAnalyseTab from '@/components/portfolio/AIAnalyseTab'
import RealizedGainsModal from '@/components/portfolio/RealizedGainsModal'
import { perfColor } from '@/utils/formatters'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChartPieIcon,
  CreditCardIcon,
  CpuChipIcon,
  DocumentTextIcon,
  PlusIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  WalletIcon,
} from '@heroicons/react/24/outline'

type WorkspaceView = 'overview' | 'positions' | 'analysis' | 'dividends' | 'transactions' | 'ai'

const ACTIVE_VIEWS: Array<{
  key: WorkspaceView
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}> = [
  { key: 'overview', label: 'Überblick', icon: Squares2X2Icon },
  { key: 'positions', label: 'Positionen', icon: RectangleGroupIcon },
  { key: 'analysis', label: 'Analyse', icon: ChartPieIcon },
  { key: 'dividends', label: 'Dividenden', icon: BanknotesIcon },
  { key: 'transactions', label: 'Transaktionen', icon: DocumentTextIcon },
  { key: 'ai', label: 'KI-Analyse', icon: CpuChipIcon },
]

type PortfolioNavItem = {
  key: string
  label: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  view?: WorkspaceView
  disabled?: boolean
}

const PORTFOLIO_NAV_ITEMS: PortfolioNavItem[] = [
  { key: 'overview', view: 'overview', label: 'Übersicht', description: 'Wert, Performance, Allokation', icon: Squares2X2Icon },
  { key: 'assets', label: 'Vermögen', description: 'Gesamtvermögen über alle Konten', icon: WalletIcon, disabled: true },
  { key: 'positions', view: 'positions', label: 'Positionen', description: 'Aktien, ETFs und Renditen', icon: RectangleGroupIcon },
  { key: 'accounts', label: 'Konten', description: 'Cash, Girokonto, Broker', icon: CreditCardIcon, disabled: true },
  { key: 'cashflow', label: 'Cashflow', description: 'Einnahmen und Ausgaben', icon: ArrowsRightLeftIcon, disabled: true },
  { key: 'dividends', view: 'dividends', label: 'Dividenden', description: 'Erträge und Prognosen', icon: BanknotesIcon },
  { key: 'transactions', view: 'transactions', label: 'Transaktionen', description: 'Käufe, Verkäufe, Cash', icon: DocumentTextIcon },
  { key: 'analysis', view: 'analysis', label: 'Analyse', description: 'Struktur und Konzentration', icon: ChartPieIcon },
  { key: 'ai', view: 'ai', label: 'KI-Analyse', description: 'Portfolio-Check', icon: CpuChipIcon },
  { key: 'settings', label: 'Einstellungen', description: 'Regeln, Konten, Kategorien', icon: Cog6ToothIcon, disabled: true },
]

function parseView(value: string | null): WorkspaceView {
  return ACTIVE_VIEWS.some(view => view.key === value) ? value as WorkspaceView : 'overview'
}

function PortfolioNavigation({
  activeView,
  onOpenView,
  compact = false,
}: {
  activeView: WorkspaceView
  onOpenView: (view: WorkspaceView) => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <nav className="sticky top-16 z-30 mb-5 rounded-2xl border border-white/[0.09] bg-[#08090a]/95 p-1.5 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden">
        <div className="flex gap-1 overflow-x-auto">
          {PORTFOLIO_NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = item.view === activeView
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => item.view && onOpenView(item.view)}
                disabled={item.disabled || !item.view}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/[0.09] text-theme-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : item.disabled
                      ? 'cursor-not-allowed text-neutral-600'
                      : 'text-neutral-300 hover:bg-white/[0.045] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.disabled && (
                  <span className="rounded-full border border-neutral-800 bg-neutral-950/60 px-1.5 py-0.5 text-[10px] text-neutral-500">
                    Bald
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-[276px] shrink-0 self-start rounded-2xl border border-white/[0.09] bg-[#08090a]/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:block">
      <div className="mb-4 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-teal-300/75">Portfolio</p>
        <p className="mt-1 text-xs text-theme-muted">Vermögen, Depots und Cashflow</p>
      </div>

      <div className="space-y-1">
        {PORTFOLIO_NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = item.view === activeView
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => item.view && onOpenView(item.view)}
              disabled={item.disabled || !item.view}
              className={`group flex w-full min-h-[56px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? 'border border-teal-300/25 bg-[linear-gradient(135deg,rgba(45,212,191,0.14),rgba(255,255,255,0.045))] text-theme-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                : item.disabled
                    ? 'cursor-not-allowed text-neutral-600'
                    : 'text-neutral-300 hover:bg-white/[0.055] hover:text-white'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                isActive
                  ? 'border-teal-300/20 bg-teal-400/10 text-teal-300'
                : item.disabled
                    ? 'border-neutral-900 bg-neutral-950/70 text-neutral-700'
                    : 'border-white/[0.07] bg-white/[0.045] text-neutral-400 group-hover:text-white'
              }`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {item.label}
                  {item.disabled && (
                    <span className="rounded-full border border-neutral-800 bg-neutral-950/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      Bald
                    </span>
                  )}
                </span>
                <span className={`mt-0.5 block truncate text-[11px] ${item.disabled ? 'text-neutral-700' : 'text-neutral-500'}`}>
                  {item.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function WorkspaceSkeleton() {
  return (
    <main className="w-full px-6 py-8 pb-24">
      <div className="mx-auto max-w-[1720px] animate-pulse">
        <div className="mb-8 h-36 rounded-2xl bg-white/[0.035] border border-white/[0.06]" />
        <div className="mb-6 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
        <div className="grid gap-5 lg:grid-cols-4">
          {[1, 2, 3, 4].map(item => (
            <div key={item} className="h-28 rounded-2xl bg-white/[0.035] border border-white/[0.06]" />
          ))}
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr,0.85fr]">
          <div className="h-[430px] rounded-2xl bg-white/[0.035] border border-white/[0.06]" />
          <div className="h-[430px] rounded-2xl bg-white/[0.035] border border-white/[0.06]" />
        </div>
      </div>
    </main>
  )
}

function EmptyPortfolio() {
  return (
    <div className="terminal-glass rounded-2xl p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-300/15 bg-teal-400/10">
        <ChartBarIcon className="h-7 w-7 text-teal-300" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-theme-primary">Noch keine Positionen</h2>
      <p className="mx-auto max-w-md text-sm text-theme-muted">
        Der Workspace ist für Analyse und Navigation gedacht. Neue Aktivitäten legst du aktuell noch im klassischen Dashboard an.
      </p>
      <Link
        href="/analyse/portfolio/dashboard?depot=all"
        className="mt-5 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.055] px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-white/[0.085]"
      >
        Zum Dashboard
      </Link>
    </div>
  )
}

export default function PortfolioWorkspacePage() {
  const p = usePortfolio()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showRealizedGains, setShowRealizedGains] = useState(false)
  const activeView = parseView(searchParams.get('view'))

  const selectedDepotId = searchParams.get('depot') || 'all'
  const dashboardHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('view')
    params.delete('sortBy')
    params.delete('sortDir')
    params.delete('range')
    return `/analyse/portfolio/dashboard${params.toString() ? `?${params.toString()}` : ''}`
  }, [searchParams])

  const selectedDepotName = p.isAllDepotsView
    ? 'Alle Depots'
    : p.portfolio?.name || 'Portfolio'

  const stockValue = useMemo(
    () => p.holdings.reduce((sum, holding) => sum + holding.value, 0),
    [p.holdings]
  )

  const topHolding = useMemo(
    () => [...p.holdings].sort((a, b) => b.value - a.value)[0],
    [p.holdings]
  )

  const openDepot = (depotId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('depot', depotId)
    params.set('view', activeView)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const openView = (view: WorkspaceView) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const noOp = () => undefined

  if (p.loading && !p.portfolio) return <WorkspaceSkeleton />
  const isSwitchingDepot = p.loading && !!p.portfolio

  return (
    <div className="min-h-screen bg-[#050506] text-theme-primary">
      <header className="sticky top-0 z-50 border-b border-white/[0.065] bg-[#070708]/94 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/analyse"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-theme-muted transition-colors hover:bg-white/[0.07] hover:text-theme-primary"
              title="Zurück ins Terminal"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10">
                <BriefcaseIcon className="h-4.5 w-4.5 text-teal-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold leading-tight text-theme-primary">Finclue Portfolio</p>
                  {isSwitchingDepot && (
                    <span className="rounded-full border border-teal-300/20 bg-teal-400/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                      Lädt
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-theme-muted">{selectedDepotName}</p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-medium text-theme-muted transition-colors hover:bg-white/[0.07] hover:text-theme-primary"
            >
              Klassisches Dashboard
            </Link>
            <Link
              href="/analyse/portfolio/depots"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-medium text-theme-muted transition-colors hover:bg-white/[0.07] hover:text-theme-primary"
            >
              Depots
            </Link>
            <Link
              href={`/analyse/portfolio/dashboard?depot=${p.depotIdParam}&tab=transactions`}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-400/15"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Aktivität
            </Link>
          </div>
        </div>
      </header>

      <div className="flex w-full gap-5 px-4 sm:px-6 xl:px-8">
        <PortfolioNavigation activeView={activeView} onOpenView={openView} />

        <main className="min-w-0 flex-1 py-6 pb-24">
      <div className="w-full">
        <section className="mb-5 overflow-hidden rounded-2xl border border-white/[0.09] bg-[linear-gradient(135deg,rgba(20,184,166,0.095),rgba(255,255,255,0.034)_36%,rgba(255,255,255,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_24px_90px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-6 px-6 py-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs font-medium text-theme-muted transition-colors hover:text-theme-primary hover:bg-white/[0.055]"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Klassisches Dashboard
                </Link>
                {p.exchangeRate && (
                  <button
                    type="button"
                    onClick={p.loadExchangeRate}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-theme-muted transition-colors hover:text-teal-300"
                  >
                    USD/EUR {p.exchangeRate.toFixed(4)}
                    <ArrowPathIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-teal-300/80">
                Portfolio Workspace
              </p>
              <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-theme-primary md:text-5xl">
                  {selectedDepotName}
                </h1>
                <div className="pb-1 text-sm text-theme-muted">
                  {p.activeInvestments} Position{p.activeInvestments === 1 ? '' : 'en'} · {p.transactions.length} Transaktionen
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="text-3xl font-semibold tracking-tight text-theme-primary tabular-nums">
                  {p.formatCurrency(p.totalValue)}
                </span>
                <span className={`text-sm font-medium tabular-nums ${perfColor(p.totalReturn)}`}>
                  {p.totalReturn >= 0 ? '+' : ''}{p.formatCurrency(p.totalReturn)} · {p.formatPercentage(p.totalReturnPercent)}
                </span>
              </div>
            </div>

            <div className="grid min-w-[min(100%,520px)] grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-theme-muted">Wertpapiere</p>
                <p className="text-lg font-semibold text-theme-primary tabular-nums">{p.formatCurrency(stockValue)}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-theme-muted">Cash</p>
                <p className={`text-lg font-semibold tabular-nums ${p.cashPosition < 0 ? 'text-red-400' : 'text-theme-primary'}`}>
                  {p.formatCurrency(p.cashPosition)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-theme-muted">Top Position</p>
                <p className="truncate text-lg font-semibold text-theme-primary tabular-nums">
                  {topHolding ? topHolding.symbol : '–'}
                </p>
              </div>
            </div>
          </div>

          {p.allPortfolios.length > 1 && (
            <div className="border-t border-white/[0.06] px-6 py-3">
              <div className="flex gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => openDepot('all')}
                  disabled={selectedDepotId === 'all'}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    selectedDepotId === 'all'
                      ? 'bg-teal-400/12 text-teal-300 ring-1 ring-teal-300/20'
                      : 'text-theme-muted hover:bg-white/[0.055] hover:text-theme-primary'
                  }`}
                >
                  Alle Depots
                </button>
                {p.allPortfolios.map(depot => (
                  <button
                    key={depot.id}
                    type="button"
                    onClick={() => openDepot(depot.id)}
                    disabled={selectedDepotId === depot.id}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      selectedDepotId === depot.id
                        ? 'bg-teal-400/12 text-teal-300 ring-1 ring-teal-300/20'
                        : 'text-theme-muted hover:bg-white/[0.055] hover:text-theme-primary'
                    }`}
                  >
                    {depot.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <PortfolioNavigation activeView={activeView} onOpenView={openView} compact />

        {p.holdings.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <>
            {activeView === 'overview' && (
              <div className="space-y-5">
                <QuickStats
                  totalValue={p.totalValue}
                  cashPosition={p.cashPosition}
                  brokerCredit={p.portfolio?.broker_credit || 0}
                  totalGainLoss={p.totalGainLoss}
                  totalGainLossPercent={p.totalGainLossPercent}
                  totalRealizedGain={p.totalRealizedGain}
                  totalDividends={p.totalDividends}
                  totalReturn={p.totalReturn}
                  totalReturnPercent={p.totalReturnPercent}
                  xirrPercent={p.xirrPercent}
                  activeInvestments={p.activeInvestments}
                  totalFees={p.totalFees}
                  formatCurrency={p.formatCurrency}
                  formatPercentage={p.formatPercentage}
                  onRealizedClick={() => setShowRealizedGains(true)}
                />

                <div className="grid gap-5 xl:grid-cols-[1.55fr,0.85fr]">
                  <section className="terminal-glass rounded-2xl p-5">
                    <PortfolioValueChart
                      portfolioId={p.portfolio?.id || ''}
                      portfolioIds={p.isAllDepotsView ? p.allPortfolios.map(depot => depot.id) : undefined}
                      holdings={p.holdings.map(holding => ({
                        portfolio_id: holding.portfolio_id,
                        symbol: holding.symbol,
                        quantity: holding.quantity,
                        purchase_price: holding.purchase_price,
                        current_value: holding.value,
                        purchase_date: holding.purchase_date,
                      }))}
                      cashPosition={p.cashPosition}
                      formatCurrency={p.formatCurrency}
                    />
                  </section>

                  <section className="terminal-glass rounded-2xl p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-theme-primary">Allokation</h2>
                        <p className="mt-1 text-xs text-theme-muted">Wertverteilung inklusive Cash</p>
                      </div>
                    </div>
                    <PortfolioAllocation
                      holdings={p.holdings}
                      cashPosition={p.cashPosition}
                      totalValue={p.totalValue}
                      formatCurrency={p.formatCurrency}
                      includeCash
                    />
                  </section>
                </div>

                <section className="terminal-glass rounded-2xl p-5">
                  <PositionsTable
                    holdings={p.holdings}
                    cashPosition={p.cashPosition}
                    totalValue={p.totalValue}
                    formatCurrency={p.formatCurrency}
                    formatStockPrice={p.formatStockPrice}
                    formatPercentage={p.formatPercentage}
                    onEditPosition={noOp}
                    onDeletePosition={noOp}
                    onTopUpPosition={noOp}
                    onEditCash={noOp}
                    isAllDepotsView={p.isAllDepotsView}
                    portfolioId={p.portfolio?.id}
                    historicalPerfByDepot={p.historicalPerfByDepot}
                    readOnly
                    returnTabParam="view"
                    returnTabValue="positions"
                  />
                </section>
              </div>
            )}

            {activeView === 'positions' && (
              <section className="terminal-glass rounded-2xl p-5">
                <PositionsTable
                  holdings={p.holdings}
                  cashPosition={p.cashPosition}
                  totalValue={p.totalValue}
                  formatCurrency={p.formatCurrency}
                  formatStockPrice={p.formatStockPrice}
                  formatPercentage={p.formatPercentage}
                  onEditPosition={noOp}
                  onDeletePosition={noOp}
                  onTopUpPosition={noOp}
                  onEditCash={noOp}
                  isAllDepotsView={p.isAllDepotsView}
                  portfolioId={p.portfolio?.id}
                  historicalPerfByDepot={p.historicalPerfByDepot}
                  readOnly
                  returnTabParam="view"
                  returnTabValue="positions"
                />
              </section>
            )}

            {activeView === 'analysis' && (
              <AnalysisTab
                holdings={p.holdings}
                cashPosition={p.cashPosition}
                totalValue={p.totalValue}
                formatCurrency={p.formatCurrency}
                formatPercentage={p.formatPercentage}
                portfolioId={p.portfolio?.id}
              />
            )}

            {activeView === 'dividends' && (
              <DividendsTab
                transactions={p.transactions}
                holdings={p.holdings}
                totalPortfolioValue={p.totalValue}
                formatCurrency={p.formatCurrency}
                isAllDepotsView={p.isAllDepotsView}
              />
            )}

            {activeView === 'transactions' && (
              <TransactionsList
                portfolioId={p.portfolio?.id || ''}
                transactions={p.transactions}
                realizedGainByTxId={p.realizedGainByTxId}
                onTransactionChange={() => p.loadPortfolio(p.depotIdParam)}
                formatCurrency={p.formatCurrency}
                isAllDepotsView={p.isAllDepotsView}
              />
            )}

            {activeView === 'ai' && (
              <AIAnalyseTab holdings={p.holdings} portfolioId={p.portfolio?.id} />
            )}
          </>
        )}
      </div>
        </main>
      </div>
      <RealizedGainsModal
        open={showRealizedGains}
        onClose={() => setShowRealizedGains(false)}
        transactions={p.transactions}
        realizedGainByTxId={p.realizedGainByTxId}
        formatCurrency={p.formatCurrency}
        formatPercentage={p.formatPercentage}
      />
    </div>
  )
}
