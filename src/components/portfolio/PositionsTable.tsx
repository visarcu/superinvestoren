// src/components/portfolio/PositionsTable.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { type Holding } from '@/hooks/usePortfolio'
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
}

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
  superInvestorCounts
}: PositionsTableProps) {
  const router = useRouter()
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set())

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

    return Array.from(groups.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [holdings, isAllDepotsView])

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.value - a.value)
  }, [holdings])

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
                  <span className="font-medium text-white text-sm">{holding.symbol}</span>
                  {(superInvestorCounts?.[holding.symbol]?.count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full" title={`${superInvestorCounts?.[holding.symbol]?.count ?? 0} Superinvestoren halten diese Aktie`}>
                      <UserGroupIcon className="w-2.5 h-2.5" />
                      {superInvestorCounts?.[holding.symbol]?.count}
                    </span>
                  )}
                  {(() => {
                    const etfInfo = getETFBySymbol(holding.symbol)
                    if (!etfInfo?.ter && etfInfo?.ter !== 0) return null
                    return (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-medium rounded-full"
                        title={`TER: ${formatTER(etfInfo.ter)} — Jährl. Kosten: ${formatCurrency(calculateTERCost(holding.value, etfInfo.ter))}`}
                      >
                        TER {formatTER(etfInfo.ter)}
                      </span>
                    )
                  })()}
                </div>
                {(() => {
                  const etfInfo = getETFBySymbol(holding.symbol)
                  if (etfInfo) {
                    return (
                      <p className="text-xs text-violet-400/70 truncate">{etfInfo.name}</p>
                    )
                  }
                  return null
                })()}
                <p className="text-xs text-neutral-500 truncate">
                  {holding.quantity.toLocaleString('de-DE')} × {formatStockPrice(holding.purchase_price_display)}
                </p>
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
          <p className={`text-sm font-medium ${perfColor(holding.gain_loss)}`}>
            {holding.gain_loss >= 0 ? '+' : ''}{formatCurrency(holding.gain_loss)}
          </p>
          <span className={`text-xs ${perfColor(holding.gain_loss_percent, 'muted')}`}>
            {formatPercentage(holding.gain_loss_percent)}
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

  // Gruppierte Position Row (Alle-Depots-Ansicht)
  const renderGroupedRow = (group: GroupedPosition, index: number) => {
    const isExpanded = expandedSymbols.has(group.symbol)
    const hasMultipleDepots = group.holdings.length > 1
    const percentage = totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0

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
                <span className="font-medium text-white text-sm">{group.symbol}</span>
                {(superInvestorCounts?.[group.symbol]?.count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full" title={`${superInvestorCounts?.[group.symbol]?.count ?? 0} Superinvestoren halten diese Aktie`}>
                    <UserGroupIcon className="w-2.5 h-2.5" />
                    {superInvestorCounts?.[group.symbol]?.count}
                  </span>
                )}
                {(() => {
                  const etfInfo = getETFBySymbol(group.symbol)
                  if (!etfInfo?.ter && etfInfo?.ter !== 0) return null
                  return (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-medium rounded-full"
                      title={`TER: ${formatTER(etfInfo.ter)} — Jährl. Kosten: ${formatCurrency(calculateTERCost(group.totalValue, etfInfo.ter))}`}
                    >
                      TER {formatTER(etfInfo.ter)}
                    </span>
                  )
                })()}
              </div>
              {(() => {
                const etfInfo = getETFBySymbol(group.symbol)
                if (etfInfo) {
                  return (
                    <p className="text-xs text-violet-400/70 truncate">{etfInfo.name}</p>
                  )
                }
                return null
              })()}
              <p className="text-xs text-neutral-500 truncate">
                {group.totalQuantity.toLocaleString('de-DE')} × {formatStockPrice(group.weightedPurchasePrice)}
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
            <p className={`text-sm font-medium ${perfColor(group.gainLoss)}`}>
              {group.gainLoss >= 0 ? '+' : ''}{formatCurrency(group.gainLoss)}
            </p>
            <span className={`text-xs ${perfColor(group.gainLossPercent, 'muted')}`}>
              {formatPercentage(group.gainLossPercent)}
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

        {/* Sub-Rows: Per-Depot Breakdown */}
        {isExpanded && hasMultipleDepots && (
          <div className="border-l-2 border-neutral-800 ml-6">
            {group.holdings
              .sort((a, b) => b.value - a.value)
              .map(h => renderHoldingRow(h, 0, true))
            }
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-neutral-400">Positionen</h2>
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-2 mb-2 text-xs text-neutral-500 font-medium">
        <div className="col-span-4">Aktie</div>
        <div className="col-span-2 text-right">Kurs</div>
        <div className="col-span-2 text-right">Wert</div>
        <div className="col-span-1 text-right">Anteil</div>
        <div className="col-span-2 text-right">G/V</div>
        <div className="col-span-1"></div>
      </div>

      {/* Positions List */}
      <div className="space-y-0">
        {isAllDepotsView && groupedPositions ? (
          // Alle-Depots: Gruppierte Ansicht mit aufklappbaren Positionen
          groupedPositions.map((group, index) => renderGroupedRow(group, index))
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
