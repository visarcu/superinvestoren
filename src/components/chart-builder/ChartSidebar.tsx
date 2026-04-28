// src/components/chart-builder/ChartSidebar.tsx
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  ChevronRightIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { stocks } from '@/data/stocks'
import { ActiveMetric, ChartBuilderState, ChartBuilderAction } from './types'
import { METRIC_REGISTRY, METRIC_CATEGORIES, getMetricsByCategory, searchMetrics } from './metricRegistry'
import { getNextColor } from './colors'
import { getMetricDefinition } from './metricRegistry'
import MetricPill from './MetricPill'

interface ChartSidebarProps {
  state: ChartBuilderState
  dispatch: React.Dispatch<ChartBuilderAction>
  maxStocks: number
  maxMetrics: number
  isPremium: boolean
}

export default function ChartSidebar({ state, dispatch, maxStocks, maxMetrics, isPremium }: ChartSidebarProps) {
  const [stockSearch, setStockSearch] = useState('')
  const [metricSearch, setMetricSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('valuation')
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const stockSearchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside handler for stock dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStockDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredStocks = useMemo(() => {
    if (!stockSearch.trim()) return []
    const q = stockSearch.toLowerCase()
    const qUpper = stockSearch.toUpperCase()
    return stocks
      .filter(s =>
        (s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) &&
        !state.stocks.includes(s.ticker)
      )
      .sort((a, b) => {
        const aScore = a.ticker === qUpper ? 0 : a.ticker.startsWith(qUpper) ? 1 : a.name.toLowerCase().startsWith(q) ? 2 : 3
        const bScore = b.ticker === qUpper ? 0 : b.ticker.startsWith(qUpper) ? 1 : b.name.toLowerCase().startsWith(q) ? 2 : 3
        return aScore - bScore
      })
      .slice(0, 8)
  }, [stockSearch, state.stocks])

  const filteredMetrics = useMemo(() => {
    if (metricSearch.trim()) {
      return searchMetrics(metricSearch)
    }
    return getMetricsByCategory(activeCategory)
  }, [metricSearch, activeCategory])

  const addStock = (ticker: string, name: string) => {
    if (state.stocks.length >= maxStocks) return
    dispatch({ type: 'ADD_STOCK', ticker, name })
    setStockSearch('')
    setShowStockDropdown(false)
  }

  const removeStock = (ticker: string) => {
    dispatch({ type: 'REMOVE_STOCK', ticker })
  }

  const addMetricForAllStocks = (metricKey: string) => {
    if (state.stocks.length === 0) return
    const usedColors = state.activeMetrics.map(m => m.color)
    const newMetrics: ActiveMetric[] = []

    for (const ticker of state.stocks) {
      // Skip if already exists
      if (state.activeMetrics.some(m => m.metricKey === metricKey && m.stockTicker === ticker)) continue

      const def = getMetricDefinition(metricKey)
      if (!def) continue

      const color = getNextColor([...usedColors, ...newMetrics.map(m => m.color)])
      const existingUnits = new Set(
        state.activeMetrics
          .filter(m => m.yAxisSide === 'left')
          .map(m => getMetricDefinition(m.metricKey)?.unit)
      )
      const yAxisSide: 'left' | 'right' = existingUnits.size > 0 && !existingUnits.has(def.unit) ? 'right' : 'left'

      newMetrics.push({
        id: `${ticker}_${metricKey}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        metricKey,
        stockTicker: ticker,
        color,
        visible: true,
        yAxisSide,
      })
    }

    if (newMetrics.length > 0) {
      dispatch({ type: 'ADD_METRICS_BULK', metrics: newMetrics })
    }
  }

  const uniqueMetricCount = useMemo(
    () => new Set(state.activeMetrics.map(m => m.metricKey)).size,
    [state.activeMetrics]
  )
  const metricLimitReached = !isPremium && uniqueMetricCount >= maxMetrics

  const isMetricActive = (metricKey: string): boolean => {
    return state.activeMetrics.some(m => m.metricKey === metricKey)
  }

  // Group active metrics by stock
  const metricsByStock = useMemo(() => {
    const groups: Record<string, ActiveMetric[]> = {}
    for (const metric of state.activeMetrics) {
      if (!groups[metric.stockTicker]) groups[metric.stockTicker] = []
      groups[metric.stockTicker].push(metric)
    }
    return groups
  }, [state.activeMetrics])

  return (
    <div className="w-80 border-r border-white/[0.06] flex flex-col overflow-hidden bg-theme-primary">
      {/* Stock Section */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10.5px] font-medium text-white/35 uppercase tracking-widest">Aktien</h3>
          <span className="text-[10.5px] text-white/30 tabular-nums">{state.stocks.length}/{maxStocks}</span>
        </div>

        {/* Upgrade Banner wenn Aktien-Limit erreicht */}
        {state.stocks.length >= maxStocks && !isPremium && (
          <a
            href="/pricing"
            className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 transition-colors"
          >
            <LockClosedIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-[11px] text-amber-300 flex-1">Max. 2 Aktien im Free-Plan</span>
            <span className="text-[10px] text-amber-400 font-medium">Upgrade →</span>
          </a>
        )}

        {/* Stock Search */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
            <input
              ref={stockSearchRef}
              type="text"
              value={stockSearch}
              onChange={e => {
                setStockSearch(e.target.value)
                setShowStockDropdown(true)
              }}
              onFocus={() => setShowStockDropdown(true)}
              placeholder="Aktie suchen..."
              className="w-full pl-9 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12.5px] text-white/85 placeholder:text-white/30 focus:border-white/[0.18] focus:bg-white/[0.04] focus:outline-none transition-colors disabled:opacity-40"
              disabled={state.stocks.length >= maxStocks}
            />
          </div>

          {/* Stock Dropdown */}
          {showStockDropdown && filteredStocks.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-white/[0.08] rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
              {filteredStocks.map(stock => (
                <button
                  key={stock.ticker}
                  onClick={() => addStock(stock.ticker, stock.name)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-theme-primary w-14">{stock.ticker}</span>
                  <span className="text-xs text-theme-secondary truncate flex-1">{stock.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Stocks */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {state.stocks.map(ticker => (
            <div
              key={ticker}
              className="group flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] rounded-lg text-[12px] transition-colors"
            >
              <span className="font-semibold text-white/85">{ticker}</span>
              <button
                onClick={() => removeStock(ticker)}
                className="p-0.5 hover:bg-red-500/15 rounded transition-colors"
                title="Entfernen"
              >
                <XMarkIcon className="w-3 h-3 text-white/40 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Section */}
      <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10.5px] font-medium text-white/35 uppercase tracking-widest">Metriken</h3>
          {!isPremium && (
            <span className="text-[10.5px] text-white/30 tabular-nums">{uniqueMetricCount}/{maxMetrics}</span>
          )}
        </div>

        {/* Upgrade Banner wenn Limit erreicht */}
        {metricLimitReached && (
          <a
            href="/pricing"
            className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 transition-colors"
          >
            <LockClosedIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-[11px] text-amber-300 flex-1">Max. 2 Metriken im Free-Plan</span>
            <span className="text-[10px] text-amber-400 font-medium">Upgrade →</span>
          </a>
        )}

        {/* Metric Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            value={metricSearch}
            onChange={e => setMetricSearch(e.target.value)}
            placeholder="Metrik suchen..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-theme-primary placeholder-theme-muted focus:border-brand/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Category Tabs */}
        {!metricSearch && (
          <div className="flex gap-1 mb-3 overflow-x-auto">
            {METRIC_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-2.5 py-1.5 text-[10.5px] font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-white/[0.08] text-white/85'
                    : 'text-white/35 hover:text-white/65 hover:bg-white/[0.03]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Metric List */}
        <div className="space-y-0.5 max-h-44 overflow-y-auto">
          {filteredMetrics.map(metric => {
            const active = isMetricActive(metric.key)
            const locked = !active && metricLimitReached
            return (
              <button
                key={metric.key}
                onClick={() => !locked && addMetricForAllStocks(metric.key)}
                disabled={state.stocks.length === 0 || locked}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                  active
                    ? 'bg-brand/10 border border-brand/20'
                    : locked
                    ? 'opacity-40 cursor-not-allowed border border-transparent'
                    : 'hover:bg-white/[0.04] border border-transparent'
                } ${state.stocks.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${active ? 'text-brand-light' : 'text-theme-primary'}`}>
                      {metric.label}
                    </span>
                    {active && (
                      <span className="text-[9px] text-brand bg-brand/20 px-1.5 py-0.5 rounded">aktiv</span>
                    )}
                  </div>
                  <span className="text-[10px] text-theme-muted truncate block">
                    {metric.description}
                  </span>
                </div>
                {!active && state.stocks.length > 0 && (
                  locked
                    ? <LockClosedIcon className="w-3.5 h-3.5 text-theme-muted flex-shrink-0" />
                    : <PlusIcon className="w-4 h-4 text-theme-muted flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Series */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-[10.5px] font-medium text-white/35 uppercase tracking-widest mb-3">
          Aktive Serien <span className="text-white/25 tabular-nums normal-case">({state.activeMetrics.length})</span>
        </h3>

        {state.activeMetrics.length === 0 ? (
          <p className="text-[10px] text-theme-muted">
            Keine Metriken ausgewählt. Wähle oben eine Metrik aus.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(metricsByStock).map(([ticker, metrics]) => (
              <div key={ticker}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">{ticker}</span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                </div>
                <div className="space-y-1">
                  {metrics.map(metric => (
                    <MetricPill
                      key={metric.id}
                      metric={metric}
                      onToggleVisibility={id => dispatch({ type: 'TOGGLE_METRIC_VISIBILITY', id })}
                      onRemove={id => dispatch({ type: 'REMOVE_METRIC', id })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
