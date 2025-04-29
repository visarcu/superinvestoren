// src/app/investor/[slug]/page.tsx
'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'

import holdingsHistory from '@/data/holdings'      // statt des flachen holdingsData
import InvestorTabs from '@/components/InvestorTabs'
import type { SectorDatum } from '@/components/SectorPieChart'
import { stocks } from '@/data/stocks'

// die Charts bleiben unverändert
const SectorPieChart = dynamic(
  () => import('@/components/SectorPieChart'),
  { ssr: false }
)
const TopPositionsBarChart = dynamic(
  () => import('@/components/TopPositionsBarChart'),
  { ssr: false }
)

import articlesBuffett from '@/data/articles/buffett.json'
import articlesAckman  from '@/data/articles/ackman.json'
import articlesGates   from '@/data/articles/gates.json'
import ArticleList from '@/components/ArticleList'
import type { Article } from '@/components/ArticleList'

interface Position {
  cusip:       string
  name:        string
  shares:      number
  value:       number
  deltaShares: number
  pctDelta:    number
}

export default function InvestorPage({
  params: { slug },
}: {
  params: { slug: string }
}) {
  // ─── 1) History-Snapshots holen ───────────────────────────────
  const snapshots = holdingsHistory[slug]
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return notFound()
  }

  // ─── 2) Aktuellster und vorletzter Snapshot ───────────────────
  const latestSnapshot   = snapshots[snapshots.length - 1]
  const previousSnapshot = snapshots[snapshots.length - 2]  // kann undefined sein

  // ─── 3) Daten-Objekte extrahieren ─────────────────────────────
  const current  = latestSnapshot.data
  const previous = previousSnapshot?.data

  // ─── 4) Prev-Map aufbauen (falls Prev da) ──────────────────────
  const prevMap = new Map<string, number>()
  previous?.positions.forEach(p => {
    prevMap.set(p.cusip, (prevMap.get(p.cusip) ?? 0) + p.shares)
  })

  // ─── 5) Doppelte CUSIPs im aktuellen Depot zusammenführen ──────
  const merged = Array.from(
    current.positions.reduce(
      (map, p) => {
        if (!map.has(p.cusip)) {
          map.set(p.cusip, { ...p })
        } else {
          const e = map.get(p.cusip)!
          e.shares += p.shares
          e.value   += p.value
        }
        return map
      },
      new Map<string, { cusip: string; name: string; shares: number; value: number }>()
    ).values()
  )

  // ─── 6) Delta berechnen ────────────────────────────────────────
  const full: Position[] = merged.map(p => {
    const prev  = prevMap.get(p.cusip) ?? 0
    const delta = p.shares - prev
    const pct   = prev > 0 ? delta / prev : 0
    return { ...p, deltaShares: delta, pctDelta: pct }
  })

  // ─── 7) Sortieren & filtern ───────────────────────────────────
  const holdings = full.slice().sort((a, b) => b.value - a.value)
  const buys     = holdings.filter(p => p.deltaShares > 0)
  const sells    = holdings.filter(p => p.deltaShares < 0)

  // ─── 8) Top-10 als Prozent des Gesamtwerts ────────────────────
  const totalValue = holdings.reduce((sum, p) => sum + p.value, 0)
  const top10 = holdings.slice(0, 10).map(p => ({
    name:    p.name,
    percent: (p.value / totalValue) * 100,
  }))

  // ─── 9) Sektor-Summen berechnen ───────────────────────────────
  const cusipToTicker  = new Map(stocks.map(s => [s.cusip, s.ticker]))
  const tickerToSector = new Map(stocks.map(s => [s.ticker, s.sector]))
  const sectorTotals: Record<string, number> = {}
  holdings.forEach(p => {
    const ticker = cusipToTicker.get(p.cusip)
    const sector = ticker ? tickerToSector.get(ticker) ?? 'Sonstige' : 'Sonstige'
    sectorTotals[sector] = (sectorTotals[sector] ?? 0) + p.value
  })
  const sectorData: SectorDatum[] = Object.entries(sectorTotals).map(
    ([sector, value]) => ({ sector, value })
  )

  // ─── 10) Datum formatieren ────────────────────────────────────
  let formattedDate = '–'
  if (current.date) {
    const [year, month, day] = current.date.split('-')
    formattedDate = `${day}.${month}.${year}`
  }

  // ─── 11) Articles auswählen ────────────────────────────────────
  let articles: Article[] = []
  switch (slug) {
    case 'buffett': articles = articlesBuffett; break
    case 'ackman':  articles = articlesAckman;  break
    case 'gates':   articles = articlesGates;   break
    default:        articles = []
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <main className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-20 h-20 relative">
          <Image
            src={`/images/${slug}.png`}
            alt={slug}
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="ml-4">
          <h1 className="text-3xl font-bold capitalize">{slug}</h1>
          <p className="text-gray-600">
            Aktualisiert am {formattedDate}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <InvestorTabs holdings={holdings} buys={buys} sells={sells} />

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Sektor-Verteilung
          </h2>
          <SectorPieChart data={sectorData} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Top 10 Positionen
          </h2>
          <TopPositionsBarChart data={top10} />
        </div>
      </div>

      {/* Articles */}
      {articles.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold text-center">
            Articles &amp; Commentaries
          </h2>
          <ArticleList articles={articles} />
        </>
      )}
    </main>
  )
}