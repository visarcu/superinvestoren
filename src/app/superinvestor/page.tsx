// src/app/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import YouTubeCarousel from '@/components/YoutubeCarousel'
import { featuredVideos } from '@/data/videos'
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

// Datum → tatsächliches Reporting-Quartal (ein Filing-Quartal zurück)
function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
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
  const highlighted = ['buffett', 'ackman', 'smith']
  const others: Investor[] = investors
    .filter(inv => !highlighted.includes(inv.slug))
    .sort((a, b) => (portfolioValue[b.slug] || 0) - (portfolioValue[a.slug] || 0))
  const visibleOthers = showAll ? others : others.slice(0, 10)

  // 3. Top-10 Käufe
   // 3. Top-10 Käufe aus **dem letzten** Snapshot-Datum
 // 3. Top-10 Käufe aus **dem letzten** Reporting-Quartal
// a) Finde das gemeinsame letzte Datum
const allDates = Object.values(holdingsHistory)
.map(snaps => snaps[snaps.length - 1]?.data.date)
.filter(Boolean) as string[]
const latestDate    = allDates.sort().pop() || ''
// b) Ermittele das Reporting-Quartal dieses Datums
const latestQuarter = latestDate ? getPeriodFromDate(latestDate) : ''

// c) Zähle Käufe aus genau diesem Quartal
const buyCounts = new Map<string, number>()
Object.values(holdingsHistory).forEach(snaps => {
if (snaps.length < 2) return
const prev = snaps[snaps.length - 2].data
const cur  = snaps[snaps.length - 1].data

// ** statt auf Datum auf Quartal prüfen **
if (getPeriodFromDate(cur.date) !== latestQuarter) return

const prevMap = new Map<string, number>()
prev.positions.forEach(p =>
 prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares)
)
const seen = new Set<string>()
cur.positions.forEach(p => {
 const delta = p.shares - (prevMap.get(p.cusip) || 0)
 if (delta > 0) {
   const st = stocks.find(s => s.cusip === p.cusip)
   if (st && !seen.has(st.ticker)) {
     seen.add(st.ticker)
     buyCounts.set(st.ticker, (buyCounts.get(st.ticker) || 0) + 1)
   }
 }
})
})

// d) Baue die Top-10-Liste und setze das Label aufs Quartal
const aggregated = Array.from(buyCounts.entries())
.sort(([, a], [, b]) => b - a)
.slice(0, 10)
.map(([ticker, count]) => ({ ticker, count }))

const periodLabel = latestQuarter

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

<section className="text-center space-y-4">
  <h1 className="text-4xl md:text-5xl font-bold text-white font-orbitron">
    Die besten Investoren der Welt
  </h1>
  <p className="text-gray-400 text-lg max-w-3xl mx-auto">
    Entdecke, wie Legenden wie Warren Buffett, Bill Ackman und Terry Smith investieren – mit aktuellen Portfolios, Top-Käufen & Analysen.
  </p>
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
            bg-gradient-to-br from-gray-800 to-gray-900
            rounded-2xl
            ring-1 ring-accent/20
            hover:shadow-lg hover:scale-105
            transition-all duration-300
            p-8 flex flex-col items-center
          `}
        >
          {inv.slug === 'buffett' && (
            <span className="absolute top-2 right-2 text-yellow-400 text-2xl">
              👑
            </span>
          )}

          {inv.imageUrl && (
            <div className="w-24 h-24 mb-6 relative rounded-full overflow-hidden ring-2 ring-accent ring-offset-1 ring-offset-gray-800">
              <Image
                src={inv.imageUrl}
                alt={inv.name}
                fill
                className="object-cover"
              />
            </div>
          )}

<h3 className="text-xl lg:text-2xl font-semibold text-gray-100 text-center">
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
    shadow-2xl/10 p-8 flex flex-col space-y-4
  ">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-orbitron text-white">Top 10 Käufe</h3>
      <span className="text-sm text-accent font-mono">({periodLabel})</span>
    </div>
    <ul className="space-y-3">
      {aggregated.map(item => (
        <li key={item.ticker} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
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
    shadow-2xl/10 p-8 flex flex-col space-y-4
  ">
    <h3 className="text-lg font-orbitron text-white mb-4">Top 10 Meistgehalten</h3>
    <ul className="space-y-3">
      {topOwned.map(o => (
        <li key={o.ticker} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
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
        <li key={inv.ticker} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
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


<section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Neueste Video-Analysen
        </h2>
        <YouTubeCarousel videos={featuredVideos} />
      </section>


    {/* 6) Info & Newsletter */}
          <section className="grid md:grid-cols-2 gap-8">
            {/* 13F */}
            <div className="flex items-start space-x-4 bg-gray-900 p-6 rounded-2xl">
              <Image src="/images/13f-icon.png" alt="13F" width={48} height={48} />
              <div>
                <h3 className="text-xl font-semibold text-white">Was sind 13F-Filings?</h3>
                <p className="text-gray-300">
                  Quartalsberichte großer institutioneller Investmentmanager an die US-SEC.
                </p>
              </div>
            </div>
            {/* Newsletter */}
            <div className="bg-gray-900 p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-3">
                Nie wieder ein Quartals-Update verpassen
              </h3>
              <NewsletterSignup />
            </div>
          </section>
    </main>
  )
}
