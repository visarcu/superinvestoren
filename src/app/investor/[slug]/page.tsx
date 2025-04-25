// src/app/investor/[slug]/page.tsx
'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import holdingsData, { HoldingsFile } from '@/data/holdings'
import InvestorTabs from '@/components/InvestorTabs'
import WatchlistButton from '@/components/WatchlistButton'

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
  // (1) Aktuelle Daten aus dem statischen Record
  const current: HoldingsFile | undefined = holdingsData[slug]
  if (!current) return notFound()

  // (2) Vorperiode (optional)
  const previous: HoldingsFile | undefined = holdingsData[`${slug}-previous`]

  // (3) Prev-Map aufbauen
  const prevMap = new Map<string, number>()
  previous?.positions.forEach(p => {
    prevMap.set(p.cusip, p.shares)
  })

  // (4) Vollständige Positionen mit Delta
  const full: Position[] = current.positions.map(p => {
    const prevShares = prevMap.get(p.cusip) ?? 0
    const delta      = p.shares - prevShares
    const pct        = prevShares > 0 ? delta / prevShares : 1
    return {
      ...p,
      deltaShares: delta,
      pctDelta:    pct,
    }
  })

  // (5) Sortieren & filtern
  const holdings = [...full].sort((a, b) => b.value - a.value)
  const buys     = holdings.filter(p => p.deltaShares > 0)
  const sells    = holdings.filter(p => p.deltaShares < 0)

  return (
    <main className="max-w-4xl mx-auto p-4">
      {/* Header mit Watchlist-Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
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
              Aktualisiert am{' '}
              {new Date(current.date).toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>
        <WatchlistButton slug={slug} />
      </div>

      {/* Tabs */}
      <InvestorTabs
        holdings={holdings}
        buys={buys}
        sells={sells}
      />
    </main>
  )
}