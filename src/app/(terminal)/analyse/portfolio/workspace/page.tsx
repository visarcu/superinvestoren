'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { usePortfolio, type Portfolio } from '@/hooks/usePortfolio'
import { useLookthrough } from '@/hooks/useLookthrough'
import { getBrokerColor, getBrokerDisplayName, brokerTypeToLogoId } from '@/lib/brokerConfig'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import QuickStats from '@/components/portfolio/QuickStats'
import PositionsTable from '@/components/portfolio/PositionsTable'
import PortfolioValueChart from '@/components/portfolio/PortfolioValueChart'
import PortfolioAllocation from '@/components/portfolio/PortfolioAllocation'
import TransactionsList from '@/components/portfolio/TransactionsList'
import AnalysisTab from '@/components/portfolio/AnalysisTab'
import AssetsTab from '@/components/portfolio/AssetsTab'
import AccountsTab from '@/components/portfolio/AccountsTab'
import CashflowTab from '@/components/portfolio/CashflowTab'
import QuickTradeEntry from '@/components/portfolio/QuickTradeEntry'
import DividendsTab from '@/components/portfolio/DividendsTab'
import AIAnalyseTab from '@/components/portfolio/AIAnalyseTab'
import RealizedGainsModal from '@/components/portfolio/RealizedGainsModal'
import DepotOnboarding from '@/components/portfolio/DepotOnboarding'
import { perfColor } from '@/utils/formatters'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CheckIcon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChartPieIcon,
  CreditCardIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlusIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  ViewfinderCircleIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'

type WorkspaceView = 'overview' | 'assets' | 'accounts' | 'cashflow' | 'positions' | 'analysis' | 'dividends' | 'transactions' | 'ai'

const ACTIVE_VIEWS: Array<{
  key: WorkspaceView
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}> = [
  { key: 'overview', label: 'Überblick', icon: Squares2X2Icon },
  { key: 'assets', label: 'Vermögen', icon: WalletIcon },
  { key: 'accounts', label: 'Konten', icon: CreditCardIcon },
  { key: 'cashflow', label: 'Cashflow', icon: ArrowsRightLeftIcon },
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
  { key: 'assets', view: 'assets', label: 'Vermögen', description: 'Depot + manuelle Vermögenswerte', icon: WalletIcon },
  { key: 'positions', view: 'positions', label: 'Positionen', description: 'Aktien, ETFs und Renditen', icon: RectangleGroupIcon },
  { key: 'accounts', view: 'accounts', label: 'Konten', description: 'Salden und Buchungen per Eingabe', icon: CreditCardIcon },
  { key: 'cashflow', view: 'cashflow', label: 'Cashflow', description: 'Einnahmen und Ausgaben aus Buchungen', icon: ArrowsRightLeftIcon },
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
      <nav className="sticky top-14 z-30 mb-4 rounded-xl border border-theme bg-theme-card p-1 lg:hidden">
        <div className="flex gap-0.5 overflow-x-auto">
          {PORTFOLIO_NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = item.view === activeView
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => item.view && onOpenView(item.view)}
                disabled={item.disabled || !item.view}
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white/[0.06] text-white'
                    : item.disabled
                      ? 'cursor-not-allowed text-neutral-600'
                      : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-teal-300' : ''}`} />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <aside className="sticky top-[4.5rem] hidden max-h-[calc(100vh-5rem)] w-[220px] shrink-0 self-start overflow-y-auto py-2 lg:block">
      <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Portfolio</p>

      <div className="space-y-0.5">
        {PORTFOLIO_NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = item.view === activeView
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => item.view && onOpenView(item.view)}
              disabled={item.disabled || !item.view}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.06] text-white'
                : item.disabled
                    ? 'cursor-not-allowed text-neutral-600'
                    : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-300' : ''}`} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.disabled && (
                <span className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-neutral-500">
                  Bald
                </span>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function DepotSwitcher({
  portfolios,
  selectedDepotId,
  selectedDepotName,
  onSelectDepot,
}: {
  portfolios: Portfolio[]
  selectedDepotId: string
  selectedDepotName: string
  onSelectDepot: (depotId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointer(event: Event) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSelect = (depotId: string) => {
    setOpen(false)
    if (depotId !== selectedDepotId) onSelectDepot(depotId)
  }

  const itemBase =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group -ml-1 inline-flex max-w-[220px] items-center gap-1 rounded-lg px-1 py-0.5 text-[11px] text-theme-muted transition-colors hover:bg-white/[0.06] hover:text-theme-primary sm:max-w-[280px]"
      >
        <span className="truncate">{selectedDepotName}</span>
        <ChevronUpDownIcon className="h-3.5 w-3.5 shrink-0 text-theme-muted transition-colors group-hover:text-theme-primary" />
      </button>

      {open && (
        <div
          role="menu"
          className="terminal-glass-strong absolute left-0 top-full z-[60] mt-2 w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl p-1"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-theme-muted">
            Depot wechseln
          </p>

          <div className="max-h-[320px] space-y-0.5 overflow-y-auto">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect('all')}
              className={`${itemBase} ${
                selectedDepotId === 'all'
                  ? 'bg-teal-400/10 text-teal-300'
                  : 'text-neutral-200 hover:bg-white/[0.05]'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <Squares2X2Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">Alle Depots</span>
                <span className="block truncate text-[11px] text-theme-muted">Zusammengefasst</span>
              </span>
              {selectedDepotId === 'all' && <CheckIcon className="h-4 w-4 shrink-0 text-teal-300" />}
            </button>

            {portfolios.map(depot => {
              const isActive = depot.id === selectedDepotId
              const brokerColor = getBrokerColor(depot.broker_type, depot.broker_color)
              const brokerName = getBrokerDisplayName(depot.broker_type, depot.broker_name)
              const logoId = brokerTypeToLogoId(depot.broker_type)
              return (
                <button
                  key={depot.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(depot.id)}
                  className={`${itemBase} ${
                    isActive ? 'bg-teal-400/10 text-teal-300' : 'text-neutral-200 hover:bg-white/[0.05]'
                  }`}
                >
                  {logoId ? (
                    <BrokerLogo brokerId={logoId} size={28} />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brokerColor }} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{depot.name}</span>
                    {brokerName && (
                      <span className="block truncate text-[11px] text-theme-muted">{brokerName}</span>
                    )}
                  </span>
                  {isActive && <CheckIcon className="h-4 w-4 shrink-0 text-teal-300" />}
                </button>
              )
            })}
          </div>

          <div className="my-1 h-px bg-white/[0.07]" />

          <Link
            href="/analyse/portfolio/depots/neu"
            onClick={() => setOpen(false)}
            role="menuitem"
            className={`${itemBase} text-[13px] font-medium text-neutral-200 hover:bg-white/[0.05]`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
              <PlusIcon className="h-4 w-4" />
            </span>
            Neues Depot
          </Link>

          <Link
            href="/analyse/portfolio/depots"
            onClick={() => setOpen(false)}
            role="menuitem"
            className={`${itemBase} text-[13px] font-medium text-neutral-200 hover:bg-white/[0.05]`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-neutral-300">
              <Cog6ToothIcon className="h-4 w-4" />
            </span>
            Depots verwalten
          </Link>
        </div>
      )}
    </div>
  )
}

function WorkspaceSkeleton() {
  return (
    <main className="w-full px-6 py-8 pb-24">
      <div className="mx-auto max-w-[1720px] animate-pulse">
        <div className="mb-6 h-16 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        <div className="mb-6 h-14 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map(item => (
            <div key={item} className="h-28 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr,0.85fr]">
          <div className="h-[430px] rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          <div className="h-[430px] rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        </div>
      </div>
    </main>
  )
}

// Skeleton für den Content-Bereich: wird gezeigt, solange Holdings noch laden
// (Header/Tabs stehen dann schon — vorher blitzte hier "Noch keine Positionen" auf).
function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map(item => (
          <div key={item} className="h-28 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.55fr,0.85fr]">
        <div className="h-[380px] rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        <div className="h-[380px] rounded-xl bg-white/[0.03] border border-white/[0.06]" />
      </div>
    </div>
  )
}

function EmptyPortfolio() {
  return (
    <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06]">
        <ChartBarIcon className="h-7 w-7 text-teal-300" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-theme-primary">Noch keine Positionen</h2>
      <p className="mx-auto max-w-md text-sm text-theme-muted">
        Der Workspace ist für Analyse und Navigation gedacht. Neue Aktivitäten legst du aktuell noch im klassischen Dashboard an.
      </p>
      <Link
        href="/analyse/portfolio/dashboard?depot=all"
        className="mt-5 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-white/[0.07]"
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

  // Look-Through einmal für den ganzen Workspace laden (Überblick-Insights +
  // Analyse-Tab teilen sich das Ergebnis)
  const lookthrough = useLookthrough(p.holdings)

  // Superinvestor-Overlap für die Positions-Badges (gleiches Muster wie Dashboard)
  const [superInvestorCounts, setSuperInvestorCounts] = useState<Record<string, { count: number; investors: { name: string; slug: string }[] }>>({})
  const fetchSuperInvestorOverlap = useCallback(async (holdings: { symbol: string }[]) => {
    if (holdings.length === 0) return
    try {
      const res = await fetch('/api/portfolio/super-investor-overlap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: holdings.map(h => h.symbol) }),
      })
      if (res.ok) setSuperInvestorCounts(await res.json())
    } catch (error) {
      console.error('Error fetching super investor overlap:', error)
    }
  }, [])

  useEffect(() => {
    if (p.holdings.length > 0) {
      fetchSuperInvestorOverlap(p.holdings)
    }
  }, [p.holdings, fetchSuperInvestorOverlap])

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
  // Noch kein Depot angelegt → gleiches Onboarding wie im Dashboard
  if (p.hasNoDepots) return <DepotOnboarding />
  const isSwitchingDepot = p.loading && !!p.portfolio

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary">
      <header className="sticky top-0 z-50 border-b border-theme bg-theme-primary">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/analyse"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Zurück ins Terminal"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold leading-tight text-theme-primary">Portfolio</p>
                {isSwitchingDepot && (
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                    Lädt
                  </span>
                )}
              </div>
              <DepotSwitcher
                portfolios={p.allPortfolios}
                selectedDepotId={selectedDepotId}
                selectedDepotName={selectedDepotName}
                onSelectDepot={openDepot}
              />
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={dashboardHref}
              className="px-3 py-1.5 text-[13px] text-neutral-400 transition-colors hover:text-white"
            >
              Klassisches Dashboard
            </Link>
            <Link
              href={`/analyse/portfolio/dashboard?depot=${p.depotIdParam}&tab=transactions`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-neutral-200"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Aktivität
            </Link>
          </div>
        </div>
      </header>

      <div className="flex w-full gap-6 px-6 lg:px-8">
        <PortfolioNavigation activeView={activeView} onOpenView={openView} />

        <main className="min-w-0 flex-1 py-5 pb-20">
      <div className="w-full">
        <section className="mb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold text-theme-primary">{selectedDepotName}</h1>
                <span className="text-sm text-neutral-500">
                  {p.activeInvestments} Position{p.activeInvestments === 1 ? '' : 'en'} · {p.transactions.length} Transaktionen
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-semibold text-theme-primary tabular-nums">
                  {p.formatCurrency(p.totalValue)}
                </span>
                <span className={`text-sm font-medium tabular-nums ${perfColor(p.totalReturn)}`}>
                  {p.totalReturn >= 0 ? '+' : ''}{p.formatCurrency(p.totalReturn)} · {p.formatPercentage(p.totalReturnPercent)}
                </span>
                <span className="text-sm text-neutral-500">
                  Heute{' '}
                  <span className={`font-medium tabular-nums ${perfColor(p.dayGainLoss)}`}>
                    {p.dayGainLoss >= 0 ? '+' : ''}{p.formatCurrency(p.dayGainLoss)} · {p.formatPercentage(p.dayGainLossPercent)}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] text-neutral-500">Wertpapiere</p>
                <p className="text-sm font-medium text-theme-primary tabular-nums">{p.formatCurrency(stockValue)}</p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">Cash</p>
                <p className={`text-sm font-medium tabular-nums ${p.cashPosition < 0 ? 'text-red-400' : 'text-theme-primary'}`}>
                  {p.formatCurrency(p.cashPosition)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">Top Position</p>
                <p className="text-sm font-medium text-theme-primary tabular-nums">
                  {topHolding ? topHolding.symbol : '–'}
                </p>
              </div>
              {p.exchangeRate && (
                <button
                  type="button"
                  onClick={p.loadExchangeRate}
                  className="hidden items-center gap-1 text-[11px] text-neutral-500 transition-colors hover:text-white sm:inline-flex"
                  title="Wechselkurs aktualisieren"
                >
                  USD/EUR {p.exchangeRate.toFixed(4)}
                  <ArrowPathIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {p.allPortfolios.length > 1 && (
            <div className="mt-3 flex gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => openDepot('all')}
                disabled={selectedDepotId === 'all'}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selectedDepotId === 'all'
                    ? 'bg-white/[0.06] text-white'
                    : 'text-neutral-500 hover:bg-white/[0.04] hover:text-white'
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
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selectedDepotId === depot.id
                      ? 'bg-white/[0.06] text-white'
                      : 'text-neutral-500 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {depot.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <PortfolioNavigation activeView={activeView} onOpenView={openView} compact />

        {/* Vermögen/Konten/Cashflow funktionieren auch ohne Depot-Positionen */}
        {p.holdings.length === 0 && !['assets', 'accounts', 'cashflow'].includes(activeView) ? (
          p.loading ? <ContentSkeleton /> : <EmptyPortfolio />
        ) : (
          <>
            {activeView === 'overview' && (
              <div className="space-y-4">
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

                {/* Durchblick-Insights: die wichtigsten Look-Through-Erkenntnisse
                    direkt im Überblick — Details im Analyse-Tab */}
                {(lookthrough.result?.insights.length ?? 0) > 0 && (
                  <section className="bg-theme-card border border-theme rounded-xl p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                        <ViewfinderCircleIcon className="h-4 w-4 text-teal-300" />
                        Durchblick
                      </h3>
                      <button
                        type="button"
                        onClick={() => openView('analysis')}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-teal-300 transition-colors hover:bg-teal-400/10 hover:text-white"
                      >
                        Zur Analyse →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {lookthrough.result!.insights.slice(0, 3).map((insight, i) => {
                        const isWarn = insight.severity === 'warn'
                        const Icon = isWarn ? ExclamationTriangleIcon : LightBulbIcon
                        return (
                          <div
                            key={i}
                            className={`rounded-xl border p-3.5 ${
                              isWarn ? 'border-amber-500/20 bg-amber-500/[0.06]' : 'border-white/[0.06] bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isWarn ? 'text-amber-400' : 'text-teal-300'}`} />
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold leading-snug text-theme-primary">{insight.title}</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-theme-muted">{insight.text}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                <div className="grid gap-4 xl:grid-cols-[1.55fr,0.85fr]">
                  <section className="bg-theme-card border border-theme rounded-xl p-5">
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

                  <section className="bg-theme-card border border-theme rounded-xl p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-medium text-theme-primary">Allokation</h2>
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

                <section className="bg-theme-card border border-theme rounded-xl p-5">
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
                    superInvestorCounts={superInvestorCounts}
                    readOnly
                    returnTabParam="view"
                    returnTabValue="positions"
                  />
                </section>
              </div>
            )}

            {activeView === 'assets' && (
              <AssetsTab
                securitiesValue={stockValue}
                cashPosition={p.cashPosition}
                formatCurrency={p.formatCurrency}
              />
            )}

            {activeView === 'accounts' && (
              <AccountsTab formatCurrency={p.formatCurrency} />
            )}

            {activeView === 'cashflow' && (
              <CashflowTab
                formatCurrency={p.formatCurrency}
                portfolioIds={p.allPortfolios.map(depot => depot.id)}
              />
            )}

            {activeView === 'positions' && (
              <section className="bg-theme-card border border-theme rounded-xl p-5">
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
                  superInvestorCounts={superInvestorCounts}
                  readOnly
                  returnTabParam="view"
                  returnTabValue="positions"
                />
              </section>
            )}

            {activeView === 'analysis' && (
              <AnalysisTab
                lookthrough={lookthrough}
                holdings={p.holdings}
                cashPosition={p.cashPosition}
                totalValue={p.totalValue}
                formatCurrency={p.formatCurrency}
                formatPercentage={p.formatPercentage}
                portfolioId={p.isAllDepotsView ? undefined : p.portfolio?.id}
                portfolioIds={p.isAllDepotsView ? p.allPortfolios.map(depot => depot.id) : undefined}
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
              <>
                <QuickTradeEntry
                  holdings={p.holdings}
                  allPortfolios={p.allPortfolios}
                  isAllDepotsView={p.isAllDepotsView}
                  currentPortfolioId={p.isAllDepotsView ? undefined : p.portfolio?.id}
                  formatCurrency={p.formatCurrency}
                  onSaved={() => p.loadPortfolio(p.depotIdParam)}
                />
                <TransactionsList
                  portfolioId={p.portfolio?.id || ''}
                  transactions={p.transactions}
                  realizedGainByTxId={p.realizedGainByTxId}
                  onTransactionChange={() => p.loadPortfolio(p.depotIdParam)}
                  formatCurrency={p.formatCurrency}
                  isAllDepotsView={p.isAllDepotsView}
                />
              </>
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
