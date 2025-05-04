'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { investors, Investor } from '../data/investors'
import holdingsHistory from '../data/holdings'
import { stocks, Stock } from '../data/stocks'
import { BuyDetails } from '../components/BuyDetails'

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

  // Portfolio‐Werte
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
    .sort((a,b)=> (portfolioValue[b.slug]||0) - (portfolioValue[a.slug]||0))
  const visibleOthers = showAll ? others : others.slice(0,10)

  // Top-10 Käufe
  const buyCounts = new Map<string, number>()
  let allDates: string[] = []
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length < 2) return
    const prev = snaps[snaps.length-2].data
    const cur  = snaps[snaps.length-1].data
    if (!prev?.positions || !cur?.positions) return

    allDates.push(cur.date)
    const prevMap = new Map<string,number>()
    prev.positions.forEach(p=>{
      prevMap.set(p.cusip,(prevMap.get(p.cusip)||0)+p.shares)
    })
    const counted = new Set<string>()
    cur.positions.forEach(p=>{
      const delta = p.shares - (prevMap.get(p.cusip)||0)
      if (delta>0) {
        const st = stocks.find(s=>s.cusip===p.cusip)
        if (st && !counted.has(st.ticker)) {
          counted.add(st.ticker)
          buyCounts.set(st.ticker,(buyCounts.get(st.ticker)||0)+1)
        }
      }
    })
  })
  const aggregated = Array.from(buyCounts.entries())
    .sort(([,a],[,b])=>b-a)
    .map(([ticker,count])=>({ticker,count}))
    .slice(0,10)
  const latestDate = allDates.sort().pop()||''
  const periodLabel = latestDate ? getQuarterFromDate(latestDate) : ''

  // Name-Lookup
  const nameMap: Record<string,string> = {}
  stocks.forEach(s=>{ nameMap[s.ticker] = s.name })

  // Top-10 Meistgehalten
  const cusipToTicker = new Map(stocks.map(s=>[s.cusip,s.ticker]))
  const ownershipCount = new Map<string,number>()
  Object.entries(holdingsHistory).forEach(([_,snaps])=>{
    const latest = snaps[snaps.length-1].data
    if (!latest?.positions) return
    const seen = new Set<string>()
    latest.positions.forEach(p=>{
      const t = cusipToTicker.get(p.cusip)
      if (t && !seen.has(t)) {
        seen.add(t)
        ownershipCount.set(t,(ownershipCount.get(t)||0)+1)
      }
    })
  })
  const topOwned: TopOwnedItem[] = Array.from(ownershipCount.entries())
    .sort(([,a],[,b])=>b-a)
    .slice(0,10)
    .map(([ticker,count])=>({ticker,count}))

  return (
    <>
      {/* Hero nahtlos */}
      <section className="bg-gradient-to-r from-heroFrom to-heroTo text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold">SUPERINVESTOR</h1>
          <p className="mt-4 text-lg max-w-3xl mx-auto opacity-90">
            Superinvestoren bewegen Märkte und beeinflussen Regierungen.<br/>
            Verschaffe dir einen Vorsprung, indem du siehst, was sie kaufen –  
            und finde deine nächste Millionen-Aktie.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Highlighted */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {investors.filter(i=>highlighted.includes(i.slug)).map(inv=>(
            <Link
              key={inv.slug}
              href={`/investor/${inv.slug}`}
              className={`
                bg-white dark:bg-surface-dark rounded-xl shadow-lg hover:shadow-2xl
                transform hover:-translate-y-1 transition p-6 flex flex-col items-center
                ${inv.slug==='buffett'?'ring-4 ring-yellow-400':''}
              `}
            >
              {inv.slug==='buffett' && (
                <span className="absolute top-3 right-3 text-yellow-400 text-2xl">👑</span>
              )}
              {inv.imageUrl && (
                <div className="w-24 h-24 mb-4 relative">
                  <Image src={inv.imageUrl} alt={inv.name} fill className="rounded-full object-cover"/>
                </div>
              )}
              <div className="text-2xl font-semibold text-center dark:text-white">
                {inv.name}
              </div>
            </Link>
          ))}
        </section>

        {/* Weitere & Top-Listen */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weitere Investoren */}
          <section className="col-span-2 bg-white dark:bg-surface-dark rounded-xl shadow-md p-6 max-h-80 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Weitere Investoren</h2>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {visibleOthers.map(inv=>(
                <li
                  key={inv.slug}
                  className="flex justify-between items-center py-2 text-sm"
                >
                  <Link href={`/investor/${inv.slug}`} className="font-medium hover:underline">
                    {inv.name}
                  </Link>
                  {/* Hier Orbitron auf die Zahl */}
                  <span className="font-orbitron text-gray-600 dark:text-gray-400">
                    {formatCurrency(portfolioValue[inv.slug]||0,'USD',1)}
                  </span>
                </li>
              ))}
            </ul>
            {others.length>10 && (
              <button
                onClick={()=>setShowAll(!showAll)}
                className="mt-4 text-accent hover:underline text-sm"
              >
                {showAll?'Weniger anzeigen':`Alle (${others.length}) anzeigen`}
              </button>
            )}
          </section>

          {/* Top-10 Käufe & Meistgehalten */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Top 10 Käufe</h2>
                <span className="text-sm text-green-600">({periodLabel})</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {aggregated.map(item=>(
                  <li
                    key={item.ticker}
                    className="flex justify-between py-3"
                  >
                    <Link
                      href={`/aktie/${item.ticker.toLowerCase()}`}
                      className="text-blue-600 hover:underline"
                    >
                      {item.ticker} – {nameMap[item.ticker]}
                    </Link>
                    <span className="font-orbitron text-gray-600 dark:text-gray-400">
                      ({item.count})
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4"><BuyDetails data={aggregated}/></div>
            </section>

            <section className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Top 10 Meistgehalten</h2>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {topOwned.map(o=>(
                  <li
                    key={o.ticker}
                    className="flex justify-between py-3"
                  >
                    <Link
                      href={`/aktie/${o.ticker.toLowerCase()}`}
                      className="text-blue-600 hover:underline"
                    >
                      {o.ticker} – {nameMap[o.ticker]}
                    </Link>
                    <span className="font-orbitron text-gray-600 dark:text-gray-400">
                      {o.count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}