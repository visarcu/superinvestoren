// components/InvestorTabs.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface Position {
  name:        string
  cusip:       string
  shares:      number
  value:       number
  deltaShares: number
  pctDelta:    number
}

type Tab = 'holdings' | 'buys' | 'sells'

export default function InvestorTabs({
  holdings,
  buys,
  sells,
}: {
  holdings: Position[]
  buys:     Position[]
  sells:    Position[]
}) {
  const [tab, setTab] = useState<Tab>('holdings')

  // Formatter für Zahlen
  const fmtShares  = new Intl.NumberFormat('de-DE')
  const fmtValue   = new Intl.NumberFormat('de-DE', {
    style:                'currency',
    currency:             'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const fmtPercent = new Intl.NumberFormat('de-DE', {
    style:                'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Welche Daten gerade angezeigt werden
  let data: Position[]
  if (tab === 'buys')  data = buys
  else if (tab === 'sells') data = sells
  else data = holdings

  return (
    <div>
      {/* Tab‐Buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            tab === 'holdings'
              ? 'bg-gray-200'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setTab('holdings')}
        >
          Holdings
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tab === 'buys'
              ? 'bg-green-200 text-green-800'
              : 'bg-gray-100 hover:bg-green-100'
          }`}
          onClick={() => setTab('buys')}
        >
          Buys
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tab === 'sells'
              ? 'bg-red-200 text-red-800'
              : 'bg-gray-100 hover:bg-red-100'
          }`}
          onClick={() => setTab('sells')}
        >
          Sells
        </button>
      </div>

      {/* Tabelle */}
      <table className="w-full border-collapse">
        <thead className="bg-gray-200">
          <tr>
            {tab === 'holdings' && (
              <>
                <th className="text-left px-4 py-2">Name &amp; Ticker</th>
                <th className="text-right px-4 py-2">Shares</th>
                <th className="text-right px-4 py-2">Wert (USD)</th>
                <th className="text-right px-4 py-2">Anteil</th>
                <th className="text-right px-4 py-2">Letzte Aktivität</th>
              </>
            )}
            {tab === 'buys' && (
              <>
                <th className="text-left px-4 py-2">Name &amp; Ticker</th>
                <th className="text-right px-4 py-2">Shares</th>
                <th className="text-right px-4 py-2">Δ Shares</th>
                <th className="text-right px-4 py-2">%Δ</th>
              </>
            )}
            {tab === 'sells' && (
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
          {data.map((p, i) => (
            <tr key={p.cusip + i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {/* Name & Ticker */}
              <td className="px-4 py-2">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-500">({p.cusip})</div>
              </td>

              {/* Shares */}
              <td className="px-4 py-2 text-right">
                {fmtShares.format(p.shares)}
              </td>

              {/* Je nach Tab weitere Spalten */}
              {tab === 'holdings' && (
                <>
                  <td className="px-4 py-2 text-right">
                    {fmtValue.format(p.value)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fmtPercent.format(p.value / holdings.reduce((s, x) => s + x.value, 0))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.deltaShares > 0 && (
                      <span className="text-green-600">
                        Hinzugefügt {fmtPercent.format(p.pctDelta)}
                      </span>
                    )}
                    {p.deltaShares < 0 && (
                      <span className="text-red-600">
                        Verkauft {fmtPercent.format(Math.abs(p.pctDelta))}
                      </span>
                    )}
                    {p.deltaShares === 0 && '—'}
                  </td>
                </>
              )}

              {(tab === 'buys' || tab === 'sells') && (
                <>
                  <td className="px-4 py-2 text-right">
                    {fmtShares.format(p.deltaShares)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fmtPercent.format(p.pctDelta)}
                  </td>
                </>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={ tab === 'holdings' ? 5 : 4 } className="px-4 py-2 text-center text-gray-500">
                Keine Daten für diesen Tab.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}