// src/components/InvestorTabs.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { stocks, Stock } from '@/data/stocks'

interface Position {
  cusip:       string
  name:        string
  shares:      number
  value:       number
  deltaShares: number
  pctDelta:    number
  ticker?:     string // HINZUGEFÜGT für neue Datenquellen
}

interface HistoryGroup {
  period: string
  items: Position[]
}

export type Tab = 'holdings' | 'buys' | 'sells' | 'activity' | 'ai' // ← Exportiert für andere Komponenten

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
}: {
  tab: Tab
  onTabChange: (t: Tab) => void
  holdings: Position[]
  buys: HistoryGroup[]
  sells: HistoryGroup[]
}) {
  const [showAll, setShowAll] = useState(false)

  const fmtShares  = new Intl.NumberFormat('de-DE')
  const fmtValue   = new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const fmtPercent = new Intl.NumberFormat('de-DE', {
    style:                'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const labels: Record<Tab,string> = {
    holdings: 'Bestände',
    buys:     'Käufe',
    sells:    'Verkäufe',
    activity: 'Aktivitäten',
    ai:       'Smart AI', // ← Neuer Tab
  }

  const tabIcons: Record<Tab, React.ComponentType<{ className?: string }>> = {
    holdings: ChartBarIcon,
    buys: ArrowTrendingUpIcon,
    sells: ArrowTrendingDownIcon,
    activity: BoltIcon,
    ai: SparklesIcon,
  }

  // kombiniere Käufe + Verkäufe je Quartal
  const activity: HistoryGroup[] = buys.map((bGroup, idx) => {
    const sGroup = sells[idx] || { period: bGroup.period, items: [] }
    return {
      period: bGroup.period,
      items: [ ...bGroup.items, ...sGroup.items ],
    }
  })

  // nur die ersten 20 Bestände, wenn showAll=false
  const displayedHoldings = showAll ? holdings : holdings.slice(0, 20)

  // NEUE HILFSFUNKTION: Ticker ermitteln
  const getTicker = (position: Position): string | undefined => {
    // 1. Versuche ticker aus Position (für neue Datenquellen wie Dataroma)
    if (position.ticker) return position.ticker
    
    // 2. Fallback: CUSIP → Ticker Mapping (für 13F-Daten)
    return cusipToTicker[position.cusip]
  }

  // Hilfsfunktion für Tab-Styling
  const getTabClassName = (t: Tab) => {
    const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
    
    if (tab === t) {
      switch (t) {
        case 'holdings': return `${baseClasses} bg-gray-700 text-white shadow-lg`
        case 'buys': return `${baseClasses} bg-green-700 text-white shadow-lg`
        case 'sells': return `${baseClasses} bg-red-700 text-white shadow-lg`
        case 'activity': return `${baseClasses} bg-blue-700 text-white shadow-lg`
        case 'ai': return `${baseClasses} bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg`
        default: return baseClasses
      }
    }
    
    return `${baseClasses} bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white`
  }

  return (
    <div>
      {/* — Tabs — */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['holdings','buys','sells','activity','ai'] as const).map(t => {
          const Icon = tabIcons[t]
          return (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={getTabClassName(t)}
            >
              <Icon className="w-4 h-4" />
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Conditionally render content based on tab */}
      {tab === 'ai' ? (
        <div>
          {/* AI Tab Content wird von der Parent-Komponente gerendert */}
        </div>
      ) : (
        /* — Tabelle (clean, nur Trennlinien) — */
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-gray-100">
              <thead>
                <tr className="text-sm text-gray-400 bg-gray-800/50">
                  {tab === 'holdings' ? (
                    <>
                      <th className="text-left px-6 py-4 font-medium">Name &amp; Ticker</th>
                      <th className="text-right px-6 py-4 font-medium">Aktien</th>
                      <th className="text-right px-6 py-4 font-medium">Wert (USD)</th>
                      <th className="text-right px-6 py-4 font-medium">Anteil</th>
                      <th className="text-right px-6 py-4 font-medium">Letzte Aktivität</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-6 py-4 font-medium">Name &amp; Ticker</th>
                      <th className="text-right px-6 py-4 font-medium">Aktien</th>
                      <th className="text-right px-6 py-4 font-medium">Δ Aktien</th>
                      <th className="text-right px-6 py-4 font-medium">% Veränderung</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* — Bestände — */}
                {tab === 'holdings' && displayedHoldings.map((p, i) => {
                  const ticker = getTicker(p)
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        {ticker
                          ? (
                            <Link
                            href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
                              className="font-semibold text-green-400 hover:text-green-300 transition-colors"
                            >
                              {ticker}
                              <span className="text-sm text-gray-400 font-normal"> – {p.name}</span>
                            </Link>
                          )
                          : <span className="text-white font-medium">{p.name}</span>
                        }
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
                  )
                })}

                {/* — Käufe / Verkäufe / Aktivitäten — */}
                {(tab === 'buys' || tab === 'sells' || tab === 'activity') && (
                  (tab === 'buys' ? buys : tab === 'sells' ? sells : activity)
                    .map((group, gi) => (
                      <React.Fragment key={gi}>
                        {/* Quartals-Header */}
                        <tr>
                          <td colSpan={5} className="
                            bg-gray-800/70
                            px-6 py-3
                            border-t border-gray-700
                            font-bold text-white uppercase tracking-wide text-sm
                          ">
                            {group.period}
                          </td>
                        </tr>

                        {group.items.length > 0
                          ? group.items.map((p, i) => {
                              const ticker = getTicker(p)
                              return (
                                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                  <td className="px-6 py-4">
                                    {ticker
                                      ? (
                                        <Link
                                        href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
                                          className="font-semibold text-green-400 hover:text-green-300 transition-colors"
                                        >
                                          {ticker}
                                          <span className="text-sm text-gray-400 font-normal"> – {p.name}</span>
                                        </Link>
                                      )
                                      : <span className="text-white font-medium">{p.name}</span>
                                    }
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono">{fmtShares.format(p.shares)}</td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`
                                      inline-block px-3 py-1 text-sm rounded-full font-medium
                                      ${p.deltaShares > 0
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'}
                                    `}>
                                      {p.deltaShares > 0 ? '+' : ''}{fmtShares.format(p.deltaShares)}
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
                              )
                            })
                          : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center">
                                    {tab === 'buys' ? (
                                      <ArrowTrendingUpIcon className="w-6 h-6 text-gray-600" />
                                    ) : tab === 'sells' ? (
                                      <ArrowTrendingDownIcon className="w-6 h-6 text-gray-600" />
                                    ) : (
                                      <BoltIcon className="w-6 h-6 text-gray-600" />
                                    )}
                                  </div>
                                  <p className="text-sm">
                                    {tab === 'buys'
                                      ? 'Keine Käufe in diesem Quartal'
                                      : tab === 'sells'
                                        ? 'Keine Verkäufe in diesem Quartal'
                                        : 'Keine Aktivitäten in diesem Quartal'}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )
                        }
                      </React.Fragment>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* — Button zum Ein-/Ausklappen — */}
          {tab === 'holdings' && holdings.length > 20 && (
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
    </div>
  )
}