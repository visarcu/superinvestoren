// src/components/InvestorTabs.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { stocks, Stock } from '@/data/stocks'

interface Position {
  cusip:       string
  name:        string
  shares:      number
  value:       number
  deltaShares: number
  pctDelta:    number
}

interface HistoryGroup {
  period: string
  items: Position[]
}

type Tab = 'holdings' | 'buys' | 'sells' | 'activity'

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
  const [showAll, setShowAll] = useState(false)        // ← neu

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

  return (
    <div>
      {/* — Tabs — */}
      <div className="flex space-x-2 mb-4">
        {(['holdings','buys','sells','activity'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`
              px-4 py-2 rounded-md font-medium transition-colors
              ${tab === t
                ? t === 'holdings'
                    ? 'bg-gray-700 text-white'
                    : t === 'buys'
                      ? 'bg-green-700 text-white'
                      : t === 'sells'
                        ? 'bg-red-700 text-white'
                        : 'bg-blue-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            {labels[t]}
          </button>
        ))}
      </div>

      {/* — Tabelle (clean, nur Trennlinien) — */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-gray-100">
          <thead>
            <tr className="text-sm text-gray-400">
              {tab === 'holdings' ? (
                <>
                  <th className="text-left px-4 py-2 border-b border-gray-600">Name &amp; Ticker</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">Aktien</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">Wert (USD)</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">Anteil</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">Letzte Aktivität</th>
                </>
              ) : (
                <>
                  <th className="text-left px-4 py-2 border-b border-gray-600">Name &amp; Ticker</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">Aktien</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">Δ Aktien</th>
                  <th className="text-right px-4 py-2 border-b border-gray-600">% Veränderung</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* — Bestände — */}
            {tab === 'holdings' && displayedHoldings.map((p, i) => {
              const ticker = cusipToTicker[p.cusip]
              return (
                <tr key={i} className="border-b border-gray-700 hover:bg-gray-800">
                  <td className="px-4 py-2">
                    {ticker
                      ? (
                        <Link
                          href={`/aktie/${ticker.toLowerCase()}`}
                          className="font-semibold text-accent hover:underline"
                        >
                          {ticker}
                          <span className="text-sm text-gray-400"> – {p.name}</span>
                        </Link>
                      )
                      : <span className="text-white">{p.name}</span>
                    }
                  </td>
                  <td className="px-4 py-2 text-right">{fmtShares.format(p.shares)}</td>
                  <td className="px-4 py-2 text-right">{fmtValue.format(p.value)}</td>
                  <td className="px-4 py-2 text-right">
                    {fmtPercent.format(p.value / holdings.reduce((s,x)=>s+x.value,0))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.deltaShares > 0
                      ? (p.pctDelta === 0
                          ? <span className="text-green-400">Neueinkauf</span>
                          : <span className="text-green-400">
                              Hinzugefügt {fmtPercent.format(p.pctDelta)}
                            </span>
                        )
                      : p.deltaShares < 0
                        ? <span className="text-red-400">
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
    bg-gray-800
    px-4 py-2
    border-t border-gray-700
    font-bold text-white uppercase tracking-wide
  ">
    {group.period}
  </td>
</tr>
<tr className="h-1"><td colSpan={5} className="bg-gray-700 p-0"></td></tr>

                    {group.items.length > 0
                      ? group.items.map((p, i) => {
                          const ticker = cusipToTicker[p.cusip]
                          return (
                            <tr key={i} className="border-b border-gray-700 hover:bg-gray-800">
                              <td className="px-4 py-2">
                                {ticker
                                  ? (
                                    <Link
                                      href={`/aktie/${ticker.toLowerCase()}`}
                                      className="font-semibold text-accent hover:underline"
                                    >
                                      {ticker}
                                      <span className="text-sm text-gray-400"> – {p.name}</span>
                                    </Link>
                                  )
                                  : <span className="text-white">{p.name}</span>
                                }
                              </td>
                              <td className="px-4 py-2 text-right">{fmtShares.format(p.shares)}</td>
                              <td className="px-4 py-2 text-right">
                                <span className={`
                                  inline-block px-2 py-1 text-sm rounded
                                  ${p.deltaShares > 0
                                    ? 'bg-green-800 text-green-300'
                                    : 'bg-red-800 text-red-300'}
                                `}>
                                  {fmtShares.format(Math.abs(p.deltaShares))}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
      {(() => {
        const prevShares = p.shares - p.deltaShares
        // Wenn vorher 0 Shares, zeigen wir statt 0 % lieber "–"
        if (prevShares === 0) {
          return 'Neueinkauf'
        }
        return fmtPercent.format(Math.abs(p.pctDelta))
      })()}
    </td>
                            </tr>
                          )
                        })
                      : (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center italic text-gray-500">
                            {tab === 'buys'
                              ? 'Keine Käufe in diesem Quartal'
                              : tab === 'sells'
                                ? 'Keine Verkäufe in diesem Quartal'
                                : 'Keine Aktivitäten in diesem Quartal'}
                          </td>
                        </tr>
                      )
                    }
                  </React.Fragment>
                ))
            )}
          </tbody>
        </table>

        {/* — Button zum Ein-/Ausklappen — */}
        {tab === 'holdings' && holdings.length > 20 && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-4 py-1 text-sm rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
            >
              {showAll
                ? 'Weniger Positionen'
                : `Alle ${holdings.length} Positionen anzeigen`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}