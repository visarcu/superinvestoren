// src/app/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { investors, Investor } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import NewsletterSignup from '@/components/NewsletterSignup'

interface TopOwnedItem {
  ticker: string
  count:  number
}

// Währung formatieren
function formatCurrency(
  amount: number,
  currency: 'USD' | 'EUR' = 'USD',
  maximumFractionDigits = 0
) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

// Datum → Berichtsquartal
function getQuarterFromDate(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  const q = Math.ceil(m / 3) - 1
  return q === 0 ? `Q4 ${y - 1}` : `Q${q} ${y}`
}

export default function HomePage() {
  const highlighted = ['buffett', 'ackman', 'burry']
  const [showAll, setShowAll] = useState(false)

  // 1. Portfolio-Werte je Investor
  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0) / 1_000
    portfolioValue[slug] = total
  })

  // 2. Weitere Investoren
  const others: Investor[] = investors
    .filter(inv => !highlighted.includes(inv.slug))
    .sort((a, b) => (portfolioValue[b.slug] || 0) - (portfolioValue[a.slug] || 0))
  const visibleOthers = showAll ? others : others.slice(0, 10)

  // 3. Top-10 Käufe
  const buyCounts = new Map<string, number>()
  let allDates: string[] = []
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length < 2) return
    const prev = snaps[snaps.length - 2].data
    const cur  = snaps[snaps.length - 1].data
    if (!prev?.positions || !cur?.positions) return

    allDates.push(cur.date!)
    const prevMap = new Map<string, number>()
    prev.positions.forEach(p => {
      prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares)
    })
    const counted = new Set<string>()
    cur.positions.forEach(p => {
      const delta = p.shares - (prevMap.get(p.cusip) || 0)
      if (delta > 0) {
        const st = stocks.find(s => s.cusip === p.cusip)
        if (st && !counted.has(st.ticker)) {
          counted.add(st.ticker)
          buyCounts.set(st.ticker, (buyCounts.get(st.ticker) || 0) + 1)
        }
      }
    })
  })
  const aggregated = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([ticker, count]) => ({ ticker, count }))
    .slice(0, 10)
  const latestDate  = allDates.sort().pop() || ''
  const periodLabel = latestDate ? getQuarterFromDate(latestDate) : ''

  // 4. Name-Lookup für Stocks
  const nameMap: Record<string, string> = {}
  stocks.forEach(s => {
    nameMap[s.ticker] = s.name
  })

  // 5. Top-10 Meistgehalten
  const cusipToTicker = new Map(stocks.map(s => [s.cusip, s.ticker]))
  const ownershipCount = new Map<string, number>()
  Object.values(holdingsHistory).forEach(snaps => {
    const latest = snaps[snaps.length - 1].data
    if (!latest?.positions) return
    const seen = new Set<string>()
    latest.positions.forEach(p => {
      const t = cusipToTicker.get(p.cusip)
      if (t && !seen.has(t)) {
        seen.add(t)
        ownershipCount.set(t, (ownershipCount.get(t) || 0) + 1)
      }
    })
  })
  const topOwned: TopOwnedItem[] = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }))

  // 6. Top-10 Biggest Investments
  const biggest = stocks
    .map(s => {
      const total = Object.values(holdingsHistory).reduce((sum, snaps) => {
        const latest = snaps[snaps.length - 1].data
        const match  = latest.positions.find(p => p.cusip === s.cusip)
        return sum + (match?.value || 0)
      }, 0)
      return { ticker: s.ticker, name: s.name, value: total }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Hilfs-Funktion für Sneak-Peek Top-3 Positionen
  function peekPositions(slug: string) {
    const snaps = holdingsHistory[slug]
    if (!Array.isArray(snaps) || snaps.length === 0) return []
    const latest = snaps[snaps.length - 1].data
    const map = new Map<string, { shares:number; value:number }>()
    latest.positions.forEach(p => {
      const prev = map.get(p.cusip)
      if (prev) {
        prev.shares += p.shares
        prev.value   += p.value
      } else {
        map.set(p.cusip, { shares: p.shares, value: p.value })
      }
    })
    return Array.from(map.entries())
      .map(([cusip, { shares, value }]) => {
        const st = stocks.find(s => s.cusip === cusip)
        return { ticker: st?.ticker ?? cusip, name: st?.name ?? cusip, value }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-16">

      {/* 1. Highlighted Investors */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {investors
          .filter(i => highlighted.includes(i.slug))
          .map(inv => {
            const peek = peekPositions(inv.slug)
            return (
              <Link
                key={inv.slug}
                href={`/investor/${inv.slug}`}
                className="
                  relative group
                bg-card-dark
                rounded-xl shadow-lg
                hover:shadow-2xl transform hover:-translate-y-1 transition
                p-6 flex flex-col items-center
                "
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
                <div className="text-2xl font-semibold text-center dark:text-white">
                  {inv.name}
                </div>

                {peek.length > 0 && (
                  <div className="
                     absolute inset-0
                  bg-white/90 dark:bg-gray-800/90
                  opacity-0 pointer-events-none
                  group-hover:opacity-100 group-hover:pointer-events-auto
                  transition-opacity
                  rounded-xl p-4 flex flex-col
                  ">
                    <h4 className="font-semibold mb-2">Top 3 Positionen</h4>
                    <ul className="flex-1 overflow-auto space-y-1 text-sm">
                      {peek.map(p => (
                        <li key={p.ticker} className="flex justify-between">
                          <span>
                            {p.ticker} – <span className="text-gray-600 dark:text-gray-400">{p.name}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      …weitere Positionen im vollen Depot
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
      </section>

      {/* 2. Weitere Investoren */}
      <section className="bg-card-dark border border-gray-700 rounded-xl shadow-md p-6 max-h-80 overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Weitere Investoren</h2>
      <ul className="divide-y divide-gray-700">
          {visibleOthers.map(inv => (
            <li key={inv.slug} className="flex justify-between items-center py-2 text-sm">
              <Link href={`/investor/${inv.slug}`} className="font-medium text-gray-100 hover:underline">
                {inv.name}
              </Link>
              <span className="numeric text-accent">
                {formatCurrency(portfolioValue[inv.slug] || 0, 'USD', 1)}
              </span>
            </li>
          ))}
        </ul>
        {others.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 text-accent hover:underline text-sm"
          >
            {showAll ? 'Weniger anzeigen' : `Alle (${others.length}) anzeigen`}
          </button>
        )}
      </section>

      {/* 3. Top-Tabellen */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/** Top-Käufe **/}
        <div className="bg-card-dark border border-gray-700 rounded-xl shadow-md p-6 text-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-100">Top 10 Käufe</h3>
            <span className="text-accent text-sm">({periodLabel})</span>
          </div>
          <ul className="divide-y divide-gray-700">
            {aggregated.map(item => (
              <li key={item.ticker} className="flex justify-between py-2">
                <Link href={`/aktie/${item.ticker.toLowerCase()}`} className="text-accent hover:underline">
                  {item.ticker} – <span className="text-gray-300">{nameMap[item.ticker]}</span>
                </Link>
                <span className="numeric text-gray-400">({item.count})</span>
              </li>
            ))}
          </ul>
        </div>

        {/** Top-Meistgehalten **/}
        <div className="bg-card-dark border border-gray-700 rounded-xl shadow-md p-6 text-sm">
          <h3 className="font-semibold text-gray-100 mb-2">Top 10 Meistgehalten</h3>
          <ul className="divide-y divide-gray-700">
            {topOwned.map(o => (
              <li key={o.ticker} className="flex justify-between py-2">
                <Link href={`/aktie/${o.ticker.toLowerCase()}`} className="text-accent hover:underline">
                  {o.ticker} – <span className="text-gray-300">{nameMap[o.ticker]}</span>
                </Link>
                <span className="numeric text-gray-400">{o.count}</span>
              </li>
            ))}
          </ul>
        </div>

        {/** Top-Biggest **/}
        <div className="bg-card-dark border border-gray-700 rounded-xl shadow-md p-6 text-sm">
          <h3 className="font-semibold text-gray-100 mb-2">Top 10 Biggest Investments</h3>
          <ul className="divide-y divide-gray-700">
            {biggest.map(inv => (
              <li key={inv.ticker} className="flex justify-between py-2">
                <Link href={`/aktie/${inv.ticker.toLowerCase()}`} className="text-accent hover:underline">
                  {inv.ticker} – <span className="text-gray-300">{inv.name}</span>
                </Link>
                <span className="numeric text-gray-400">
                  {formatCurrency(inv.value, 'USD', 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Was sind 13F-Filings? */}
      <section className="bg-card-dark border border-gray-700 rounded-xl shadow-md p-6 grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-100">Was sind 13F-Filings?</h2>
          <p className="text-lg leading-relaxed text-gray-300">
            13F-Filings sind quartalsweise Berichte, …
          </p>
          <Link href="/about-13f" className="inline-block text-accent hover:underline">
            Mehr erfahren →
          </Link>
        </div>
        <div className="flex justify-center">
          <Image src="/images/13f.png" alt="13F-Filings" width={320} height={200} />
        </div>
      </section>

      {/* 5. Newsletter */}
      <section className="bg-card-dark border border-gray-700 rounded-xl shadow-md p-6 text-center">
        <h3 className="text-2xl font-semibold text-gray-100 mb-2">
          Nie wieder ein Quartals-Update verpassen
        </h3>
        <p className="mb-4 text-gray-300">
          Melde Dich zu unserem Newsletter an …
        </p>
        <NewsletterSignup />
      </section>
    </main>
  )
}