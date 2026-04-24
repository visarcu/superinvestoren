'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { Holding } from '../_lib/types'
import { isETF } from '@/lib/etfUtils'
import { getSectorFromTicker, translateSector } from '@/utils/sectorUtils'

interface AnalysisTabProps {
  holdings: Holding[]
  cashPosition: number
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

// Fey-Palette — dezent
const PALETTE = [
  '#4ade80',
  '#60a5fa',
  '#c084fc',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#a3e635',
  '#f97316',
  '#a78bfa',
  '#34d399',
]
const CASH_COLOR = 'rgba(255,255,255,0.22)'

function detectCurrency(symbol: string): string {
  const s = symbol.toUpperCase()
  if (
    s.endsWith('.DE') ||
    s.endsWith('.PA') ||
    s.endsWith('.MI') ||
    s.endsWith('.MC') ||
    s.endsWith('.AS') ||
    s.endsWith('.BR') ||
    s.endsWith('.LS') ||
    s.endsWith('.VI') ||
    s.endsWith('.HE')
  )
    return 'EUR'
  if (s.endsWith('.L')) return 'GBP'
  if (s.endsWith('.SW')) return 'CHF'
  if (s.endsWith('.TO')) return 'CAD'
  if (s.endsWith('.AX')) return 'AUD'
  if (s.endsWith('.HK')) return 'HKD'
  if (s.endsWith('.T')) return 'JPY'
  return 'USD'
}

function detectRegion(symbol: string): string {
  const s = symbol.toUpperCase()
  if (s.endsWith('.DE')) return 'Deutschland'
  if (s.endsWith('.PA')) return 'Frankreich'
  if (s.endsWith('.MI')) return 'Italien'
  if (s.endsWith('.MC')) return 'Spanien'
  if (s.endsWith('.AS')) return 'Niederlande'
  if (s.endsWith('.BR')) return 'Belgien'
  if (s.endsWith('.LS')) return 'Portugal'
  if (s.endsWith('.VI')) return 'Österreich'
  if (s.endsWith('.HE')) return 'Finnland'
  if (s.endsWith('.L')) return 'UK'
  if (s.endsWith('.SW')) return 'Schweiz'
  if (s.endsWith('.TO')) return 'Kanada'
  if (s.endsWith('.AX')) return 'Australien'
  if (s.endsWith('.HK')) return 'Hongkong'
  if (s.endsWith('.T')) return 'Japan'
  return 'USA'
}

type AggItem = { label: string; value: number; percent: number; color: string }

export default function AnalysisTab({
  holdings,
  cashPosition,
  formatCurrency,
  formatPercentage,
}: AnalysisTabProps) {
  const stockValue = useMemo(() => holdings.reduce((s, h) => s + h.value, 0), [holdings])

  // === Konzentration ===
  const concentration = useMemo(() => {
    if (stockValue === 0) return null
    const sorted = [...holdings].sort((a, b) => b.value - a.value)
    const top1 = sorted[0]?.value || 0
    const top3 = sorted.slice(0, 3).reduce((s, h) => s + h.value, 0)
    const top10 = sorted.slice(0, 10).reduce((s, h) => s + h.value, 0)

    const hhi = sorted.reduce((s, h) => s + Math.pow((h.value / stockValue) * 100, 2), 0)
    const diversificationScore = Math.max(0, Math.min(100, 100 - (hhi - 1000) / 50))

    return {
      top1Percent: (top1 / stockValue) * 100,
      top1Symbol: sorted[0]?.symbol || '',
      top3Percent: (top3 / stockValue) * 100,
      top10Percent: (top10 / stockValue) * 100,
      diversificationScore,
      totalPositions: holdings.length,
    }
  }, [holdings, stockValue])

  // === Asset-Klassen ===
  const assetClasses = useMemo<AggItem[]>(() => {
    if (stockValue === 0 && cashPosition <= 0) return []
    const classes = new Map<string, number>()
    for (const h of holdings) {
      const label = isETF(h.symbol) || /etf|index|fund/i.test(h.name) ? 'ETF' : 'Aktie'
      classes.set(label, (classes.get(label) || 0) + h.value)
    }
    if (cashPosition > 0) classes.set('Cash', cashPosition)
    const total = stockValue + Math.max(0, cashPosition)

    return Array.from(classes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percent: (value / total) * 100,
        color: label === 'Cash' ? CASH_COLOR : PALETTE[i % PALETTE.length],
      }))
  }, [holdings, stockValue, cashPosition])

  // === Sektoren ===
  const sectors = useMemo<AggItem[]>(() => {
    if (stockValue === 0) return []
    const map = new Map<string, number>()
    for (const h of holdings) {
      let sector: string
      if (isETF(h.symbol)) {
        sector = 'ETFs / Fonds'
      } else {
        sector = translateSector(getSectorFromTicker(h.symbol)) || 'Sonstige'
      }
      map.set(sector, (map.get(sector) || 0) + h.value)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percent: (value / stockValue) * 100,
        color: PALETTE[i % PALETTE.length],
      }))
  }, [holdings, stockValue])

  // === Regionen ===
  const regions = useMemo<AggItem[]>(() => {
    if (stockValue === 0) return []
    const map = new Map<string, number>()
    for (const h of holdings) {
      const r = detectRegion(h.symbol)
      map.set(r, (map.get(r) || 0) + h.value)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percent: (value / stockValue) * 100,
        color: PALETTE[i % PALETTE.length],
      }))
  }, [holdings, stockValue])

  // === Währungen ===
  const currencies = useMemo<AggItem[]>(() => {
    if (stockValue === 0) return []
    const map = new Map<string, number>()
    for (const h of holdings) {
      const c = detectCurrency(h.symbol)
      map.set(c, (map.get(c) || 0) + h.value)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percent: (value / stockValue) * 100,
        color: PALETTE[i % PALETTE.length],
      }))
  }, [holdings, stockValue])

  // === Performer ===
  const performers = useMemo(() => {
    const valid = holdings.filter(
      h => h.purchase_price_display > 0 && h.gain_loss_percent !== undefined
    )
    const sortedPct = [...valid].sort((a, b) => b.gain_loss_percent - a.gain_loss_percent)
    return {
      topPct: sortedPct.slice(0, 5),
      worstPct: [...sortedPct].reverse().slice(0, 5),
    }
  }, [holdings])

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] border-dashed p-12 text-center">
        <p className="text-[13px] font-semibold text-white/70 tracking-tight mb-1">
          Keine Daten für Analyse
        </p>
        <p className="text-[11px] text-white/30">
          Sobald du Positionen im Depot hast, erscheinen hier detaillierte Analysen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Konzentration */}
      {concentration && (
        <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
          <div className="px-6 py-4 border-b border-white/[0.04]">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">
                Konzentration
              </h2>
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
                {concentration.totalPositions} Positionen
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
            <ConcentrationCell
              label="Größte Position"
              value={`${concentration.top1Percent.toFixed(1).replace('.', ',')}%`}
              hint={concentration.top1Symbol}
            />
            <ConcentrationCell
              label="Top 3"
              value={`${concentration.top3Percent.toFixed(1).replace('.', ',')}%`}
              hint="des Aktien-Werts"
            />
            <ConcentrationCell
              label="Top 10"
              value={`${concentration.top10Percent.toFixed(1).replace('.', ',')}%`}
              hint="des Aktien-Werts"
            />
            <ConcentrationCell
              label="Diversifikation"
              value={`${concentration.diversificationScore.toFixed(0)}`}
              unit="/100"
              valueClass={
                concentration.diversificationScore >= 70
                  ? 'text-emerald-400'
                  : concentration.diversificationScore >= 40
                    ? 'text-amber-400'
                    : 'text-red-400'
              }
              hint={
                concentration.diversificationScore >= 70
                  ? 'gut diversifiziert'
                  : concentration.diversificationScore >= 40
                    ? 'mäßig diversifiziert'
                    : 'stark konzentriert'
              }
            />
          </div>

          <p className="px-6 py-3 text-[10px] text-white/30 leading-relaxed">
            Diversifikation basiert auf dem Herfindahl-Hirschman-Index (HHI) der Wertanteile.
          </p>
        </section>
      )}

      {/* Asset-Klassen + Währungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AggregationCard
          title="Asset-Klassen"
          subtitle={cashPosition > 0 ? 'Inkl. Cash' : 'Wertpapiere'}
          items={assetClasses}
          formatCurrency={formatCurrency}
        />
        <AggregationCard
          title="Währungen"
          subtitle="Original-Notierung"
          items={currencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Sektoren + Regionen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AggregationCard
          title="Sektor-Verteilung"
          subtitle="Aktien nach Sektor"
          items={sectors}
          formatCurrency={formatCurrency}
        />
        <AggregationCard
          title="Regionen"
          subtitle="Listing-Land"
          items={regions}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Top + Worst Performer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PerformerCard
          title="Top Performer"
          subtitle="Prozentualer Gewinn"
          tone="emerald"
          holdings={performers.topPct}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
        <PerformerCard
          title="Schwächste Performer"
          subtitle="Prozentualer Verlust"
          tone="red"
          holdings={performers.worstPct}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      </div>
    </div>
  )
}

function ConcentrationCell({
  label,
  value,
  unit,
  hint,
  valueClass,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  valueClass?: string
}) {
  return (
    <div className="bg-[#0a0a12] p-4">
      <p className="text-[9px] font-medium text-white/30 uppercase tracking-[0.14em]">{label}</p>
      <p
        className={`text-xl font-semibold tabular-nums mt-2 tracking-tight ${
          valueClass ?? 'text-white'
        }`}
      >
        {value}
        {unit && <span className="text-xs text-white/30 ml-0.5">{unit}</span>}
      </p>
      {hint && <p className="text-[10px] text-white/35 mt-1 truncate">{hint}</p>}
    </div>
  )
}

function AggregationCard({
  title,
  subtitle,
  items,
  formatCurrency,
}: {
  title: string
  subtitle?: string
  items: AggItem[]
  formatCurrency: (v: number) => string
}) {
  if (items.length === 0) return null

  return (
    <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-[13px] font-semibold text-white/90 tracking-tight">{title}</h3>
          {subtitle && (
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Stacked Bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
          {items.map((item, i) => (
            <div
              key={i}
              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
              title={`${item.label}: ${item.percent.toFixed(1).replace('.', ',')}%`}
            />
          ))}
        </div>

        {/* Liste */}
        <div className="flex flex-col gap-px">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-white/[0.025] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.color, boxShadow: `0 0 10px ${item.color}55` }}
                />
                <span className="text-[12px] text-white/80 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11px] text-white/35 tabular-nums">
                  {formatCurrency(item.value)}
                </span>
                <span className="text-[12px] font-semibold text-white tabular-nums w-12 text-right">
                  {item.percent.toFixed(1).replace('.', ',')}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PerformerCard({
  title,
  subtitle,
  tone,
  holdings,
  formatCurrency,
  formatPercentage,
}: {
  title: string
  subtitle?: string
  tone: 'emerald' | 'red'
  holdings: Holding[]
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}) {
  return (
    <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-[13px] font-semibold text-white/90 tracking-tight flex items-center gap-2">
            <svg
              className={`w-3.5 h-3.5 ${tone === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  tone === 'emerald'
                    ? 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941'
                    : 'M2.25 6l6.75 6.75L13.5 8.25 20.25 15m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941'
                }
              />
            </svg>
            {title}
          </h3>
          {subtitle && (
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div>
        {holdings.length === 0 ? (
          <p className="px-6 py-8 text-[12px] text-white/30 text-center">Keine Daten</p>
        ) : (
          holdings.map((h, i) => {
            const positive = h.gain_loss_percent >= 0
            return (
              <Link
                key={h.id}
                href={`/analyse/mein-portfolio/aktien/${h.symbol}`}
                className={`
                  flex items-center justify-between gap-3 px-6 py-3
                  ${i > 0 ? 'border-t border-white/[0.04]' : ''}
                  hover:bg-white/[0.02] transition-colors group
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-[7px] bg-white/[0.04] border border-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/v1/logo/${h.symbol}?size=60`}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white/85 group-hover:text-white tracking-tight truncate">
                      {h.symbol}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">{h.name}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-[13px] font-semibold tabular-nums ${
                      positive ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {formatPercentage(h.gain_loss_percent)}
                  </p>
                  <p
                    className={`text-[10px] tabular-nums ${
                      positive ? 'text-emerald-400/60' : 'text-red-400/60'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {formatCurrency(h.gain_loss)}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
