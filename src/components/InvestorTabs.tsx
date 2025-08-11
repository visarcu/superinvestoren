// src/components/InvestorTabs.tsx - KOMPLETT SCHWARZ/GRAU THEME (KEIN BLAU)
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { stocks, Stock } from '@/data/stocks'
import Logo from '@/components/Logo'

interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  deltaShares: number
  pctDelta: number
  ticker?: string
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

export type Tab = 'portfolio' | 'transactions' | 'dividends' | 'analytics' | 'filings' | 'ai'

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
  investorSlug,
}: {
  tab: Tab
  onTabChange: (t: Tab) => void
  holdings: Position[]
  buys: HistoryGroup[]
  sells: HistoryGroup[]
  investorSlug: string
}) {
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all')
  const [showAll, setShowAll] = useState(false)

  const getTabsForInvestor = (slug: string): TabConfig[] => {
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

    if (['buffett', 'gates'].includes(slug)) {
      baseTabs.push({ 
        key: 'dividends', 
        label: 'Dividenden', 
        icon: CurrencyDollarIcon,
        isHighlighted: true,
        description: 'Dividenden-Strategie & Yield-Analyse'
      })
    }

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

  const availableTabs = getTabsForInvestor(investorSlug)

  const fmtShares = new Intl.NumberFormat('de-DE')
  const fmtValue = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const fmtPercent = new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const allTransactions: HistoryGroup[] = buys.map((bGroup, idx) => {
    const sGroup = sells[idx] || { period: bGroup.period, items: [] }
    return {
      period: bGroup.period,
      items: [...bGroup.items, ...sGroup.items].sort((a, b) => 
        Math.abs(b.value) - Math.abs(a.value)
      ),
    }
  })

  const getFilteredTransactions = (): HistoryGroup[] => {
    switch (transactionFilter) {
      case 'buys': return buys
      case 'sells': return sells
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
              <span className="font-semibold text-green-400 group-hover:text-green-300 transition-colors">
                {ticker}
              </span>
              
              {/* ✅ PUT/CALL BADGE - Verbesserte Styling */}
              {showOptionBadge && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                  optionType === 'PUT' 
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' 
                    : optionType === 'CALL'
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
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
                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
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
      {/* Tab Navigation - Komplett Schwarz/Grau */}
      <div className="flex flex-wrap gap-2 mb-8">
        {availableTabs.map(({ key, label, icon: Icon, isHighlighted, description }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 relative group hover:scale-[1.02] ${
              tab === key
                ? isHighlighted
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/25'
                  : key === 'ai'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-gray-700 text-white shadow-lg shadow-gray-500/25'
                : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors'
            }`}
            title={description}
          >
            <Icon className="w-4 h-4" />
            {label}
            {isHighlighted && tab !== key && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - Echtes Schwarz */}
      {tab === 'portfolio' || tab === 'transactions' ? (
        <div className="bg-black border border-gray-800/50 rounded-xl overflow-hidden backdrop-blur-sm shadow-2xl">
          
          {/* PORTFOLIO TAB */}
          {tab === 'portfolio' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-gray-100">
                <thead>
                  <tr className="text-sm text-gray-400 border-b border-gray-800/50 bg-gray-900/50">
                    <th className="text-left px-6 py-4 font-semibold tracking-wide">Unternehmen</th>
                    <th className="text-right px-6 py-4 font-semibold tracking-wide">Aktien</th>
                    <th className="text-right px-6 py-4 font-semibold tracking-wide">Wert (USD)</th>
                    <th className="text-right px-6 py-4 font-semibold tracking-wide">Anteil</th>
                    <th className="text-right px-6 py-4 font-semibold tracking-wide">Letzte Aktivität</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHoldings.map((p, i) => (
                    <tr 
                      key={i} 
                      className="border-b border-gray-800/30 hover:bg-gray-900/50 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4">
                        <NameAndTicker position={p} />
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-300 group-hover:text-white transition-colors">
                        {fmtShares.format(p.shares)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-white">
                        {fmtValue.format(p.value)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-300">
                        {fmtPercent.format(p.value / holdings.reduce((s,x)=>s+x.value,0))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.deltaShares > 0
                          ? (p.pctDelta === 0
                              ? <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                                  <ArrowTrendingUpIcon className="w-3 h-3" />
                                  Neueinkauf
                                </span>
                              : <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                                  <ArrowTrendingUpIcon className="w-3 h-3" />
                                  +{fmtPercent.format(p.pctDelta)}
                                </span>
                            )
                          : p.deltaShares < 0
                            ? <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium border border-red-500/30">
                                <ArrowTrendingDownIcon className="w-3 h-3" />
                                -{fmtPercent.format(Math.abs(p.pctDelta))}
                              </span>
                            : <span className="text-gray-500 text-sm">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {holdings.length > 20 && (
                <div className="border-t border-gray-800/50 p-6 text-center bg-gray-900/30">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-6 py-3 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white transition-all duration-200 font-medium hover:scale-105 shadow-lg border border-gray-700/50"
                  >
                    {showAll
                      ? 'Weniger Positionen anzeigen'
                      : `Alle ${holdings.length} Positionen anzeigen`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB - Alle Filter in Grau */}
          {tab === 'transactions' && (
            <div>
              <div className="flex flex-wrap gap-3 p-6 border-b border-gray-800/50 bg-gray-900/30">
                <div className="flex items-center gap-2 mr-4">
                  <ArrowsRightLeftIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-400 font-semibold">Filter:</span>
                </div>
                
                {[
                  { key: 'all' as TransactionFilter, label: 'Alle', icon: BoltIcon, count: allTransactions.reduce((sum, g) => sum + g.items.length, 0) },
                  { key: 'buys' as TransactionFilter, label: 'Käufe', icon: ArrowTrendingUpIcon, count: buys.reduce((sum, g) => sum + g.items.length, 0) },
                  { key: 'sells' as TransactionFilter, label: 'Verkäufe', icon: ArrowTrendingDownIcon, count: sells.reduce((sum, g) => sum + g.items.length, 0) },
                ].map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    onClick={() => setTransactionFilter(key)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 ${
                      transactionFilter === key
                        ? key === 'buys'
                          ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                          : key === 'sells'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                            : 'bg-gray-700 text-white shadow-lg shadow-gray-500/25'
                        : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/70'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                      transactionFilter === key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-600/50 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-gray-100">
                  <thead>
                    <tr className="text-sm text-gray-400 border-b border-gray-800/50 bg-gray-900/50">
                      <th className="text-left px-6 py-4 font-semibold tracking-wide">Unternehmen</th>
                      <th className="text-right px-6 py-4 font-semibold tracking-wide">Δ Aktien</th>
                      <th className="text-right px-6 py-4 font-semibold tracking-wide">Typ</th>
                      <th className="text-right px-6 py-4 font-semibold tracking-wide">% Veränderung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTransactions().map((group, gi) => (
                      <React.Fragment key={gi}>
                        <tr>
                          <td 
                            colSpan={4} 
                            className="px-6 py-4 border-t border-gray-700/50 font-bold text-white uppercase tracking-wide text-sm bg-gray-900/70"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              {group.period}
                              <span className="text-xs text-gray-400 font-normal normal-case">
                                ({group.items.length} Transaktionen)
                              </span>
                            </div>
                          </td>
                        </tr>

                        {group.items.length > 0
                          ? group.items.map((p, i) => (
                              <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-900/50 transition-all duration-200 group">
                                <td className="px-6 py-4">
                                  <NameAndTicker position={p} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full font-semibold border ${
                                    p.deltaShares > 0
                                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                                  }`}>
                                    {p.deltaShares > 0 ? (
                                      <ArrowTrendingUpIcon className="w-3 h-3" />
                                    ) : (
                                      <ArrowTrendingDownIcon className="w-3 h-3" />
                                    )}
                                    {p.deltaShares > 0 ? '+' : ''}{fmtShares.format(p.deltaShares)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`text-sm font-semibold ${
                                    p.deltaShares > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {p.deltaShares > 0 ? 'Kauf' : 'Verkauf'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-gray-300 group-hover:text-white transition-colors">
                                  {(() => {
                                    const prevShares = p.shares - p.deltaShares
                                    if (prevShares === 0) {
                                      return <span className="text-green-400 font-semibold text-sm">Neueinkauf</span>
                                    }
                                    return <span className="font-semibold">{fmtPercent.format(Math.abs(p.pctDelta))}</span>
                                  })()}
                                </td>
                              </tr>
                            ))
                          : (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-900/50 border border-gray-800/50">
                                    {transactionFilter === 'buys' ? (
                                      <ArrowTrendingUpIcon className="w-8 h-8 text-gray-600" />
                                    ) : transactionFilter === 'sells' ? (
                                      <ArrowTrendingDownIcon className="w-8 h-8 text-gray-600" />
                                    ) : (
                                      <BoltIcon className="w-8 h-8 text-gray-600" />
                                    )}
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-gray-400">
                                      {transactionFilter === 'buys'
                                        ? 'Keine Käufe in diesem Quartal'
                                        : transactionFilter === 'sells'
                                          ? 'Keine Verkäufe in diesem Quartal'
                                          : 'Keine Transaktionen in diesem Quartal'}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Der Investor war in diesem Zeitraum inaktiv
                                    </p>
                                  </div>
                                </div>
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