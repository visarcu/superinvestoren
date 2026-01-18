// src/components/InvestorTabs.tsx - KOMPLETT SCHWARZ/GRAU THEME (KEIN BLAU)
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  ArrowsRightLeftIcon,
  ChartPieIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { stocks, Stock } from '@/data/stocks'
import Logo from '@/components/Logo'
import { useCurrency } from '@/lib/CurrencyContext'

interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  deltaShares: number
  pctDelta: number
  ticker?: string
  prevValue?: number
  prevShares?: number
  // ✅ Option-Informationen (passend zu Burry JSON)
  optionType?: 'STOCK' | 'CALL' | 'PUT' | 'OPTION'
  typeInfo?: {
    label: string
    emoji: string
    sentiment: 'bullish' | 'bearish' | 'neutral'
  }
  titleOfClass?: string | null
  putCall?: string | null
}

interface HistoryGroup {
  period: string
  items: Position[]
}

export type Tab = 'portfolio' | 'transactions' | 'analytics' | 'filings' | 'ai'

type TransactionFilter = 'all' | 'buys' | 'sells'

interface TabConfig {
  key: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
  isHighlighted?: boolean
  description?: string
}

const cusipToTicker: Record<string,string> = {}
;(stocks as Stock[]).forEach(s => {
  if (s.cusip) cusipToTicker[s.cusip] = s.ticker
})

export default function InvestorTabs({
  tab,
  onTabChange,
  holdings,
  buys,
  sells,
}: {
  tab: Tab
  onTabChange: (t: Tab) => void
  holdings: Position[]
  buys: HistoryGroup[]
  sells: HistoryGroup[]
}) {
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all')
  const [showAll, setShowAll] = useState(false)
  
  // Currency Formatting aus Context
  const { formatCurrency, formatShares, formatPercentage } = useCurrency()

  const getTabsForInvestor = (): TabConfig[] => {
    const baseTabs: TabConfig[] = [
      { 
        key: 'portfolio', 
        label: 'Portfolio', 
        icon: ChartBarIcon,
        description: 'Aktuelle Bestände & Übersicht'
      },
      { 
        key: 'transactions', 
        label: 'Transaktionen', 
        icon: ArrowsRightLeftIcon,
        description: 'Käufe & Verkäufe'
      },
    ]


    baseTabs.push(
      { 
        key: 'analytics', 
        label: 'Analytics', 
        icon: ChartPieIcon,
        description: 'Sektoren & Deep Analysis'
      },
      { 
        key: 'filings', 
        label: 'Filings', 
        icon: DocumentTextIcon,
        description: '13F Dokumente & Filing-Historie'
      },
      { 
        key: 'ai', 
        label: 'AI Chat', 
        icon: SparklesIcon,
        description: 'Intelligente Portfolio-Analyse'
      }
    )

    return baseTabs
  }

  const availableTabs = getTabsForInvestor()

  // Verwende Context-Formatter für konsistente deutsche Formatierung
  const fmtShares = formatShares
  const fmtValue = formatCurrency
  const fmtPercent = (value: number) => formatPercentage(value * 100, false)

  const allTransactions: HistoryGroup[] = buys.map((bGroup, idx) => {
    const sGroup = sells[idx] || { period: bGroup.period, items: [] }
    return {
      period: bGroup.period,
      items: [...bGroup.items, ...sGroup.items].sort((a, b) => {
        // Calculate transaction value (change in shares * estimated price per share)
        const aTransactionValue = Math.abs(a.deltaShares * (a.value / a.shares))
        const bTransactionValue = Math.abs(b.deltaShares * (b.value / b.shares))
        return bTransactionValue - aTransactionValue
      }),
    }
  })

  const getFilteredTransactions = (): HistoryGroup[] => {
    const sortByTransactionValue = (items: Position[]) => {
      return [...items].sort((a, b) => {
        // Calculate transaction value (change in shares * estimated price per share)
        const aTransactionValue = Math.abs(a.deltaShares * (a.value / a.shares))
        const bTransactionValue = Math.abs(b.deltaShares * (b.value / b.shares))
        return bTransactionValue - aTransactionValue
      })
    }

    switch (transactionFilter) {
      case 'buys': 
        return buys.map(group => ({
          ...group,
          items: sortByTransactionValue(group.items)
        }))
      case 'sells': 
        return sells.map(group => ({
          ...group,
          items: sortByTransactionValue(group.items)
        }))
      default: return allTransactions
    }
  }

  const displayedHoldings = showAll ? holdings : holdings.slice(0, 20)

  const getTicker = (position: Position): string | undefined => {
    if (position.ticker) return position.ticker
    return cusipToTicker[position.cusip]
  }

  const getCleanCompanyName = (position: Position): string => {
    let name = position.name
    const ticker = getTicker(position)
    
    if (ticker && name) {
      if (name.startsWith(`${ticker} - `)) {
        return name.substring(ticker.length + 3)
      }
      if (name.startsWith(`${ticker} – `)) {
        return name.substring(ticker.length + 3)
      }
      if (name === ticker) {
        return ticker
      }
    }
    
    return name
  }

  // ✅ WICHTIG: Name & Ticker mit Option-Anzeige und komplett schwarzem Theme
  const NameAndTicker = ({ position }: { position: Position }) => {
    const ticker = getTicker(position)
    const cleanName = getCleanCompanyName(position)
    
    // ✅ Option Type aus JSON lesen
    const optionType = position.optionType || 'STOCK'
    const showOptionBadge = optionType !== 'STOCK'
    
    if (ticker) {
      return (
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
          className="flex items-center gap-3 group"
        >
          <div className="w-7 h-7 flex-shrink-0">
            <Logo
              ticker={ticker}
              alt={`${ticker} Logo`}
              className="w-full h-full rounded-md"
              padding="none"
            />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-brand-light group-hover:text-green-300 transition-colors">
                {ticker}
              </span>
              
              {/* ✅ PUT/CALL BADGE - Verbesserte Styling */}
              {showOptionBadge && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                  optionType === 'PUT' 
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' 
                    : optionType === 'CALL'
                      ? 'bg-brand/20 text-green-300 border-green-500/30'
                      : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}>
                  <span className="text-xs">
                    {optionType === 'PUT' ? '📉' : optionType === 'CALL' ? '📈' : '⚡'}
                  </span>
                  {optionType}
                </span>
              )}
            </div>
            
            {cleanName !== ticker && (
              <div className="text-sm text-gray-400 font-normal truncate max-w-xs">
                {cleanName}
              </div>
            )}
            
            {/* ✅ Zusätzliche Option-Details */}
            {position.titleOfClass && showOptionBadge && (
              <div className="text-xs text-gray-500 truncate max-w-xs">
                {position.titleOfClass}
              </div>
            )}
          </div>
        </Link>
      )
    }
    
    return (
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 flex-shrink-0 bg-gray-700 rounded-md flex items-center justify-center">
          <span className="text-gray-500 text-xs font-bold">?</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium">{cleanName}</span>
            {showOptionBadge && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                optionType === 'PUT' 
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' 
                  : optionType === 'CALL'
                    ? 'bg-brand/20 text-green-300 border-green-500/30'
                    : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
              }`}>
                <span className="text-xs">
                  {optionType === 'PUT' ? '📉' : optionType === 'CALL' ? '📈' : '⚡'}
                </span>
                {optionType}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Tab Navigation - Fey/Quartr Pill Style */}
      <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
        {availableTabs.map(({ key, label, icon: Icon, description }) => {
          const isActive = tab === key
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-theme-card text-theme-primary shadow-sm'
                  : 'text-theme-muted hover:text-theme-secondary'
              }`}
              title={description}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab Content - Theme-aware */}
      {tab === 'portfolio' || tab === 'transactions' ? (
        <div className="bg-theme-card border border-white/[0.06] rounded-xl overflow-hidden mt-6">

          {/* PORTFOLIO TAB */}
          {tab === 'portfolio' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-sm text-theme-muted border-b border-white/[0.06]">
                    <th className="text-left px-5 py-4 font-medium">Unternehmen</th>
                    <th className="text-right px-5 py-4 font-medium">Aktien</th>
                    <th className="text-right px-5 py-4 font-medium">Wert (USD)</th>
                    <th className="text-right px-5 py-4 font-medium">Anteil</th>
                    <th className="text-right px-5 py-4 font-medium">Aktivität</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHoldings.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/[0.04] hover:bg-theme-hover transition-colors"
                    >
                      <td className="px-5 py-4">
                        <NameAndTicker position={p} />
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-theme-secondary text-sm">
                        {fmtShares(p.shares)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-medium text-theme-primary text-sm">
                        {fmtValue(p.value)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-theme-secondary text-sm">
                        {fmtPercent(p.value / holdings.reduce((s,x)=>s+x.value,0))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.deltaShares > 0
                          ? (p.pctDelta === 0
                              ? <span className="text-emerald-400 text-sm font-medium">Neu</span>
                              : <span className="text-emerald-400 text-sm font-medium">+{fmtPercent(p.pctDelta)}</span>
                            )
                          : p.deltaShares < 0
                            ? <span className="text-red-400 text-sm font-medium">-{fmtPercent(Math.abs(p.pctDelta))}</span>
                            : <span className="text-theme-muted text-sm">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {holdings.length > 20 && (
                <div className="border-t border-white/[0.06] p-4 text-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-4 py-2 text-sm rounded-lg bg-theme-secondary/30 hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors font-medium"
                  >
                    {showAll
                      ? 'Weniger anzeigen'
                      : `Alle ${holdings.length} Positionen`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB - Fey/Quartr Style */}
          {tab === 'transactions' && (
            <div>
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.06]">
                <span className="text-xs text-theme-muted mr-2">Filter:</span>
                {[
                  { key: 'all' as TransactionFilter, label: 'Alle', count: allTransactions.reduce((sum, g) => sum + g.items.length, 0) },
                  { key: 'buys' as TransactionFilter, label: 'Käufe', count: buys.reduce((sum, g) => sum + g.items.length, 0) },
                  { key: 'sells' as TransactionFilter, label: 'Verkäufe', count: sells.reduce((sum, g) => sum + g.items.length, 0) },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTransactionFilter(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      transactionFilter === key
                        ? 'bg-theme-card text-theme-primary border border-white/[0.08]'
                        : 'text-theme-muted hover:text-theme-secondary'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-sm text-theme-muted border-b border-white/[0.06]">
                      <th className="text-left px-5 py-4 font-medium">Unternehmen</th>
                      <th className="text-right px-5 py-4 font-medium">Δ Aktien</th>
                      <th className="text-right px-5 py-4 font-medium">Wert</th>
                      <th className="text-right px-5 py-4 font-medium">Typ</th>
                      <th className="text-right px-5 py-4 font-medium">Veränderung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTransactions().map((group, gi) => (
                      <React.Fragment key={gi}>
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-3 border-t border-white/[0.06] bg-theme-secondary/20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-theme-primary">{group.period}</span>
                              <span className="text-xs text-theme-muted">
                                ({group.items.length} Transaktionen)
                              </span>
                            </div>
                          </td>
                        </tr>

                        {group.items.length > 0
                          ? group.items.map((p, i) => (
                              <tr key={i} className="border-b border-white/[0.04] hover:bg-theme-hover transition-colors">
                                <td className="px-5 py-4">
                                  <NameAndTicker position={p} />
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className={`text-sm font-medium ${
                                    p.deltaShares > 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {p.deltaShares > 0 ? '+' : ''}{formatShares(p.deltaShares)}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className="text-theme-primary font-mono text-sm">
                                    {(() => {
                                      // Bei 100% Verkauf (shares = 0) verwende Preis aus dem vorherigen Quartal
                                      if (p.shares === 0 && p.prevShares && p.prevValue) {
                                        // Kompletter Verkauf - berechne mit dem Preis aus dem vorherigen Quartal
                                        const prevPricePerShare = p.prevValue / p.prevShares
                                        const transactionValue = Math.abs(p.deltaShares) * prevPricePerShare
                                        return formatCurrency(transactionValue)
                                      }
                                      if (p.shares === 0) {
                                        return '—'
                                      }
                                      const transactionValue = Math.abs(p.deltaShares * (p.value / p.shares))
                                      return formatCurrency(transactionValue)
                                    })()}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className={`text-sm ${
                                    p.deltaShares > 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {p.deltaShares > 0 ? 'Kauf' : 'Verkauf'}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right text-theme-secondary text-sm">
                                  {(() => {
                                    const prevShares = p.shares - p.deltaShares
                                    if (prevShares === 0) {
                                      return <span className="text-emerald-400">Neu</span>
                                    }
                                    return formatPercentage(Math.abs(p.pctDelta) * 100, false)
                                  })()}
                                </td>
                              </tr>
                            ))
                          : (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center">
                                <p className="text-sm text-theme-muted">
                                  {transactionFilter === 'buys'
                                    ? 'Keine Käufe in diesem Quartal'
                                    : transactionFilter === 'sells'
                                      ? 'Keine Verkäufe in diesem Quartal'
                                      : 'Keine Transaktionen in diesem Quartal'}
                                </p>
                              </td>
                            </tr>
                          )
                        }
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Content für dividends, analytics, filings, ai wird in parent page.tsx gehandhabt */}
        </div>
      )}
    </div>
  )
}