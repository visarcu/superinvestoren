// src/components/portfolio/DepotList.tsx
// Die Depots des Nutzers im Workspace: Liste in der Seitenleiste, wischbare
// Karten auf schmalen Bildschirmen und der Block "Deine Depots" in der Sicht
// "Alle Depots". Das Beispieldepot steht überall am Ende und trägt ein Schild.
'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { ArrowUpTrayIcon, BeakerIcon, Cog6ToothIcon, PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import type { DepotSummary, Portfolio } from '@/hooks/usePortfolio'
import { brokerTypeToLogoId, getBrokerColor } from '@/lib/brokerConfig'
import { countedDepots, depotLabel, isSampleDepot } from '@/lib/sampleDepotShared'
import { perfColor } from '@/utils/formatters'

const NEW_DEPOT_HREF = '/analyse/portfolio/depots/neu'
const MANAGE_DEPOTS_HREF = '/analyse/portfolio/depots'

/** Eigene Depots in der üblichen Reihenfolge, das Beispieldepot zuletzt */
export function sortDepots(depots: Portfolio[]): Portfolio[] {
  return [...depots.filter(d => !isSampleDepot(d)), ...depots.filter(isSampleDepot)]
}

export function SampleBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-600 dark:text-amber-300 ${className}`}>
      Beispiel
    </span>
  )
}

export function DepotIcon({ depot, size = 28 }: { depot: Portfolio; size?: number }) {
  const logoId = isSampleDepot(depot) ? null : brokerTypeToLogoId(depot.broker_type)
  if (logoId) return <BrokerLogo brokerId={logoId} size={size} />
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-theme-secondary text-theme-muted"
      style={{ width: size, height: size }}
    >
      {isSampleDepot(depot) ? (
        <BeakerIcon className="h-4 w-4" />
      ) : (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getBrokerColor(depot.broker_type, depot.broker_color) }} />
      )}
    </span>
  )
}

function AllDepotsIcon({ size = 28 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-theme-secondary text-theme-secondary"
      style={{ width: size, height: size }}
    >
      <Squares2X2Icon className="h-4 w-4" />
    </span>
  )
}

/** Summe der zählenden Depots, undefined solange nicht alle Werte geladen sind */
function totalOf(depots: Portfolio[], values: Map<string, number>): number | undefined {
  let total = 0
  for (const depot of countedDepots(depots)) {
    const value = values.get(depot.id)
    if (value === undefined) return undefined
    total += value
  }
  return total
}

interface DepotPickerProps {
  depots: Portfolio[]
  /** 'all' oder Depot-ID */
  selectedId: string
  values: Map<string, number>
  onSelect: (depotId: string) => void
  formatCurrency: (value: number) => string
}

/** Oberster Abschnitt der Seitenleiste */
export function DepotSidebarList({ depots, selectedId, values, onSelect, formatCurrency }: DepotPickerProps) {
  const sorted = useMemo(() => sortDepots(depots), [depots])
  if (depots.length === 0) return null

  const row = (id: string, icon: React.ReactNode, name: string, value: number | undefined, sample = false) => {
    const isActive = id === selectedId
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        aria-current={isActive ? 'true' : undefined}
        title={name}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
          isActive ? 'bg-white/[0.07] text-theme-primary' : 'text-theme-secondary hover:bg-white/[0.04] hover:text-theme-primary'
        }`}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight">{name}</span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="truncate text-[11px] leading-tight tabular-nums text-theme-muted">
              {value === undefined ? '…' : formatCurrency(value)}
            </span>
            {sample && <SampleBadge />}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between pl-3 pr-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">Depots</p>
        <Link
          href={MANAGE_DEPOTS_HREF}
          title="Depots verwalten"
          aria-label="Depots verwalten"
          className="rounded-md p-1 text-theme-muted transition-colors hover:bg-white/[0.06] hover:text-theme-primary"
        >
          <Cog6ToothIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="max-h-[296px] space-y-0.5 overflow-y-auto">
        {depots.length > 1 && row('all', <AllDepotsIcon />, 'Alle Depots', totalOf(depots, values))}
        {sorted.map(depot => row(depot.id, <DepotIcon depot={depot} />, depotLabel(depot), values.get(depot.id), isSampleDepot(depot)))}
      </div>
      <Link
        href={NEW_DEPOT_HREF}
        className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-theme-muted transition-colors hover:bg-white/[0.04] hover:text-theme-primary"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-theme">
          <PlusIcon className="h-3.5 w-3.5" />
        </span>
        Neues Depot
      </Link>
    </div>
  )
}

/** Wischbare Karten, wo keine Seitenleiste zu sehen ist */
export function DepotCards({ depots, selectedId, values, onSelect, formatCurrency }: DepotPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sorted = useMemo(() => sortDepots(depots), [depots])

  // Gewähltes Depot ins Bild holen, ohne die Seite selbst zu scrollen
  useEffect(() => {
    const container = scrollRef.current
    const active = container?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!container || !active) return
    const left = active.offsetLeft - container.offsetLeft
    if (left < container.scrollLeft || left + active.offsetWidth > container.scrollLeft + container.clientWidth) {
      container.scrollLeft = Math.max(0, left - 16)
    }
  }, [selectedId, depots.length])

  if (depots.length < 2) return null

  const card = (id: string, name: string, value: number | undefined, sample = false) => {
    const isActive = id === selectedId
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        aria-current={isActive ? 'true' : undefined}
        className="w-[172px] shrink-0 rounded-xl border border-theme bg-theme-card px-3 py-2.5 text-left transition-colors"
        style={isActive ? { borderColor: 'var(--color-text-secondary)' } : undefined}
      >
        <span className={`block truncate text-[13px] font-medium ${isActive ? 'text-theme-primary' : 'text-theme-secondary'}`}>{name}</span>
        <span className="mt-1 flex items-center justify-between gap-1.5">
          <span className="truncate text-[12px] tabular-nums text-theme-muted">{value === undefined ? '…' : formatCurrency(value)}</span>
          {sample && <SampleBadge />}
        </span>
      </button>
    )
  }

  return (
    <div ref={scrollRef} className="-mx-6 mb-4 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden" aria-label="Depots">
      {card('all', 'Alle Depots', totalOf(depots, values))}
      {sorted.map(depot => card(depot.id, depotLabel(depot), values.get(depot.id), isSampleDepot(depot)))}
      <Link
        href={NEW_DEPOT_HREF}
        className="flex w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-theme px-3 py-2.5 text-[13px] font-medium text-theme-muted"
      >
        <PlusIcon className="h-4 w-4" />
        Neu
      </Link>
    </div>
  )
}

/** Block "Deine Depots" in der Sicht "Alle Depots" */
export function DepotOverviewCard({
  depots,
  summaries,
  dayLabel,
  onSelect,
  onImport,
  formatCurrency,
  formatPercentage,
}: {
  depots: Portfolio[]
  summaries: Map<string, DepotSummary>
  /** "Heute" oder der letzte Handelstag */
  dayLabel: string
  onSelect: (depotId: string) => void
  onImport: (depotId: string) => void
  formatCurrency: (value: number) => string
  formatPercentage: (value: number) => string
}) {
  const sorted = useMemo(() => sortDepots(depots), [depots])
  const rowGrid = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatCurrency(value)}`

  return (
    <section className="rounded-xl border border-theme bg-theme-card px-5 pb-2 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-theme-primary">Deine Depots</h2>
        <Link
          href={MANAGE_DEPOTS_HREF}
          className="rounded-lg px-2 py-1 text-xs font-medium text-theme-secondary transition-colors hover:bg-white/[0.05] hover:text-theme-primary"
        >
          Verwalten
        </Link>
      </div>

      <div className={`${rowGrid} hidden pb-2 text-[11px] text-theme-muted sm:grid`}>
        <span>Depot</span>
        <span className="text-right">Wert</span>
        <span className="text-right">{dayLabel}</span>
        <span className="text-right">Gesamtrendite</span>
      </div>

      {sorted.map(depot => {
        const summary = summaries.get(depot.id)
        const sample = isSampleDepot(depot)
        const value = summary ? summary.stockValue + (depot.cash_position || 0) : undefined
        const isEmpty = !!summary && summary.positions === 0 && summary.transactions === 0 && !depot.cash_position

        const name = (
          <span className="flex min-w-0 items-center gap-3">
            <DepotIcon depot={depot} size={32} />
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13px] font-medium text-theme-primary">{depotLabel(depot)}</span>
                {sample && <SampleBadge />}
              </span>
              <span className="block truncate text-[11px] text-theme-muted">
                {sample
                  ? 'Zählt nicht mit'
                  : isEmpty
                    ? 'Noch leer'
                    : summary
                      ? `${summary.positions} Position${summary.positions === 1 ? '' : 'en'}`
                      : ''}
              </span>
            </span>
          </span>
        )

        if (isEmpty) {
          return (
            <div key={depot.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-theme py-3">
              <button type="button" onClick={() => onSelect(depot.id)} className="min-w-0 flex-1 text-left">
                {name}
              </button>
              <button
                type="button"
                onClick={() => onImport(depot.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-theme px-3 py-1.5 text-[13px] font-medium text-theme-primary transition-colors hover:bg-theme-hover"
              >
                <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                <span className="sm:hidden">Hochladen</span>
                <span className="hidden sm:inline">CSV/PDF hochladen</span>
              </button>
            </div>
          )
        }

        return (
          <div key={depot.id} className="border-t border-theme py-1">
            <button
              type="button"
              onClick={() => onSelect(depot.id)}
              className={`${rowGrid} -mx-2 w-[calc(100%+1rem)] rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03] ${sample ? 'opacity-70 hover:opacity-100' : ''}`}
            >
              {name}
              <span className="text-right text-[13px] font-medium tabular-nums text-theme-primary">
                {value === undefined ? '…' : formatCurrency(value)}
              </span>
              <span className={`pl-11 text-[12px] tabular-nums sm:pl-0 sm:text-right sm:text-[13px] ${perfColor(summary?.dayGainLoss ?? 0)}`}>
                <span className="mr-1 text-theme-muted sm:hidden">{dayLabel}</span>
                {summary ? signed(summary.dayGainLoss) : ''}
              </span>
              <span className={`text-right text-[12px] tabular-nums sm:text-[13px] ${perfColor(summary?.totalReturn ?? 0)}`}>
                {summary ? signed(summary.totalReturn) : ''}
                {summary && <span className="ml-1.5 hidden text-[11px] lg:inline">{formatPercentage(summary.totalReturnPercent)}</span>}
              </span>
            </button>
          </div>
        )
      })}
    </section>
  )
}
