'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { usePortfolio, type Holding, type Portfolio } from '@/hooks/usePortfolio'
import { useLookthrough } from '@/hooks/useLookthrough'
import { useDepotValues } from '@/hooks/useDepotValues'
import { getBrokerColor, getBrokerDisplayName, brokerTypeToLogoId } from '@/lib/brokerConfig'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import QuickStats from '@/components/portfolio/QuickStats'
import PositionsTable from '@/components/portfolio/PositionsTable'
import PortfolioValueChart from '@/components/portfolio/PortfolioValueChart'
import PortfolioAllocation from '@/components/portfolio/PortfolioAllocation'
import TransactionsList from '@/components/portfolio/TransactionsList'
import AnalysisTab from '@/components/portfolio/AnalysisTab'
import FundamentalTab from '@/components/portfolio/FundamentalTab'
import AssetsTab from '@/components/portfolio/AssetsTab'
import AccountsTab from '@/components/portfolio/AccountsTab'
import CashflowTab from '@/components/portfolio/CashflowTab'
import QuickTradeEntry from '@/components/portfolio/QuickTradeEntry'
import PortfolioEarningsPreview from '@/components/PortfolioEarningsPreview'
import UpcomingDividendsPreview from '@/components/portfolio/UpcomingDividendsPreview'
import SoldPositions from '@/components/portfolio/SoldPositions'
import FreshMoneyCard from '@/components/portfolio/FreshMoneyCard'
import DividendsTab from '@/components/portfolio/DividendsTab'
import AIAnalyseTab from '@/components/portfolio/AIAnalyseTab'
import RealizedGainsModal from '@/components/portfolio/RealizedGainsModal'
import AddActivityFAB from '@/components/portfolio/AddActivityFAB'
import PremiumUpgradeModal from '@/components/portfolio/PremiumUpgradeModal'
import EditPositionModal from '@/components/portfolio/EditPositionModal'
import TopUpPositionModal from '@/components/portfolio/TopUpPositionModal'
import CashEditModal from '@/components/portfolio/CashEditModal'
import BrokerCreditModal from '@/components/portfolio/BrokerCreditModal'
import RenamePortfolioModal from '@/components/portfolio/RenamePortfolioModal'
import CSVImportModal from '@/components/portfolio/CSVImportModal'
import DepotOnboarding from '@/components/portfolio/DepotOnboarding'
import BrokerSyncCard from '@/components/portfolio/BrokerSyncCard'
import T212SyncCard from '@/components/portfolio/T212SyncCard'
import { perfColor } from '@/utils/formatters'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  CalculatorIcon,
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
  LockClosedIcon,
  PencilIcon,
  PlusIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  ViewfinderCircleIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'

type WorkspaceView = 'overview' | 'assets' | 'accounts' | 'cashflow' | 'positions' | 'analysis' | 'fundamental' | 'dividends' | 'transactions' | 'ai'

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
  { key: 'fundamental', label: 'Fundamental', icon: CalculatorIcon },
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
  premium?: boolean
}

const PORTFOLIO_NAV_ITEMS: PortfolioNavItem[] = [
  { key: 'overview', view: 'overview', label: 'Übersicht', description: 'Wert, Performance, Allokation', icon: Squares2X2Icon },
  { key: 'assets', view: 'assets', label: 'Vermögen', description: 'Depot + manuelle Vermögenswerte', icon: WalletIcon },
  { key: 'positions', view: 'positions', label: 'Positionen', description: 'Aktien, ETFs und Renditen', icon: RectangleGroupIcon },
  { key: 'accounts', view: 'accounts', label: 'Konten', description: 'Salden und Buchungen per Eingabe', icon: CreditCardIcon },
  { key: 'cashflow', view: 'cashflow', label: 'Cashflow', description: 'Einnahmen und Ausgaben aus Buchungen', icon: ArrowsRightLeftIcon },
  { key: 'dividends', view: 'dividends', label: 'Dividenden', description: 'Erträge und Prognosen', icon: BanknotesIcon, premium: true },
  { key: 'transactions', view: 'transactions', label: 'Transaktionen', description: 'Käufe, Verkäufe, Cash', icon: DocumentTextIcon, premium: true },
  { key: 'analysis', view: 'analysis', label: 'Analyse', description: 'Struktur und Konzentration', icon: ChartPieIcon },
  { key: 'fundamental', view: 'fundamental', label: 'Fundamental', description: 'Kennzahlen des Depots, wertgewichtet', icon: CalculatorIcon },
  { key: 'ai', view: 'ai', label: 'KI-Analyse', description: 'Portfolio-Check', icon: CpuChipIcon, premium: true },
  { key: 'settings', label: 'Einstellungen', description: 'Regeln, Konten, Kategorien', icon: Cog6ToothIcon, disabled: true },
]

// Premium-Gating: gleiche Views wie die gesperrten Dashboard-Tabs
const PREMIUM_VIEW_MESSAGES: Partial<Record<WorkspaceView, string>> = {
  dividends: 'Dividenden-Übersicht ist ein Premium-Feature. Behalte alle Dividendenzahlungen im Blick.',
  transactions: 'Portfolio-Historie ist ein Premium-Feature. Verfolge alle deine Transaktionen.',
  ai: 'KI-Portfolio-Analyse ist ein Premium-Feature. Lass dein Portfolio von unserer KI analysieren.',
}

function parseView(value: string | null): WorkspaceView {
  return ACTIVE_VIEWS.some(view => view.key === value) ? value as WorkspaceView : 'overview'
}

function PortfolioNavigation({
  activeView,
  onOpenView,
  isPremium,
  compact = false,
}: {
  activeView: WorkspaceView
  onOpenView: (view: WorkspaceView) => void
  isPremium: boolean
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
                {!isPremium && item.premium && <LockClosedIcon className="h-3 w-3 text-amber-500" />}
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
              {!isPremium && item.premium && <LockClosedIcon className="h-3 w-3 shrink-0 text-amber-500" />}
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
  depotValues,
  formatCurrency,
}: {
  portfolios: Portfolio[]
  selectedDepotId: string
  selectedDepotName: string
  onSelectDepot: (depotId: string) => void
  depotValues: Map<string, number>
  formatCurrency: (value: number) => string
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
              const depotValue = depotValues.get(depot.id)
              const subtitle = [
                depotValue !== undefined ? formatCurrency(depotValue) : null,
                brokerName || null,
              ].filter(Boolean).join(' · ')
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
                    {subtitle && (
                      <span className="block truncate text-[11px] tabular-nums text-theme-muted">{subtitle}</span>
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

// Deep-Link-Schutz: gesperrte View direkt per URL geöffnet → Karte statt Inhalt
function LockedViewCard({ message }: { message: string }) {
  return (
    <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
        <LockClosedIcon className="h-6 w-6 text-amber-400" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-theme-primary">Premium Feature</h2>
      <p className="mx-auto max-w-md text-sm text-theme-muted">{message}</p>
      <Link
        href="/pricing"
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
      >
        Jetzt upgraden
      </Link>
    </div>
  )
}

function EmptyPortfolio({ onAddActivity }: { onAddActivity: () => void }) {
  return (
    <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06]">
        <ChartBarIcon className="h-7 w-7 text-teal-300" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-theme-primary">Noch keine Positionen</h2>
      <p className="mx-auto max-w-md text-sm text-theme-muted">
        Erfasse deinen ersten Kauf, eine Dividende oder einen Depotübertrag — oder verbinde dein Depot per Broker-Sync.
      </p>
      <button
        type="button"
        onClick={onAddActivity}
        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
      >
        <PlusIcon className="h-4 w-4" />
        Aktivität hinzufügen
      </button>
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

  // Positions-Aktionen (Edit/Delete/Top-Up/Cash) — gleiche Modale wie im Dashboard
  const [editingPosition, setEditingPosition] = useState<Holding | null>(null)
  const [topUpTarget, setTopUpTarget] = useState<Holding | null>(null)
  const [showCashModal, setShowCashModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)

  // Cash-Toggle für die Allokation (mit/ohne Cash im Donut)
  const [includeCashInAllocation, setIncludeCashInAllocation] = useState(true)

  // Aktivitäts-Dialog (Kauf/Verkauf/Dividende/Cash/Übertrag) — gleicher FAB wie im Dashboard
  const [activityDialogTrigger, setActivityDialogTrigger] = useState(0)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [premiumFeatureMessage, setPremiumFeatureMessage] = useState('')

  const handlePremiumRequired = () => {
    setPremiumFeatureMessage('Mit Premium kannst du unbegrenzt Positionen zu deinem Portfolio hinzufügen.')
    setShowPremiumModal(true)
  }

  const handleDeletePosition = async (holdingId: string) => {
    if (!confirm('Position wirklich löschen?')) return
    try {
      await p.deletePosition(holdingId)
    } catch {
      alert('Fehler beim Löschen')
    }
  }

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

  // Wert pro Depot (für den Switcher-Überblick) — gleiche Logik wie im Dashboard
  const depotValues = useDepotValues({
    holdings: p.holdings,
    allPortfolios: p.allPortfolios,
    portfolioId: p.portfolio?.id,
    isAllDepotsView: p.isAllDepotsView,
  })
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
    const premiumMessage = PREMIUM_VIEW_MESSAGES[view]
    if (premiumMessage && !p.isPremium) {
      setPremiumFeatureMessage(premiumMessage)
      setShowPremiumModal(true)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Gesperrte View per Deep-Link geöffnet (Free-User): Inhalt nicht rendern
  const lockedViewMessage = !p.isPremium ? PREMIUM_VIEW_MESSAGES[activeView] : undefined

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
                depotValues={depotValues}
                formatCurrency={p.formatCurrency}
              />
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={p.refresh}
              disabled={p.refreshing}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              title="Kurse aktualisieren"
            >
              <ArrowPathIcon className={`h-4 w-4 ${p.refreshing ? 'animate-spin' : ''}`} />
            </button>
            {!p.isAllDepotsView && (
              <button
                type="button"
                onClick={() => setShowCSVImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-neutral-400 transition-colors hover:text-white"
                title="CSV-Import"
              >
                <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                Import
              </button>
            )}
            <button
              type="button"
              onClick={p.exportToCSV}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Als CSV exportieren"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActivityDialogTrigger(t => t + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-neutral-200"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Aktivität
            </button>
          </div>
        </div>
      </header>

      <div className="flex w-full gap-6 px-6 lg:px-8">
        <PortfolioNavigation activeView={activeView} onOpenView={openView} isPremium={p.isPremium} />

        <main className="min-w-0 flex-1 py-5 pb-20">
      <div className="w-full">
        {/* Fehler-Banner mit Retry (Wechselkurs / Kurse) */}
        {(p.exchangeRateError || p.priceLoadError) && (
          <div className="mb-4 space-y-2">
            {p.exchangeRateError && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-400" />
                <p className="flex-1 text-sm text-amber-700 dark:text-amber-200">{p.exchangeRateError}</p>
                <button onClick={p.loadExchangeRate} className="text-xs text-amber-400 underline hover:text-amber-300">Erneut versuchen</button>
              </div>
            )}
            {p.priceLoadError && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-400" />
                <p className="flex-1 text-sm text-red-700 dark:text-red-200">{p.priceLoadError}</p>
                <button onClick={() => p.loadPortfolio(p.depotIdParam)} className="text-xs text-red-400 underline hover:text-red-300">Erneut versuchen</button>
              </div>
            )}
          </div>
        )}

        <section className="mb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold text-theme-primary">{selectedDepotName}</h1>
                {!p.isAllDepotsView && (
                  <button
                    type="button"
                    onClick={() => setShowNameModal(true)}
                    className="self-center rounded-lg p-1 text-neutral-500 opacity-50 transition-all hover:bg-white/[0.06] hover:text-white hover:opacity-100"
                    title="Depot umbenennen"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                )}
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

        <PortfolioNavigation activeView={activeView} onOpenView={openView} isPremium={p.isPremium} compact />

        {/* Vermögen/Konten/Cashflow funktionieren auch ohne Depot-Positionen */}
        {p.holdings.length === 0 && !['assets', 'accounts', 'cashflow'].includes(activeView) ? (
          p.loading ? <ContentSkeleton /> : (
            <>
              {/* Leeres Einzeldepot: Broker-Sync anbieten — genau hier startet der Import */}
              {!p.isAllDepotsView && p.portfolio?.id && (
                <>
                  <BrokerSyncCard
                    portfolioId={p.portfolio.id}
                    formatCurrency={p.formatCurrency}
                  />
                  <T212SyncCard
                    portfolioId={p.portfolio.id}
                    formatCurrency={p.formatCurrency}
                  />
                </>
              )}
              <EmptyPortfolio onAddActivity={() => setActivityDialogTrigger(t => t + 1)} />
            </>
          )
        ) : lockedViewMessage ? (
          <LockedViewCard message={lockedViewMessage} />
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
                  onCashClick={p.isAllDepotsView ? undefined : () => setShowCashModal(true)}
                  onCreditClick={p.isAllDepotsView ? undefined : () => setShowCreditModal(true)}
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
                        <p className="mt-1 text-xs text-theme-muted">
                          {includeCashInAllocation && p.cashPosition > 0 ? 'Wertverteilung inklusive Cash' : 'Nur Wertpapiere'}
                        </p>
                      </div>
                      {p.cashPosition !== 0 && (
                        <div className="flex rounded-lg border border-white/[0.08] p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => setIncludeCashInAllocation(true)}
                            className={`rounded-md px-2.5 py-1 transition-colors ${
                              includeCashInAllocation ? 'bg-white/[0.08] text-white' : 'text-neutral-500 hover:text-white'
                            }`}
                          >
                            Mit Cash
                          </button>
                          <button
                            type="button"
                            onClick={() => setIncludeCashInAllocation(false)}
                            className={`rounded-md px-2.5 py-1 transition-colors ${
                              !includeCashInAllocation ? 'bg-white/[0.08] text-white' : 'text-neutral-500 hover:text-white'
                            }`}
                          >
                            Ohne Cash
                          </button>
                        </div>
                      )}
                    </div>
                    <PortfolioAllocation
                      holdings={p.holdings}
                      cashPosition={p.cashPosition}
                      totalValue={p.totalValue}
                      formatCurrency={p.formatCurrency}
                      includeCash={includeCashInAllocation && p.cashPosition > 0}
                    />
                  </section>
                </div>

                {/* Anstehende Earnings + Dividenden */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="bg-theme-card border border-theme rounded-xl overflow-hidden">
                    <PortfolioEarningsPreview
                      symbols={p.holdings.map(h => h.symbol)}
                      companyNames={Object.fromEntries(p.holdings.map(h => [h.symbol, h.name]))}
                    />
                  </section>
                  <section className="bg-theme-card border border-theme rounded-xl overflow-hidden">
                    <UpcomingDividendsPreview
                      holdings={p.holdings}
                      formatCurrency={p.formatCurrency}
                      onShowAll={() => openView('dividends')}
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
                    onEditPosition={setEditingPosition}
                    onDeletePosition={handleDeletePosition}
                    onTopUpPosition={setTopUpTarget}
                    onEditCash={() => setShowCashModal(true)}
                    isAllDepotsView={p.isAllDepotsView}
                    portfolioId={p.portfolio?.id}
                    historicalPerfByDepot={p.historicalPerfByDepot}
                    superInvestorCounts={superInvestorCounts}
                    returnTabParam="view"
                    returnTabValue="positions"
                  />
                </section>

                {/* Verkaufte Wertpapiere */}
                <SoldPositions
                  transactions={p.transactions}
                  formatCurrency={p.formatCurrency}
                  portfolioId={p.portfolio?.id}
                  totalValue={p.totalValue}
                />
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

            {activeView === 'positions' && !p.isAllDepotsView && p.portfolio?.id && (
              <>
                <BrokerSyncCard
                  portfolioId={p.portfolio.id}
                  formatCurrency={p.formatCurrency}
                />
                <T212SyncCard
                  portfolioId={p.portfolio.id}
                  formatCurrency={p.formatCurrency}
                />
              </>
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
                  onEditPosition={setEditingPosition}
                  onDeletePosition={handleDeletePosition}
                  onTopUpPosition={setTopUpTarget}
                  onEditCash={() => setShowCashModal(true)}
                  isAllDepotsView={p.isAllDepotsView}
                  portfolioId={p.portfolio?.id}
                  historicalPerfByDepot={p.historicalPerfByDepot}
                  superInvestorCounts={superInvestorCounts}
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

            {activeView === 'fundamental' && (
              <FundamentalTab
                holdings={p.holdings}
                formatCurrency={p.formatCurrency}
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
                <FreshMoneyCard
                  transactions={p.transactions}
                  formatCurrency={p.formatCurrency}
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
      <EditPositionModal
        holding={editingPosition}
        onClose={() => setEditingPosition(null)}
        onSave={p.updatePosition}
      />
      <TopUpPositionModal
        holding={topUpTarget}
        onClose={() => setTopUpTarget(null)}
        onTopUp={p.topUpPosition}
        formatStockPrice={p.formatStockPrice}
      />
      <CashEditModal
        open={showCashModal}
        cashPosition={p.cashPosition}
        formatCurrency={p.formatCurrency}
        onClose={() => setShowCashModal(false)}
        onSave={p.updateCashPosition}
      />
      <BrokerCreditModal
        open={showCreditModal}
        brokerCredit={p.portfolio?.broker_credit || 0}
        formatCurrency={p.formatCurrency}
        onClose={() => setShowCreditModal(false)}
        onSave={p.updateBrokerCredit}
      />
      <RenamePortfolioModal
        open={showNameModal}
        currentName={p.portfolio?.name || ''}
        onClose={() => setShowNameModal(false)}
        onSave={p.updatePortfolioName}
      />
      {p.portfolio?.id && p.portfolio.id !== 'all' && (
        <CSVImportModal
          isOpen={showCSVImport}
          onClose={() => setShowCSVImport(false)}
          portfolioId={p.portfolio.id}
          portfolioName={p.portfolio.name}
          onImportComplete={() => p.loadPortfolio(p.depotIdParam)}
        />
      )}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature={premiumFeatureMessage}
      />

      {/* FAB - Aktivität hinzufügen */}
      <AddActivityFAB
        portfolioId={p.portfolio?.id || ''}
        holdings={p.holdings}
        isPremium={p.isPremium}
        holdingsCount={p.holdings.length}
        cashPosition={p.cashPosition}
        formatCurrency={p.formatCurrency}
        formatStockPrice={p.formatStockPrice}
        isAllDepotsView={p.isAllDepotsView}
        allPortfolios={p.allPortfolios}
        onAddPosition={p.addPosition}
        onTopUpPosition={p.topUpPosition}
        onSellPosition={p.sellPosition}
        onAddDividend={p.addDividend}
        onAddCash={p.addCash}
        onAddTransfer={p.addTransfer}
        onComplete={() => p.loadPortfolio(p.depotIdParam)}
        onPremiumRequired={handlePremiumRequired}
        openTrigger={activityDialogTrigger}
        onPickDepot={openDepot}
      />
    </div>
  )
}
