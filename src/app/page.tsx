'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { investors, Investor } from '../data/investors'
import holdingsHistory from '../data/holdings'
import { stocks, Stock } from '../data/stocks'
import { BuyDetails } from '../components/BuyDetails'
import NewsletterSignup from '../components/NewsletterSignup'

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

  // Portfolio-Werte
  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0) / 1_000
    portfolioValue[slug] = total
  })

  // Weitere Investoren
  const others: Investor[] = investors
    .filter(inv => !highlighted.includes(inv.slug))
    .sort((a, b) => (portfolioValue[b.slug] || 0) - (portfolioValue[a.slug] || 0))
  const visibleOthers = showAll ? others : others.slice(0, 10)

  // Top-10 Käufe
  const buyCounts = new Map<string, number>()
  let allDates: string[] = []
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length < 2) return
    const prev = snaps[snaps.length - 2].data
    const cur = snaps[snaps.length - 1].data
    if (!prev?.positions || !cur?.positions) return

    allDates.push(cur.date)
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
  const latestDate = allDates.sort().pop() || ''
  const periodLabel = latestDate ? getQuarterFromDate(latestDate) : ''

  // Name-Lookup
  const nameMap: Record<string, string> = {}
  stocks.forEach(s => {
    nameMap[s.ticker] = s.name
  })

  // Top-10 Meistgehalten
  const cusipToTicker = new Map(stocks.map(s => [s.cusip, s.ticker]))
  const ownershipCount = new Map<string, number>()
  Object.entries(holdingsHistory).forEach(([_, snaps]) => {
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

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-16">

        {/* 1. Highlighted Investors */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {investors
            .filter(i => highlighted.includes(i.slug))
            .map(inv => (
              <Link
                key={inv.slug}
                href={`/investor/${inv.slug}`}
                className={`
                  bg-white dark:bg-surface-dark rounded-xl shadow-lg
                  hover:shadow-2xl transform hover:-translate-y-1 transition
                  p-6 flex flex-col items-center relative
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
                <div className="text-2xl font-semibold text-center dark:text-white">
                  {inv.name}
                </div>
              </Link>
            ))}
        </section>

        {/* 2. Weitere Investoren */}
        <section className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-6 max-h-80 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Weitere Investoren</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleOthers.map(inv => (
              <li
                key={inv.slug}
                className="flex justify-between items-center py-2 text-sm"
              >
                <Link
                  href={`/investor/${inv.slug}`}
                  className="font-medium hover:underline"
                >
                  {inv.name}
                </Link>
                <span className="font-orbitron text-gray-600 dark:text-gray-400">
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

        {/* 3. Kompakte Top-Tabellen unterhalb */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {/* Top-10 Käufe */}
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-4 text-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Top 10 Käufe</h3>
              <span className="text-green-600 text-sm">({periodLabel})</span>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {aggregated.map(item => (
                <li key={item.ticker} className="flex justify-between py-2">
                  <Link
                    href={`/aktie/${item.ticker.toLowerCase()}`}
                    className="text-blue-600 hover:underline"
                  >
                    {item.ticker}
                  </Link>
                  <span className="font-orbitron text-gray-600 dark:text-gray-400">
                    ({item.count})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top-10 Meistgehalten */}
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-4 text-sm">
            <h3 className="font-semibold mb-2">Top 10 Meistgehalten</h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {topOwned.map(o => (
                <li key={o.ticker} className="flex justify-between py-2">
                  <Link
                    href={`/aktie/${o.ticker.toLowerCase()}`}
                    className="text-blue-600 hover:underline"
                  >
                    {o.ticker}
                  </Link>
                  <span className="font-orbitron text-gray-600 dark:text-gray-400">
                    {o.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top-10 Biggest Investments */}
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-4 text-sm">
            <h3 className="font-semibold mb-2">Top 10 Biggest Investments</h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {/** Hier musst du die Logik einbauen, um die 10 nach Gesamt-Marktwert zu sortieren **/}
              {stocks
                .map(s => {
                  // summiere über alle Investoren
                  const total = Object.values(holdingsHistory).reduce((sum, snaps) => {
                    const latest = snaps[snaps.length - 1].data
                    const match = latest.positions.find(p => p.cusip === s.cusip)
                    return sum + (match?.value || 0)
                  }, 0)
                  return { ticker: s.ticker, name: s.name, value: total }
                })
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
                .map(inv => (
                  <li key={inv.ticker} className="flex justify-between py-2">
                    <Link
                      href={`/aktie/${inv.ticker.toLowerCase()}`}
                      className="text-blue-600 hover:underline"
                    >
                      {inv.ticker}
                    </Link>
                    <span className="font-orbitron text-gray-600 dark:text-gray-400">
                      {formatCurrency(inv.value, 'USD', 0)}
                    </span>
                  </li>
                ))
              }
            </ul>
          </div>
        </section>

        {/* 4. Erklärung zu 13F-Filings */}
        <section className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Was sind 13F-Filings?</h2>
            <p className="text-lg leading-relaxed">
              13F-Filings sind quartalsweise Berichte, die institutionelle
              Investoren (mit einem verwalteten Vermögen von über 100 Millionen USD)
              bei der US-Börsenaufsicht (SEC) einreichen müssen. Darin legen
              sie offen, welche Wertpapiere sie halten. Da diese Daten erst
              45 Tage nach Quartalsende veröffentlicht werden, spricht man von
              „Delayed portfolios“.
            </p>
            <Link href="/about-13f" className="inline-block text-accent hover:underline">
              Mehr erfahren →
            </Link>
          </div>
          <div className="flex justify-center">
            <Image
              src="/images/13f.png"
              alt="Illustration zu 13F-Filings"
              width={320}
              height={200}
            />
          </div>
        </section>

        {/* 5. Newsletter-Signup */}
        <section className="bg-gray-50 dark:bg-surface-dark p-8 rounded-lg text-center">
          <h3 className="text-2xl font-semibold mb-2">
            Nie wieder ein Quartals-Update verpassen
          </h3>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Melde Dich zu unserem Newsletter an und erhalte jeden Quartals-Release
            direkt in Dein Postfach – kostenlos und ohne Spam.
          </p>
          <NewsletterSignup />
        </section>

      </main>
    </>
  )
}