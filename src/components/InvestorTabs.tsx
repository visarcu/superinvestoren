'use client'

import React from 'react'
import Link from 'next/link'
import { stocks, Stock } from '@/data/stocks'

interface Position {
  name:        string
  cusip:       string
  shares:      number
  value:       number
  deltaShares: number
  pctDelta:    number
}

interface HistoryGroup {
  period: string
  items: Position[]
}

type Tab = 'holdings' | 'buys' | 'sells'

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
  const fmtShares  = new Intl.NumberFormat('de-DE')
  const fmtValue   = new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const fmtPercent = new Intl.NumberFormat('de-DE', {
    style:                'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const isEmptyHistory = (tab === 'buys' ? buys : sells)
    .every(g => g.items.length === 0)

  const labels: Record<Tab,string> = {
    holdings: 'Bestände',
    buys:     'Käufe',
    sells:    'Verkäufe',
  }

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {(['holdings','buys','sells'] as Tab[]).map(t => (
          <button
            key={t}
            className={`px-4 py-2 rounded ${
              tab === t
                ? t === 'holdings'
                  ? 'bg-gray-200'
                  : t === 'buys'
                    ? 'bg-green-200 text-green-800'
                    : 'bg-red-200 text-red-800'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => onTabChange(t)}
          >
            {labels[t]}
          </button>
        ))}
      </div>
      <table className="w-full border-collapse">
        <thead className="bg-gray-200">
          <tr>
            {tab === 'holdings' ? (
              <>
                <th className="text-left px-4 py-2">Name &amp; Ticker</th>
                <th className="text-right px-4 py-2">Shares</th>
                <th className="text-right px-4 py-2">Wert (USD)</th>
                <th className="text-right px-4 py-2">Anteil</th>
                <th className="text-right px-4 py-2">Letzte Aktivität</th>
              </>
            ) : (
              <>
                <th className="text-left px-4 py-2">Name &amp; Ticker</th>
                <th className="text-right px-4 py-2">Shares</th>
                <th className="text-right px-4 py-2">Δ Shares</th>
                <th className="text-right px-4 py-2">%Δ</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {tab === 'holdings' && holdings.map((p,i) => {
            const ticker = cusipToTicker[p.cusip]
            return (
              <tr key={i} className={`${i%2===0?'bg-white':'bg-gray-50'} hover:bg-gray-100`}>
                <td className="px-4 py-2">
                  {ticker ? (
                    <Link href={`/aktie/${ticker.toLowerCase()}`} className="font-semibold hover:underline">
                      {ticker} <span className="text-sm text-gray-500">– {p.name}</span>
                    </Link>
                  ) : (
                    <span>{p.name} <span className="text-gray-500">({p.cusip})</span></span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{fmtShares.format(p.shares)}</td>
                <td className="px-4 py-2 text-right">{fmtValue.format(p.value)}</td>
                <td className="px-4 py-2 text-right">{fmtPercent.format(p.value / holdings.reduce((s,x)=>s+x.value,0))}</td>
                <td className="px-4 py-2 text-right">
                  {p.deltaShares > 0
                    ? p.pctDelta === 0
                      ? <span className="text-green-600">Neueinkauf</span>
                      : <span className="text-green-600">Hinzugefügt {fmtPercent.format(p.pctDelta)}</span>
                    : p.deltaShares < 0
                      ? <span className="text-red-600">Verkauft {fmtPercent.format(Math.abs(p.pctDelta))}</span>
                      : '—'
                  }
                </td>
              </tr>
            )
          })}

          {(tab === 'buys' || tab === 'sells') && (tab === 'buys' ? buys : sells).map(g => (
            <React.Fragment key={g.period}>
              <tr>
                <td colSpan={4} className={`px-4 py-2 font-semibold ${
                  tab==='buys'
                    ? 'bg-green-50 text-green-700 border-l-4 border-green-300'
                    : 'bg-red-50 text-red-700 border-l-4 border-red-300'
                }`}>
                  {g.period}
                </td>
              </tr>
              {g.items.map((p,i) => (
                <tr key={i} className={`${i%2===0?'bg-white':'bg-gray-50'} hover:bg-gray-100`}>
                  <td className="px-4 py-2">
                    {cusipToTicker[p.cusip] || p.name}
                  </td>
                  <td className="px-4 py-2 text-right">{fmtShares.format(p.shares)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-block px-2 py-1 text-sm rounded ${
                      tab==='buys' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {fmtShares.format(p.deltaShares)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{fmtPercent.format(p.pctDelta)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}

          {tab !== 'holdings' && isEmptyHistory && (
            <tr>
              <td colSpan={4} className="px-4 py-2 text-center text-gray-500">Keine Daten verfügbar.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}