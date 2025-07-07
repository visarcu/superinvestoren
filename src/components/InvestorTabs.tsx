// src/components/InvestorTabs.tsx - FINALE VERSION: 6/5 Tabs mit Filings getrennt
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  ArrowsRightLeftIcon, // Transaktionen
  CurrencyDollarIcon,  // Dividenden
  ChartPieIcon,        // Analytics
  DocumentTextIcon,    // Filings - EIGENER TAB!
  SparklesIcon,        // AI - ALLEINE!
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
}

interface HistoryGroup {
  period: string
  items: Position[]
}

// ✅ FINALE Tab-Struktur: 6 Tabs für Buffett/Gates, 5 für andere
export type Tab = 'portfolio' | 'transactions' | 'dividends' | 'analytics' | 'filings' | 'ai'

// Sub-Filter für Transaktionen
type TransactionFilter = 'all' | 'buys' | 'sells'

// Tab-Konfiguration Interface
interface TabConfig {
  key: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
  isHighlighted?: boolean
  description?: string
}

// Mapping von CUSIP → Ticker
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

  // ✅ FINALE Tab-Konfiguration: Filings immer dabei, Dividenden nur für bestimmte
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

    // ✅ Dividenden-Tab nur für Dividend-fokussierte Investoren
    if (['buffett', 'gates'].includes(slug)) {
      baseTabs.push({ 
        key: 'dividends', 
        label: 'Dividenden', 
        icon: CurrencyDollarIcon,
        isHighlighted: true,
        description: 'Dividenden-Strategie & Yield-Analyse'
      })
    }

    // ✅ Analytics, Filings und AI sind IMMER dabei
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

  // Formatierung
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

  // Kombiniere Käufe + Verkäufe für Transaktionen-Tab
  const allTransactions: HistoryGroup[] = buys.map((bGroup, idx) => {
    const sGroup = sells[idx] || { period: bGroup.period, items: [] }
    return {
      period: bGroup.period,
      items: [...bGroup.items, ...sGroup.items].sort((a, b) => 
        Math.abs(b.value) - Math.abs(a.value)
      ),
    }
  })

  // Gefilterte Transaktionen basierend auf Filter
  const getFilteredTransactions = (): HistoryGroup[] => {
    switch (transactionFilter) {
      case 'buys': return buys
      case 'sells': return sells
      default: return allTransactions
    }
  }

  // Holdings für Portfolio-Tab
  const displayedHoldings = showAll ? holdings : holdings.slice(0, 20)

  // Hilfsfunktionen
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

  // Name & Ticker Komponente
  const NameAndTicker = ({ position }: { position: Position }) => {
    const ticker = getTicker(position)
    const cleanName = getCleanCompanyName(position)
    
    if (ticker) {
      return (
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
          className="flex items-center gap-3 group"
        >
          <div className="w-6 h-6 flex-shrink-0">
            <Logo
              ticker={ticker}
              alt={`${ticker} Logo`}
              className="w-full h-full"
              padding="none"
            />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-green-400 group-hover:text-green-300 transition-colors">
              {ticker}
            </div>
            {cleanName !== ticker && (
              <div className="text-sm text-gray-400 font-normal truncate">
                {cleanName}
              </div>
            )}
          </div>
        </Link>
      )
    }
    
    return (
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex-shrink-0 bg-gray-700 rounded-full"></div>
        <span className="text-white font-medium">{cleanName}</span>
      </div>
    )
  }

  return (
    <div>
      {/* ✅ Tab Navigation - Jetzt mit bis zu 6 Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {availableTabs.map(({ key, label, icon: Icon, isHighlighted, description }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 relative group ${
              tab === key
                ? isHighlighted
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/25'
                  : key === 'ai'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : key === 'filings'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700 text-white shadow-lg'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
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

      {/* Tab Content - Nur Portfolio und Transaktionen werden hier gerendert */}
      {tab === 'portfolio' || tab === 'transactions' ? (
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
          
          {/* PORTFOLIO TAB */}
          {tab === 'portfolio' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-gray-100">
                <thead>
                  <tr className="text-sm text-gray-400 bg-gray-800/50">
                    <th className="text-left px-6 py-4 font-medium">Unternehmen</th>
                    <th className="text-right px-6 py-4 font-medium">Aktien</th>
                    <th className="text-right px-6 py-4 font-medium">Wert (USD)</th>
                    <th className="text-right px-6 py-4 font-medium">Anteil</th>
                    <th className="text-right px-6 py-4 font-medium">Letzte Aktivität</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHoldings.map((p, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <NameAndTicker position={p} />
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{fmtShares.format(p.shares)}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold">{fmtValue.format(p.value)}</td>
                      <td className="px-6 py-4 text-right font-mono">
                        {fmtPercent.format(p.value / holdings.reduce((s,x)=>s+x.value,0))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.deltaShares > 0
                          ? (p.pctDelta === 0
                              ? <span className="text-green-400 font-medium">Neueinkauf</span>
                              : <span className="text-green-400 font-medium">
                                  Hinzugefügt {fmtPercent.format(p.pctDelta)}
                                </span>
                            )
                          : p.deltaShares < 0
                            ? <span className="text-red-400 font-medium">
                                Verkauft {fmtPercent.format(Math.abs(p.pctDelta))}
                              </span>
                            : <span className="text-gray-500">–</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Show All Button */}
              {holdings.length > 20 && (
                <div className="border-t border-gray-800 p-4 text-center bg-gray-800/30">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-6 py-2 text-sm rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors font-medium"
                  >
                    {showAll
                      ? 'Weniger Positionen anzeigen'
                      : `Alle ${holdings.length} Positionen anzeigen`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB mit Filter */}
          {tab === 'transactions' && (
            <div>
              {/* Filter Header */}
              <div className="flex flex-wrap gap-2 p-4 border-b border-gray-800 bg-gray-800/20">
                <div className="flex items-center gap-2 mr-4">
                  <ArrowsRightLeftIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400 font-medium">Filter:</span>
                </div>
                
                {[
                  { key: 'all' as TransactionFilter, label: 'Alle', icon: BoltIcon, count: allTransactions.reduce((sum, g) => sum + g.items.length, 0) },
                  { key: 'buys' as TransactionFilter, label: 'Käufe', icon: ArrowTrendingUpIcon, count: buys.reduce((sum, g) => sum + g.items.length, 0) },
                  { key: 'sells' as TransactionFilter, label: 'Verkäufe', icon: ArrowTrendingDownIcon, count: sells.reduce((sum, g) => sum + g.items.length, 0) },
                ].map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    onClick={() => setTransactionFilter(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      transactionFilter === key
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      transactionFilter === key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-600/50 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Transaktions-Tabelle */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-gray-100">
                  <thead>
                    <tr className="text-sm text-gray-400 bg-gray-800/50">
                      <th className="text-left px-6 py-4 font-medium">Unternehmen</th>
                      <th className="text-right px-6 py-4 font-medium">Δ Aktien</th>
                      <th className="text-right px-6 py-4 font-medium">Typ</th>
                      <th className="text-right px-6 py-4 font-medium">% Veränderung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTransactions().map((group, gi) => (
                      <React.Fragment key={gi}>
                        {/* Quartals-Header */}
                        <tr>
                          <td colSpan={4} className="bg-gray-800/70 px-6 py-3 border-t border-gray-700 font-bold text-white uppercase tracking-wide text-sm">
                            {group.period}
                          </td>
                        </tr>

                        {group.items.length > 0
                          ? group.items.map((p, i) => (
                              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                <td className="px-6 py-4">
                                  <NameAndTicker position={p} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
                                    p.deltaShares > 0
                                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}>
                                    {p.deltaShares > 0 ? '+' : ''}{fmtShares.format(p.deltaShares)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`text-sm font-medium ${
                                    p.deltaShares > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {p.deltaShares > 0 ? 'Kauf' : 'Verkauf'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono">
                                  {(() => {
                                    const prevShares = p.shares - p.deltaShares
                                    if (prevShares === 0) {
                                      return <span className="text-green-400 font-medium">Neueinkauf</span>
                                    }
                                    return fmtPercent.format(Math.abs(p.pctDelta))
                                  })()}
                                </td>
                              </tr>
                            ))
                          : (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center">
                                    {transactionFilter === 'buys' ? (
                                      <ArrowTrendingUpIcon className="w-6 h-6 text-gray-600" />
                                    ) : transactionFilter === 'sells' ? (
                                      <ArrowTrendingDownIcon className="w-6 h-6 text-gray-600" />
                                    ) : (
                                      <BoltIcon className="w-6 h-6 text-gray-600" />
                                    )}
                                  </div>
                                  <p className="text-sm">
                                    {transactionFilter === 'buys'
                                      ? 'Keine Käufe in diesem Quartal'
                                      : transactionFilter === 'sells'
                                        ? 'Keine Verkäufe in diesem Quartal'
                                        : 'Keine Transaktionen in diesem Quartal'}
                                  </p>
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
        // Dividends, Analytics, Filings, AI Content wird von Parent-Komponente gerendert
        <div>
          {/* Content für dividends, analytics, filings, ai wird in parent page.tsx gehandhabt */}
        </div>
      )}
    </div>
  )
}