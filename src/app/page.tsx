// src/app/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { investors, Investor } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import NewsletterSignup from '@/components/NewsletterSignup'
import SearchTickerInput from '@/components/SearchTickerInput'

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
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<typeof stocks>([])

  // Update suggestions on query change
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSuggestions([])
      return
    }
    const q = searchQuery.trim().toUpperCase()
    const filtered = stocks.filter(
      s =>
        s.ticker.startsWith(q) ||
        s.name.toUpperCase().includes(q)
    ).slice(0, 10)
    setSuggestions(filtered)
  }, [searchQuery])

  const handleSelectTicker = (ticker: string) => {
    setSearchQuery('')
    setSuggestions([])
    router.push(`/analyse/${ticker.toLowerCase()}`)
  }

  // 1. Portfolio-Werte je Investor
  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0) / 1_000
    portfolioValue[slug] = total
  })

  // 2. Weitere Investoren
  const highlighted = ['buffett', 'ackman', 'burry']
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
  stocks.forEach(s => { nameMap[s.ticker] = s.name })

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

     {/* Mini-Schnell-Analyse */}
     <section className="relative overflow-visible rounded-2xl p-10 bg-gradient-to-r from-heroFrom to-heroTo">
  <div className="absolute inset-0 bg-white/5 blur-3xl animate-pulse-slow" />
  <div className="relative space-y-4">
    <h2 className="text-4xl font-orbitron text-white">Schnell-Analyse</h2>
    <p className="text-gray-300 leading-relaxed">
      Gib ein Ticker-Symbol ein und erhalte in Sekunden Live-Quote und Charts.
    </p>

    <div className="flex space-x-4 items-center">
      <div className="relative flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="AAPL, MSFT …"
          className="w-full px-4 py-3 rounded-full bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-accent outline-none transition"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-[1000] w-full mt-1 max-h-60 overflow-auto bg-gray-900 rounded shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
            {suggestions.map((s) => (
              <li
                key={s.ticker}
                onMouseDown={() => handleSelectTicker(s.ticker)}
                className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-100"
              >
                <strong>{s.ticker}</strong> – {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => { /* optional */ }}
        className="bg-accent text-black px-6 py-3 rounded-full font-semibold hover:bg-accent/90 transition"
      >
        Los
      </button>
    </div>
  </div>
</section>

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
          className={`
            relative group
            bg-card-dark
            rounded-3xl
            shadow-[0_8px_16px_rgba(0,0,0,0.6)]
            hover:shadow-[0_12px_24px_rgba(0,0,0,0.8)]
            transform hover:-translate-y-2 hover:scale-[1.02]
            transition-all duration-300
            p-8 flex flex-col items-center
          `}
        >
          {inv.slug === 'buffett' && (
            <span className="absolute top-4 right-4 text-yellow-400 text-3xl">
              👑
            </span>
          )}

          {inv.imageUrl && (
            <div className="w-28 h-28 mb-6 relative border-4 border-accent rounded-full overflow-hidden">
              <Image
                src={inv.imageUrl}
                alt={inv.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          <h3 className="text-2xl font-semibold text-white text-center">
            {inv.name}
          </h3>

          {peek.length > 0 && (
            <div className={`
              absolute inset-0
              bg-white/90 dark:bg-gray-800/90
              opacity-0 pointer-events-none
              group-hover:opacity-100 group-hover:pointer-events-auto
              transition-opacity rounded-3xl p-4 flex flex-col
            `}>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">
                Top 3 Positionen
              </h4>
              <ul className="flex-1 overflow-auto space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {peek.map(p => (
                  <li key={p.ticker} className="flex justify-between">
                    <span>
                      {p.ticker} –{' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {p.name}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                …weitere Positionen im vollen Depot
              </p>
            </div>
          )}
        </Link>
      )
    })}
</section>

      {/* 2. Weitere Investoren */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-100">Weitere Investoren</h2>
        <ul className="divide-y divide-gray-700">
          {visibleOthers.map(inv => (
            <li key={inv.slug} className="py-2 flex justify-between items-center text-sm">
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
<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Top-Käufe Card */}
  <div className="
    bg-gray-800/60 backdrop-blur-md
    border border-gray-700 rounded-2xl
    shadow-md p-6 flex flex-col
  ">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-orbitron text-white">Top 10 Käufe</h3>
      <span className="text-sm text-accent font-mono">({periodLabel})</span>
    </div>
    <ul className="space-y-3">
      {aggregated.map(item => (
        <li key={item.ticker} className="flex justify-between items-center">
          <Link
            href={`/aktie/${item.ticker.toLowerCase()}`}
            className="text-accent font-semibold hover:underline"
          >
            {item.ticker} – <span className="text-gray-300">{nameMap[item.ticker]}</span>
          </Link>
          <span className="text-gray-300 text-sm">({item.count})</span>
        </li>
      ))}
    </ul>
  </div>

  {/* Top-Meistgehalten Card */}
  <div className="
    bg-gray-800/60 backdrop-blur-md
    border border-gray-700 rounded-2xl
    shadow-md p-6 flex flex-col
  ">
    <h3 className="text-lg font-orbitron text-white mb-4">Top 10 Meistgehalten</h3>
    <ul className="space-y-3">
      {topOwned.map(o => (
        <li key={o.ticker} className="flex justify-between items-center">
          <Link
            href={`/aktie/${o.ticker.toLowerCase()}`}
            className="text-accent font-semibold hover:underline"
          >
            {o.ticker} – <span className="text-gray-300">{nameMap[o.ticker]}</span>
          </Link>
          <span className="text-gray-300 text-sm">{o.count}</span>
        </li>
      ))}
    </ul>
  </div>

  {/* Top-Biggest Investments Card */}
  <div className="
    bg-gray-800/60 backdrop-blur-md
    border border-gray-700 rounded-2xl
    shadow-md p-6 flex flex-col
  ">
    <h3 className="text-lg font-orbitron text-white mb-4">Top 10 Biggest Investments</h3>
    <ul className="space-y-3">
      {biggest.map(inv => (
        <li key={inv.ticker} className="flex justify-between items-center">
          <Link
            href={`/aktie/${inv.ticker.toLowerCase()}`}
            className="text-accent font-semibold hover:underline"
          >
            {inv.ticker} – <span className="text-gray-300">{inv.name}</span>
          </Link>
          <span className="text-gray-300 text-sm">
            {formatCurrency(inv.value, 'USD', 0)}
          </span>
        </li>
      ))}
    </ul>
  </div>
</section>

      <section className="grid md:grid-cols-2 gap-8">
  {/* 13F-Filings */}
  <div className="
    relative p-6 bg-gray-800/60 backdrop-blur-md
    border border-gray-700 rounded-2xl shadow-md
    flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6
  ">
    <div className="flex-shrink-0 w-20 h-20">
      <Image src="/images/13f-icon.png" alt="13F-Icon" width={80} height={80} />
    </div>
    <div>
      <h2 className="text-2xl font-orbitron text-white mb-2">
        Was sind 13F-Filings?
      </h2>
      <p className="text-gray-300">
        13F-Filings sind quartalsweise Berichte, die große institutionelle Investment-
        manager (z. B. Hedgefunds) bei der US-Börsenaufsicht SEC einreichen müssen. …
      </p>
    </div>
  </div>

  {/* Newsletter */}
  <div className="
    relative p-6 bg-gray-800/60 backdrop-blur-md
    border border-gray-700 rounded-2xl shadow-md
    text-center space-y-4
  ">
    <h2 className="text-2xl font-orbitron text-white">
      Nie wieder ein Quartals-Update verpassen
    </h2>
    <p className="text-gray-300">
      Melde Dich zu unserem Newsletter an …
    </p>
    <div className="mt-2 max-w-md mx-auto">
      <NewsletterSignup />
    </div>
  </div>
</section>
    </main>
  )
}
