// src/app/(terminal)/analyse/stocks/[ticker]/estimates/surprises/page.tsx
import React from 'react'
import { stocks } from '@/data/stocks'
import SurprisesClient from '@/components/SurprisesClient'

export default function SurprisesPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  if (!stock) {
    return <div>Aktie nicht gefunden</div>
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8">
        <SurprisesClient ticker={ticker} />
      </main>
    </div>
  )
}