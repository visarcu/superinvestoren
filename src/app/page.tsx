// src/app/page.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { investors, Investor } from '../data/investors'
import holdingsData from '../data/holdings'
import { stocks, Stock } from '../data/stocks'
import { aggregateBuysByTicker } from '../lib/aggregations'
import { BuyDetails } from '../components/BuyDetails'

interface TopOwnedItem {
  ticker: string
  count:  number
}

export default function HomePage() {
  // 1) Hervorgehobene Investoren
  const highlighted = ['buffett', 'ackman', 'burry']
  const others      = investors.filter(inv => !highlighted.includes(inv.slug))

  // 2) Käufe im letzten Quartal aggregieren
  const aggregated = aggregateBuysByTicker(investors)

  // 3) Lookup Ticker → Name
  const nameMap: Record<string,string> = {}
  stocks.forEach((s: Stock) => {
    nameMap[s.ticker] = s.name
  })

  // 4) Top 10 Meistgehalten (über alle aktuellen Holdings)
  //    Wir zählen je Investor **einmal** pro Ticker
  const cusipToTicker = new Map<string,string>(
    stocks.map(s => [s.cusip, s.ticker])
  )

  const ownershipCount = new Map<string,number>()
  Object.entries(holdingsData).forEach(([slug, file]) => {
    if (slug.endsWith('-previous')) return
    const seen = new Set<string>()
    file.positions.forEach(p => {
      const t = cusipToTicker.get(p.cusip)
      if (t && !seen.has(t)) {
        seen.add(t)
        ownershipCount.set(t, (ownershipCount.get(t) ?? 0) + 1)
      }
    })
  })

  const topOwned: TopOwnedItem[] = Array.from(ownershipCount.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }))

  return (
    <main className="flex-grow max-w-5xl mx-auto p-4 sm:p-8 space-y-12">
      {/* Titel & Tagline */}
      <h1 className="text-4xl font-bold text-center">SUPERINVESTOR</h1>
      <p className="text-lg text-center text-gray-600">
        Superinvestoren bewegen Märkte und beeinflussen Regierungen.  
        Verschaffe dir einen Vorsprung, indem du siehst, was sie kaufen –  
        und finde deine nächste Millionen-Aktie.
      </p>

      {/* Highlight-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {investors
          .filter(inv => highlighted.includes(inv.slug))
          .map((inv: Investor) => (
            <Link
              key={inv.slug}
              href={`/investor/${inv.slug}`}
              className={`
                relative block bg-white dark:bg-surface-dark
                rounded-2xl shadow hover:shadow-lg transition
                p-6 flex flex-col items-center
                ${inv.slug === 'buffett' ? 'ring-4 ring-yellow-400' : ''}
              `}
            >
              {inv.slug === 'buffett' && (
                <span className="absolute top-3 right-3 text-yellow-400 text-2xl">
                  👑
                </span>
              )}
              {inv.imageUrl && (
                <div className="w-24 h-24 mb-4 relative">
                  <Image
                    src={inv.imageUrl}
                    alt={inv.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
              )}
              <div className="text-2xl font-semibold text-center text-on-surface dark:text-white">
                {inv.name}
              </div>
            </Link>
          ))}
      </div>

      {/* Zweispaltiges Layout: Links Liste, rechts Tabellen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Links: Weitere Investoren mit Datum */}
        <section className="text-sm">
          <h2 className="text-xl font-semibold mb-2">Weitere Investoren</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {others.map(inv => (
              <li key={inv.slug} className="flex justify-between">
                <Link href={`/investor/${inv.slug}`} className="hover:underline">
                  {inv.name}
                </Link>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Aktualisiert am {inv.updatedAt}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Rechts: Zwei Tabellen nebeneinander */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top 10 Käufe letztes Quartal */}
          <section>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Top 10 Käufe letztes Quartal</span>
                <span className="text-xs text-green-600">(Q1 2025)</span>
              </div>
              <ul className="space-y-1 flex-grow text-sm">
                {aggregated.slice(0, 10).map(item => (
                  <li key={item.ticker} className="text-gray-800 dark:text-gray-200">
                    <Link
                      href={`/aktie/${item.ticker.toLowerCase()}`}
                      className="text-blue-600 hover:underline"
                    >
                      {item.ticker} – {nameMap[item.ticker]}
                    </Link>
                    <span className="ml-1 text-gray-600">({item.count})</span>
                  </li>
                ))}
              </ul>
              <BuyDetails data={aggregated} />
            </div>
          </section>

          {/* Top 10 Meistgehalten */}
          <section>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Top 10 Meistgehalten</span>
                <span className="text-xs text-gray-400">ℹ️</span>
              </div>
              <ul className="space-y-1 text-sm">
                {topOwned.map(o => (
                  <li
                    key={o.ticker}
                    className="flex justify-between text-gray-800 dark:text-gray-200"
                  >
                    <Link
                      href={`/aktie/${o.ticker.toLowerCase()}`}
                      className="text-blue-600 hover:underline"
                    >
                      {o.ticker} – {nameMap[o.ticker]}
                    </Link>
                    <span className="text-gray-500">{o.count}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto text-center text-gray-400 select-none text-xs">▼</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}