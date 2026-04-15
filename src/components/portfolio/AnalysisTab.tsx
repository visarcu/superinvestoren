// src/components/portfolio/AnalysisTab.tsx
// Premium Portfolio-Analyse: Konzentration, Asset-Klassen, Sektoren, Top/Worst Performer, Währungen.
'use client'

import React, { useMemo } from 'react'
import { type Holding } from '@/hooks/usePortfolio'
import Logo from '@/components/Logo'
import { isETF, getETFBySymbol } from '@/lib/etfUtils'
import { getSectorFromTicker, translateSector } from '@/utils/sectorUtils'
import { perfColor } from '@/utils/formatters'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartPieIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface AnalysisTabProps {
  holdings: Holding[]
  cashPosition: number
  totalValue: number
  formatCurrency: (amount: number) => string
  formatPercentage: (value: number) => string
  portfolioId?: string
}

// Währung aus Ticker ableiten
function detectCurrency(symbol: string): string {
  const s = symbol.toUpperCase()
  if (s.endsWith('.DE') || s.endsWith('.PA') || s.endsWith('.MI') || s.endsWith('.MC') || s.endsWith('.AS') || s.endsWith('.BR') || s.endsWith('.LS') || s.endsWith('.VI') || s.endsWith('.HE')) return 'EUR'
  if (s.endsWith('.L')) return 'GBP'
  if (s.endsWith('.SW')) return 'CHF'
  if (s.endsWith('.TO')) return 'CAD'
  if (s.endsWith('.AX')) return 'AUD'
  if (s.endsWith('.HK')) return 'HKD'
  if (s.endsWith('.T')) return 'JPY'
  // Default = USD
  return 'USD'
}

// Asset-Klasse ableiten
function detectAssetClass(symbol: string, name: string): 'ETF' | 'Aktie' {
  const isEtf = isETF(symbol) || /etf|index|fund/i.test(name)
  return isEtf ? 'ETF' : 'Aktie'
}

const PALETTE = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6', '#14b8a6']

// Wiederverwendbare Aggregations-Liste
function AggregationCard({
  title,
  subtitle,
  items,
  icon,
}: {
  title: string
  subtitle?: string
  items: { label: string; value: number; percent: number; color: string }[]
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Stacked Bar */}
      {items.length > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-neutral-800/60 mb-4">
          {items.map((item, i) => (
            <div
              key={i}
              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
              title={`${item.label}: ${item.percent.toFixed(1)}%`}
            />
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[12px] text-neutral-200 truncate">{item.label}</span>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <span className="text-[12px] font-medium text-white tabular-nums">{item.percent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalysisTab({
  holdings,
  cashPosition,
  totalValue,
  formatCurrency,
  formatPercentage,
  portfolioId,
}: AnalysisTabProps) {
  const stockValue = useMemo(() => holdings.reduce((s, h) => s + h.value, 0), [holdings])

  // === Konzentration ===
  const concentration = useMemo(() => {
    if (stockValue === 0) return null
    const sorted = [...holdings].sort((a, b) => b.value - a.value)
    const top1 = sorted[0]?.value || 0
    const top3 = sorted.slice(0, 3).reduce((s, h) => s + h.value, 0)
    const top5 = sorted.slice(0, 5).reduce((s, h) => s + h.value, 0)
    const top10 = sorted.slice(0, 10).reduce((s, h) => s + h.value, 0)

    // Herfindahl-Index für Diversifikation (0–10000, niedriger = diversifizierter)
    const hhi = sorted.reduce((s, h) => s + Math.pow((h.value / stockValue) * 100, 2), 0)
    // Score 0–100 für UI: ≤1000 = perfekt diversifiziert, ≥5000 = stark konzentriert
    const diversificationScore = Math.max(0, Math.min(100, 100 - (hhi - 1000) / 50))

    return {
      top1Percent: (top1 / stockValue) * 100,
      top1Symbol: sorted[0]?.symbol || '',
      top3Percent: (top3 / stockValue) * 100,
      top5Percent: (top5 / stockValue) * 100,
      top10Percent: (top10 / stockValue) * 100,
      hhi,
      diversificationScore,
      totalPositions: holdings.length,
    }
  }, [holdings, stockValue])

  // === Asset-Klassen-Verteilung ===
  const assetClasses = useMemo(() => {
    if (stockValue === 0 && cashPosition <= 0) return []
    const classes = new Map<string, number>()
    for (const h of holdings) {
      const c = detectAssetClass(h.symbol, h.name)
      classes.set(c, (classes.get(c) || 0) + h.value)
    }
    if (cashPosition > 0) classes.set('Cash', cashPosition)
    const total = stockValue + Math.max(0, cashPosition)

    return Array.from(classes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percent: (value / total) * 100,
        color: label === 'Cash' ? '#525252' : PALETTE[i % PALETTE.length],
      }))
  }, [holdings, stockValue, cashPosition])

  // === Sektor-Verteilung ===
  const sectors = useMemo(() => {
    if (stockValue === 0) return []
    const map = new Map<string, number>()
    for (const h of holdings) {
      // ETFs erstmal als "ETF" gruppieren — sektoraler Breakdown ist komplex
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

  // === Währungs-Exposure ===
  const currencies = useMemo(() => {
    if (stockValue === 0) return []
    const map = new Map<string, number>()
    for (const h of holdings) {
      const cur = detectCurrency(h.symbol)
      map.set(cur, (map.get(cur) || 0) + h.value)
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

  // === Top/Worst Performer ===
  const performers = useMemo(() => {
    const valid = holdings.filter(h => h.purchase_price_display > 0 && h.gain_loss_percent !== undefined)
    const sortedByPct = [...valid].sort((a, b) => b.gain_loss_percent - a.gain_loss_percent)
    const sortedByAbs = [...valid].sort((a, b) => b.gain_loss - a.gain_loss)
    return {
      topPct: sortedByPct.slice(0, 5),
      worstPct: [...sortedByPct].reverse().slice(0, 5),
      topAbs: sortedByAbs.slice(0, 5),
      worstAbs: [...sortedByAbs].reverse().slice(0, 5),
    }
  }, [holdings])

  if (holdings.length === 0) {
    return (
      <div className="bg-neutral-900/30 rounded-xl border border-neutral-800/80 border-dashed p-12 text-center">
        <ChartPieIcon className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-1 tracking-tight">Keine Daten für Analyse</h3>
        <p className="text-[12px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
          Sobald du Positionen im Depot hast, erscheinen hier detaillierte Analysen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Konzentration */}
      {concentration && (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">Konzentration & Diversifikation</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">{concentration.totalPositions} Position{concentration.totalPositions !== 1 ? 'en' : ''} im Depot</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-800/80 border border-neutral-800/80 rounded-xl overflow-hidden mb-5">
            <div className="bg-neutral-950 p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Größte Position</p>
              <p className="text-xl font-semibold text-white tabular-nums">{concentration.top1Percent.toFixed(1)}%</p>
              <p className="text-[11px] text-neutral-500 mt-1 truncate">{concentration.top1Symbol}</p>
            </div>
            <div className="bg-neutral-950 p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Top 3</p>
              <p className="text-xl font-semibold text-white tabular-nums">{concentration.top3Percent.toFixed(1)}%</p>
              <p className="text-[11px] text-neutral-500 mt-1">vom Wertpapier-Wert</p>
            </div>
            <div className="bg-neutral-950 p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Top 10</p>
              <p className="text-xl font-semibold text-white tabular-nums">{concentration.top10Percent.toFixed(1)}%</p>
              <p className="text-[11px] text-neutral-500 mt-1">vom Wertpapier-Wert</p>
            </div>
            <div className="bg-neutral-950 p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Diversifikation</p>
              <p className={`text-xl font-semibold tabular-nums ${
                concentration.diversificationScore >= 70 ? 'text-emerald-400'
                  : concentration.diversificationScore >= 40 ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {concentration.diversificationScore.toFixed(0)}<span className="text-sm text-neutral-500">/100</span>
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                {concentration.diversificationScore >= 70 ? 'gut diversifiziert'
                  : concentration.diversificationScore >= 40 ? 'mäßig diversifiziert'
                  : 'stark konzentriert'}
              </p>
            </div>
          </div>

          {/* Erklärung */}
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Diversifikations-Score basiert auf dem Herfindahl-Hirschman-Index (HHI) der Wertanteile.
            Höher = breiter gestreut, niedriger = konzentriert auf wenige Positionen.
          </p>
        </div>
      )}

      {/* Asset-Klassen + Währungen nebeneinander */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AggregationCard
          title="Asset-Klassen"
          subtitle={cashPosition > 0 ? 'Inkl. Cash' : 'Wertpapiere'}
          items={assetClasses}
          icon={<ChartPieIcon className="w-3.5 h-3.5 text-neutral-400" />}
        />
        <AggregationCard
          title="Währungs-Exposure"
          subtitle="Original-Notierungswährung der Wertpapiere"
          items={currencies}
          icon={<GlobeAltIcon className="w-3.5 h-3.5 text-neutral-400" />}
        />
      </div>

      {/* Sektor-Verteilung */}
      <AggregationCard
        title="Sektor-Verteilung"
        subtitle="Aktien nach Sektor (ETFs werden gruppiert)"
        items={sectors}
      />

      {/* Top + Worst Performer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-400" />
                Top Performer
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">% Kursgewinn</p>
            </div>
          </div>
          <div>
            {performers.topPct.length === 0 ? (
              <p className="px-5 py-6 text-[12px] text-neutral-500 text-center">Keine Daten</p>
            ) : performers.topPct.map(h => (
              <PerformerRow key={h.id} holding={h} formatCurrency={formatCurrency} portfolioId={portfolioId} />
            ))}
          </div>
        </div>

        {/* Worst */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-400" />
              Schwächste Performer
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">% Kursverlust / niedrigster Gewinn</p>
          </div>
          <div>
            {performers.worstPct.length === 0 ? (
              <p className="px-5 py-6 text-[12px] text-neutral-500 text-center">Keine Daten</p>
            ) : performers.worstPct.map(h => (
              <PerformerRow key={h.id} holding={h} formatCurrency={formatCurrency} portfolioId={portfolioId} />
            ))}
          </div>
        </div>
      </div>

      {/* Größte Gewinner / Verlierer absolut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80">
            <h3 className="text-sm font-semibold text-white tracking-tight">Größte Gewinner (€)</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Absoluter Kursgewinn in EUR</p>
          </div>
          <div>
            {performers.topAbs.map(h => (
              <PerformerRow key={h.id} holding={h} formatCurrency={formatCurrency} mode="abs" portfolioId={portfolioId} />
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80">
            <h3 className="text-sm font-semibold text-white tracking-tight">Größte Verluste (€)</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Absoluter Kursverlust in EUR</p>
          </div>
          <div>
            {performers.worstAbs.map(h => (
              <PerformerRow key={h.id} holding={h} formatCurrency={formatCurrency} mode="abs" portfolioId={portfolioId} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// PerformerRow — gemeinsame Zeile für Performer-Listen
// =====================================================
function PerformerRow({
  holding,
  formatCurrency,
  mode = 'pct',
  portfolioId,
}: {
  holding: Holding
  formatCurrency: (n: number) => string
  mode?: 'pct' | 'abs'
  portfolioId?: string
}) {
  const etfInfo = getETFBySymbol(holding.symbol)
  const displayName = etfInfo?.name || holding.name || holding.symbol
  const href = portfolioId
    ? `/analyse/portfolio/stocks/${holding.symbol.toLowerCase()}?portfolioId=${portfolioId}`
    : `/analyse/stocks/${holding.symbol.toLowerCase()}`

  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Logo ticker={holding.symbol} alt={holding.symbol} className="w-7 h-7 flex-shrink-0" padding="none" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white truncate">{displayName}</p>
          <p className="text-[11px] text-neutral-500 truncate">{holding.symbol}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        {mode === 'pct' ? (
          <>
            <p className={`text-[13px] font-semibold tabular-nums ${perfColor(holding.gain_loss_percent)}`}>
              {holding.gain_loss_percent >= 0 ? '+' : ''}{holding.gain_loss_percent.toFixed(1)}%
            </p>
            <p className={`text-[11px] tabular-nums ${perfColor(holding.gain_loss)}`}>
              {holding.gain_loss >= 0 ? '+' : ''}{formatCurrency(holding.gain_loss)}
            </p>
          </>
        ) : (
          <>
            <p className={`text-[13px] font-semibold tabular-nums ${perfColor(holding.gain_loss)}`}>
              {holding.gain_loss >= 0 ? '+' : ''}{formatCurrency(holding.gain_loss)}
            </p>
            <p className={`text-[11px] tabular-nums ${perfColor(holding.gain_loss_percent)}`}>
              {holding.gain_loss_percent >= 0 ? '+' : ''}{holding.gain_loss_percent.toFixed(1)}%
            </p>
          </>
        )}
      </div>
    </Link>
  )
}
