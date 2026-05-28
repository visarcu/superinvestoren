// src/components/portfolio/PositionsTable.tsx
'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { type Holding, type DepotHistoricalPerf } from '@/hooks/usePortfolio'
import { perfColor } from '@/utils/formatters'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import { getETFBySymbol, formatTER, calculateTERCost } from '@/lib/etfUtils'
import {
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface PositionsTableProps {
  holdings: Holding[]
  cashPosition: number
  totalValue: number
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
  formatPercentage: (value: number) => string
  onEditPosition: (holding: Holding) => void
  onDeletePosition: (holdingId: string) => void
  onTopUpPosition: (holding: Holding) => void
  onEditCash: () => void
  isAllDepotsView: boolean
  portfolioId?: string
  superInvestorCounts?: Record<string, { count: number; investors: { name: string; slug: string }[] }>
  // Historische Performance pro (symbol, portfolio_id) für Ghost-Sub-Rows
  // (Depot hat 0 aktuelle Shares, aber historische Dividenden/Realisiert).
  // Keys: "SYMBOL|PORTFOLIO_ID"
  historicalPerfByDepot?: Map<string, DepotHistoricalPerf>
}

type ReturnRange = 'TOTAL' | '1D' | '1W' | '1M' | '3M' | '1Y'
type PeriodReturn = {
  startDate: string
  startPriceEUR: number
  currentPriceEUR: number
  change: number
  changePercent: number
}

const RETURN_RANGES: Array<{ key: ReturnRange; label: string }> = [
  { key: 'TOTAL', label: 'Seit Kauf' },
  { key: '1D', label: '1T' },
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1J' },
]

// Gruppierte Position für Alle-Depots-Ansicht
interface GroupedPosition {
  symbol: string
  name: string
  totalQuantity: number
  totalValue: number
  totalCostBasis: number
  gainLoss: number
  gainLossPercent: number
  currentPrice: number
  currentPriceDisplay: number
  weightedPurchasePrice: number
  holdings: Holding[] // Einzelne Holdings pro Depot
}

export default function PositionsTable({
  holdings,
  cashPosition,
  totalValue,
  formatCurrency,
  formatStockPrice,
  formatPercentage,
  onEditPosition,
  onDeletePosition,
  onTopUpPosition,
  onEditCash,
  isAllDepotsView,
  portfolioId,
  superInvestorCounts,
  historicalPerfByDepot,
}: PositionsTableProps) {
  const router = useRouter()
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'value' | 'gainLossPercent' | 'gainLoss'>('value')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [returnRange, setReturnRange] = useState<ReturnRange>('TOTAL')
  const [periodReturns, setPeriodReturns] = useState<Record<string, Partial<Record<Exclude<ReturnRange, 'TOTAL'>, PeriodReturn>>>>({})
  const [periodReturnsLoading, setPeriodReturnsLoading] = useState(false)

  useEffect(() => {
    if (holdings.length === 0) {
      setPeriodReturns({})
      return
    }

    const positions = holdings
      .filter(h => h.symbol && h.quantity > 0 && h.current_price_display > 0)
      .map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        currentPriceEUR: h.current_price_display,
      }))

    if (positions.length === 0) {
      setPeriodReturns({})
      return
    }

    let cancelled = false
    setPeriodReturnsLoading(true)

    fetch('/api/portfolio/position-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions,
        timeframes: ['1D', '1W', '1M', '3M', '1Y'],
      }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (cancelled) return
        setPeriodReturns(json?.data || {})
      })
      .catch(() => {
        if (!cancelled) setPeriodReturns({})
      })
      .finally(() => {
        if (!cancelled) setPeriodReturnsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [holdings])

  const getPeriodReturn = (
    symbol: string,
    quantity: number,
    currentPriceEUR: number,
  ): PeriodReturn | null => {
    if (returnRange === 'TOTAL') return null
    const base = periodReturns[symbol]?.[returnRange]
    if (!base || !base.startPriceEUR || base.startPriceEUR <= 0 || !currentPriceEUR || currentPriceEUR <= 0) {
      return null
    }

    const changePerShare = currentPriceEUR - base.startPriceEUR
    return {
      ...base,
      currentPriceEUR,
      change: Math.round(changePerShare * quantity * 100) / 100,
      changePercent: Math.round(((currentPriceEUR / base.startPriceEUR) - 1) * 10000) / 100,
    }
  }

  const getHoldingReturn = (holding: Holding) => {
    const period = getPeriodReturn(holding.symbol, holding.quantity, holding.current_price_display)
    return {
      amount: period?.change ?? holding.gain_loss,
      percent: period?.changePercent ?? holding.gain_loss_percent,
      hasPeriod: returnRange === 'TOTAL' || !!period,
    }
  }

  const getGroupedReturn = (group: GroupedPosition) => {
    const period = getPeriodReturn(group.symbol, group.totalQuantity, group.currentPriceDisplay)
    return {
      amount: period?.change ?? group.gainLoss,
      percent: period?.changePercent ?? group.gainLossPercent,
      hasPeriod: returnRange === 'TOTAL' || !!period,
    }
  }

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  // Gruppierte Positionen für Alle-Depots-Ansicht
  const groupedPositions = useMemo(() => {
    if (!isAllDepotsView) return null

    const groups = new Map<string, GroupedPosition>()
    holdings.forEach(h => {
      const existing = groups.get(h.symbol)
      if (existing) {
        existing.totalQuantity += h.quantity
        existing.totalValue += h.value
        existing.totalCostBasis += h.purchase_price_display * h.quantity
        existing.holdings.push(h)
      } else {
        groups.set(h.symbol, {
          symbol: h.symbol,
          name: h.name,
          totalQuantity: h.quantity,
          totalValue: h.value,
          totalCostBasis: h.purchase_price_display * h.quantity,
          gainLoss: 0, // wird unten berechnet
          gainLossPercent: 0,
          currentPrice: h.current_price,
          currentPriceDisplay: h.current_price_display,
          weightedPurchasePrice: 0,
          holdings: [h],
        })
      }
    })

    // G/V und gewichteter EK berechnen
    groups.forEach(g => {
      g.gainLoss = g.totalValue - g.totalCostBasis
      g.gainLossPercent = g.totalCostBasis > 0 ? (g.gainLoss / g.totalCostBasis) * 100 : 0
      g.weightedPurchasePrice = g.totalQuantity > 0 ? g.totalCostBasis / g.totalQuantity : 0
    })

    return Array.from(groups.values())
  }, [holdings, isAllDepotsView])

  const sortedGroupedPositions = useMemo(() => {
    if (!groupedPositions) return null
    return [...groupedPositions].sort((a, b) => {
      let diff = 0
      if (sortBy === 'value') diff = b.totalValue - a.totalValue
      else if (sortBy === 'gainLoss') diff = getGroupedReturn(b).amount - getGroupedReturn(a).amount
      else if (sortBy === 'gainLossPercent') diff = getGroupedReturn(b).percent - getGroupedReturn(a).percent
      return sortDir === 'desc' ? diff : -diff
    })
  }, [groupedPositions, sortBy, sortDir, returnRange, periodReturns])

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let diff = 0
      if (sortBy === 'value') diff = b.value - a.value
      else if (sortBy === 'gainLoss') diff = getHoldingReturn(b).amount - getHoldingReturn(a).amount
      else if (sortBy === 'gainLossPercent') diff = getHoldingReturn(b).percent - getHoldingReturn(a).percent
      return sortDir === 'desc' ? diff : -diff
    })
  }, [holdings, sortBy, sortDir, returnRange, periodReturns])

  const toggleExpand = (symbol: string) => {
    setExpandedSymbols(prev => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  const handleViewStock = (symbol: string) => {
    if (portfolioId) {
      router.push(`/analyse/portfolio/stocks/${symbol.toLowerCase()}?portfolioId=${portfolioId}&totalValue=${totalValue}`)
    } else {
      router.push(`/analyse/stocks/${symbol.toLowerCase()}`)
    }
  }

  if (holdings.length === 0 && cashPosition <= 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-xl flex items-center justify-center">
          <BriefcaseIcon className="w-8 h-8 text-neutral-600" />
        </div>
        <h3 className="text-base font-medium text-white mb-1">Keine Positionen</h3>
        <p className="text-neutral-500 text-sm">
          Nutze den <span className="text-emerald-400 font-medium">+</span> Button unten rechts, um eine Aktivität hinzuzufügen.
        </p>
      </div>
    )
  }

  // Einzelne Position Row (für Nicht-Alle-Depots oder Sub-Rows)
  const renderHoldingRow = (holding: Holding, index: number, isSubRow: boolean = false) => {
    const percentage = totalValue > 0 ? (holding.value / totalValue) * 100 : 0
    const displayReturn = getHoldingReturn(holding)
    const depotName = holding.portfolio_name
      ? getBrokerDisplayName(holding.broker_type, holding.broker_name)
      : null
    const depotColor = holding.broker_type
      ? getBrokerColor(holding.broker_type, holding.broker_color)
      : '#6B7280'

    return (
      <div
        key={holding.id}
        className={`group grid grid-cols-12 gap-4 items-center py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer ${
          isSubRow ? 'ml-4 bg-neutral-900/20' : ''
        }`}
        onClick={() => handleViewStock(holding.symbol)}
      >
        {/* Aktie */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          {isSubRow ? (
            // Sub-Row: Depot-Info statt Logo
            <>
              <span className="w-5 hidden sm:block flex-shrink-0" />
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-neutral-700/50">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: depotColor }} />
              </div>
              <div className="min-w-0">
                <span className="text-sm text-neutral-300">{depotName || 'Depot'}</span>
                <p className="text-xs text-neutral-500 truncate">
                  {holding.quantity.toLocaleString('de-DE')} × {formatStockPrice(holding.purchase_price_display)}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="w-5 text-xs text-neutral-600 font-medium hidden sm:block flex-shrink-0">{index + 1}</span>
              <Logo ticker={holding.symbol} alt={holding.symbol} className="w-8 h-8 flex-shrink-0" padding="none" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {(() => {
                    const etfInfo = getETFBySymbol(holding.symbol)
                    const displayName = etfInfo?.name || (holding.name && holding.name !== holding.symbol ? holding.name : holding.symbol)
                    return <span className="font-medium text-white text-sm truncate">{displayName}</span>
                  })()}
                  {(superInvestorCounts?.[holding.symbol]?.count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full flex-shrink-0" title={`${superInvestorCounts?.[holding.symbol]?.count ?? 0} Superinvestoren halten diese Aktie`}>
                      <UserGroupIcon className="w-2.5 h-2.5" />
                      {superInvestorCounts?.[holding.symbol]?.count}
                    </span>
                  )}
                  {(() => {
                    const etfInfo = getETFBySymbol(holding.symbol)
                    if (!etfInfo?.ter && etfInfo?.ter !== 0) return null
                    return (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-medium rounded-full flex-shrink-0"
                        title={`TER: ${formatTER(etfInfo.ter)} — Jährl. Kosten: ${formatCurrency(calculateTERCost(holding.value, etfInfo.ter))}`}
                      >
                        TER {formatTER(etfInfo.ter)}
                      </span>
                    )
                  })()}
                </div>
                <p className="text-xs text-neutral-500 truncate">{holding.symbol}{holding.isin ? ` · ${holding.isin}` : ''} · {holding.quantity.toLocaleString('de-DE')} × {formatStockPrice(holding.purchase_price_display)}</p>
              </div>
            </>
          )}
        </div>

        {/* Kurs */}
        <div className="col-span-2 text-right hidden sm:block">
          {!isSubRow && (
            <>
              <p className="text-sm text-neutral-300">{formatStockPrice(holding.current_price_display)}</p>
              <p className="text-xs text-neutral-600">EK: {formatStockPrice(holding.purchase_price_display)}</p>
            </>
          )}
          {isSubRow && (
            <p className="text-xs text-neutral-600">EK: {formatStockPrice(holding.purchase_price_display)}</p>
          )}
        </div>

        {/* Wert */}
        <div className="col-span-2 text-right">
          <p className={`font-medium text-sm ${isSubRow ? 'text-neutral-300' : 'text-white'}`}>{formatCurrency(holding.value)}</p>
        </div>

        {/* Anteil */}
        <div className="col-span-1 text-right hidden sm:block">
          <p className="text-xs text-neutral-400 font-medium">{percentage.toFixed(1)}%</p>
          <div className="mt-1 h-1 bg-neutral-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500/50 rounded-full"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* G/V */}
        <div className="col-span-2 text-right">
          <p className={`text-sm font-medium ${displayReturn.hasPeriod ? perfColor(displayReturn.amount) : 'text-neutral-500'}`}>
            {displayReturn.hasPeriod
              ? `${displayReturn.amount >= 0 ? '+' : ''}${formatCurrency(displayReturn.amount)}`
              : '–'}
          </p>
          <span className={`text-xs ${displayReturn.hasPeriod ? perfColor(displayReturn.percent, 'muted') : 'text-neutral-600'}`}>
            {displayReturn.hasPeriod ? formatPercentage(displayReturn.percent) : 'keine Daten'}
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center justify-end gap-0.5">
          {!isAllDepotsView && !isSubRow && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onTopUpPosition(holding) }}
                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                title="Aufstocken"
              >
                <PlusIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-emerald-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEditPosition(holding) }}
                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                title="Bearbeiten"
              >
                <PencilIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-blue-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeletePosition(holding.id) }}
                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                title="Löschen"
              >
                <XMarkIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Ghost-Entries für dieses Symbol aus historicalPerfByDepot finden:
  // Depots, die das Symbol mal hielten (Dividenden / Realisiert) aber aktuell 0 Shares.
  const getGhostDepotsForSymbol = (symbol: string, activeHoldings: Holding[]): DepotHistoricalPerf[] => {
    if (!historicalPerfByDepot || historicalPerfByDepot.size === 0) return []
    const activePortfolioIds = new Set(activeHoldings.map(h => h.portfolio_id).filter(Boolean))
    const ghosts: DepotHistoricalPerf[] = []
    for (const [key, perf] of historicalPerfByDepot) {
      if (!key.startsWith(`${symbol}|`)) continue
      if (activePortfolioIds.has(perf.portfolioId)) continue
      ghosts.push(perf)
    }
    return ghosts
  }

  // Gruppierte Position Row (Alle-Depots-Ansicht)
  const renderGroupedRow = (group: GroupedPosition, index: number) => {
    const isExpanded = expandedSymbols.has(group.symbol)
    const ghostDepots = getGhostDepotsForSymbol(group.symbol, group.holdings)
    const hasMultipleDepots = group.holdings.length + ghostDepots.length > 1
    const percentage = totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0
    const displayReturn = getGroupedReturn(group)

    return (
      <div key={group.symbol}>
        {/* Aggregierte Zeile */}
        <div
          className="group grid grid-cols-12 gap-4 items-center py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
          onClick={() => handleViewStock(group.symbol)}
        >
          {/* Aktie */}
          <div className="col-span-4 flex items-center gap-3 min-w-0">
            <span className="w-5 text-xs text-neutral-600 font-medium hidden sm:block flex-shrink-0">{index + 1}</span>
            <Logo ticker={group.symbol} alt={group.symbol} className="w-8 h-8 flex-shrink-0" padding="none" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {(() => {
                  const etfInfo = getETFBySymbol(group.symbol)
                  const firstName = group.holdings[0]?.name
                  const displayName = etfInfo?.name || (firstName && firstName !== group.symbol ? firstName : group.symbol)
                  return <span className="font-medium text-white text-sm truncate">{displayName}</span>
                })()}
                {(superInvestorCounts?.[group.symbol]?.count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full flex-shrink-0" title={`${superInvestorCounts?.[group.symbol]?.count ?? 0} Superinvestoren halten diese Aktie`}>
                    <UserGroupIcon className="w-2.5 h-2.5" />
                    {superInvestorCounts?.[group.symbol]?.count}
                  </span>
                )}
                {(() => {
                  const etfInfo = getETFBySymbol(group.symbol)
                  if (!etfInfo?.ter && etfInfo?.ter !== 0) return null
                  return (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-medium rounded-full flex-shrink-0"
                      title={`TER: ${formatTER(etfInfo.ter)} — Jährl. Kosten: ${formatCurrency(calculateTERCost(group.totalValue, etfInfo.ter))}`}
                    >
                      TER {formatTER(etfInfo.ter)}
                    </span>
                  )
                })()}
              </div>
              <p className="text-xs text-neutral-500 truncate">
                {group.symbol}{group.holdings[0]?.isin ? ` · ${group.holdings[0].isin}` : ''} · {group.totalQuantity.toLocaleString('de-DE')} × {formatStockPrice(group.weightedPurchasePrice)}
                {hasMultipleDepots && (
                  <span className="text-neutral-600"> · {group.holdings.length} Depots</span>
                )}
              </p>
            </div>
          </div>

          {/* Kurs */}
          <div className="col-span-2 text-right hidden sm:block">
            <p className="text-sm text-neutral-300">{formatStockPrice(group.currentPriceDisplay)}</p>
            <p className="text-xs text-neutral-600">EK: {formatStockPrice(group.weightedPurchasePrice)}</p>
          </div>

          {/* Wert */}
          <div className="col-span-2 text-right">
            <p className="font-medium text-white text-sm">{formatCurrency(group.totalValue)}</p>
          </div>

          {/* Anteil */}
          <div className="col-span-1 text-right hidden sm:block">
            <p className="text-xs text-neutral-400 font-medium">{percentage.toFixed(1)}%</p>
            <div className="mt-1 h-1 bg-neutral-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500/50 rounded-full"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* G/V */}
          <div className="col-span-2 text-right">
            <p className={`text-sm font-medium ${displayReturn.hasPeriod ? perfColor(displayReturn.amount) : 'text-neutral-500'}`}>
              {displayReturn.hasPeriod
                ? `${displayReturn.amount >= 0 ? '+' : ''}${formatCurrency(displayReturn.amount)}`
                : '–'}
            </p>
            <span className={`text-xs ${displayReturn.hasPeriod ? perfColor(displayReturn.percent, 'muted') : 'text-neutral-600'}`}>
              {displayReturn.hasPeriod ? formatPercentage(displayReturn.percent) : 'keine Daten'}
            </span>
          </div>

          {/* Expand/Collapse Button */}
          <div className="col-span-1 flex items-center justify-end">
            {hasMultipleDepots && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(group.symbol) }}
                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                title={isExpanded ? 'Einklappen' : 'Depots anzeigen'}
              >
                <ChevronDownIcon className={`w-4 h-4 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Sub-Rows: Per-Depot Breakdown (aktive + historische Ghost-Depots) */}
        {isExpanded && hasMultipleDepots && (
          <div className="border-l-2 border-neutral-800 ml-6">
            {group.holdings
              .sort((a, b) => b.value - a.value)
              .map(h => renderHoldingRow(h, 0, true))
            }
            {ghostDepots
              .sort((a, b) => (b.totalDividends + b.totalRealized) - (a.totalDividends + a.totalRealized))
              .map(ghost => renderGhostDepotRow(ghost))
            }
          </div>
        )}
      </div>
    )
  }

  // Ghost-Depot Sub-Row: zeigt ein Depot, in dem das Symbol MAL gehalten wurde,
  // aktuell aber 0 Shares → nur historische Dividenden + Realisiert sind relevant.
  // Analog zu Parqet's "Aus Portfolio: X" Anzeige mit 0 Anteile.
  const renderGhostDepotRow = (ghost: DepotHistoricalPerf) => {
    return (
      <div
        key={`ghost-${ghost.symbol}-${ghost.portfolioId}`}
        className="grid grid-cols-12 gap-4 items-center py-3 border-b border-neutral-800/50 -mx-2 px-2 rounded-lg ml-4 bg-neutral-900/10 opacity-75"
      >
        {/* Depot-Info (statt Logo) */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-center flex-shrink-0">
            <BriefcaseIcon className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-neutral-400 truncate">{ghost.portfolioName}</div>
            <div className="text-[11px] text-neutral-600">0 Anteile · historisch</div>
          </div>
        </div>

        {/* Kurs — leer */}
        <div className="col-span-2 text-right text-[12px] text-neutral-600">—</div>

        {/* Wert — 0 */}
        <div className="col-span-2 text-right">
          <div className="text-[13px] text-neutral-500 tabular-nums">0,00 €</div>
        </div>

        {/* Kursgewinn — 0 */}
        <div className="col-span-1 text-right text-[12px] text-neutral-600">—</div>

        {/* Dividenden / Realisiert (historisch) */}
        <div className="col-span-2 text-right">
          {ghost.totalDividends > 0 && (
            <div className="text-[11px] text-emerald-500/80 tabular-nums">
              +{ghost.totalDividends.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € Div.
            </div>
          )}
          {ghost.totalRealized !== 0 && (
            <div className={`text-[11px] tabular-nums ${ghost.totalRealized >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
              {ghost.totalRealized >= 0 ? '+' : ''}{ghost.totalRealized.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € Real.
            </div>
          )}
        </div>

        {/* Actions — leer */}
        <div className="col-span-1"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-sm font-medium text-neutral-400">Positionen</h2>
        <div className="flex items-center gap-2">
          {periodReturnsLoading && returnRange !== 'TOTAL' && (
            <span className="text-[11px] text-neutral-600">Lädt…</span>
          )}
          <div className="terminal-input flex gap-1 rounded-xl p-0.5">
            {RETURN_RANGES.map(range => (
              <button
                key={range.key}
                onClick={() => setReturnRange(range.key)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  returnRange === range.key
                    ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.085] dark:text-white'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
                title={range.key === 'TOTAL' ? 'Rendite seit Kauf' : `Rendite ${range.label}`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-2 mb-2 text-xs text-neutral-500 font-medium">
        <div className="col-span-4">Aktie</div>
        <div className="col-span-2 text-right">Kurs</div>
        <button onClick={() => handleSort('value')} className={`col-span-2 text-right flex items-center justify-end gap-1 hover:text-neutral-300 transition-colors ${sortBy === 'value' ? 'text-neutral-300' : ''}`}>
          Wert {sortBy === 'value' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </button>
        <div className="col-span-1 text-right">Anteil</div>
        <button onClick={() => handleSort('gainLossPercent')} className={`col-span-2 text-right flex items-center justify-end gap-1 hover:text-neutral-300 transition-colors ${sortBy === 'gainLossPercent' || sortBy === 'gainLoss' ? 'text-neutral-300' : ''}`}>
          {returnRange === 'TOTAL' ? 'G/V' : `Rendite ${RETURN_RANGES.find(r => r.key === returnRange)?.label || returnRange}`} {sortBy === 'gainLossPercent' ? (sortDir === 'desc' ? '↓' : '↑') : sortBy === 'gainLoss' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </button>
        <div className="col-span-1"></div>
      </div>

      {/* Positions List */}
      <div className="space-y-0">
        {isAllDepotsView && sortedGroupedPositions ? (
          // Alle-Depots: Gruppierte Ansicht mit aufklappbaren Positionen
          sortedGroupedPositions.map((group, index) => renderGroupedRow(group, index))
        ) : (
          // Einzeldepot: Normale Ansicht
          sortedHoldings.map((holding, index) => renderHoldingRow(holding, index))
        )}

        {/* Cash Row — auch negative Werte anzeigen (Kredit/Margin) */}
        {cashPosition !== 0 && (
          <div
            className="group grid grid-cols-12 gap-4 items-center py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
            onClick={onEditCash}
          >
            {/* Aktie */}
            <div className="col-span-4 flex items-center gap-3">
              <span className="w-5 text-xs text-neutral-600 font-medium hidden sm:block flex-shrink-0">
                {isAllDepotsView && groupedPositions
                  ? groupedPositions.length + 1
                  : holdings.length + 1}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cashPosition < 0 ? 'bg-red-900/30' : 'bg-neutral-800'}`}>
                <CurrencyDollarIcon className={`w-4 h-4 ${cashPosition < 0 ? 'text-red-400' : 'text-neutral-400'}`} />
              </div>
              <div>
                <span className="font-medium text-white text-sm">Cash</span>
                <p className="text-xs text-neutral-500">
                  {cashPosition < 0 ? 'Kredit/Margin' : 'Verfügbar'}
                </p>
              </div>
            </div>

            {/* Kurs – leer */}
            <div className="col-span-2 hidden sm:block" />

            {/* Wert */}
            <div className="col-span-2 text-right">
              <p className={`font-medium text-sm ${cashPosition < 0 ? 'text-red-400' : 'text-white'}`}>
                {formatCurrency(cashPosition)}
              </p>
            </div>

            {/* Anteil */}
            <div className="col-span-1 text-right hidden sm:block">
              {(() => {
                const cashPercent = totalValue > 0 ? (cashPosition / totalValue) * 100 : 0
                return (
                  <>
                    <p className={`text-xs font-medium ${cashPercent < 0 ? 'text-red-400/70' : 'text-neutral-400'}`}>{cashPercent.toFixed(1)}%</p>
                    {cashPercent > 0 && (
                      <div className="mt-1 h-1 bg-neutral-800/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500/50 rounded-full"
                          style={{ width: `${Math.min(cashPercent, 100)}%` }}
                        />
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* G/V – leer */}
            <div className="col-span-2" />

            {/* Actions – leer */}
            <div className="col-span-1" />
          </div>
        )}
      </div>
    </div>
  )
}
