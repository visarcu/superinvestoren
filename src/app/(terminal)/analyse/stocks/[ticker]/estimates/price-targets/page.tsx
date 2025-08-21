// src/app/(terminal)/analyse/stocks/[ticker]/estimates/price-targets/page.tsx
import React from 'react'
import { stocks } from '@/data/stocks'
import PriceTargetsClient from '@/components/PriceTargetsClient'

export default function PriceTargetsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  if (!stock) {
    return <div>Aktie nicht gefunden</div>
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8">
        <PriceTargetsClient ticker={ticker} />
      </main>
    </div>
  )
}