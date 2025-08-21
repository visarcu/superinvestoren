// src/app/(terminal)/analyse/stocks/[ticker]/estimates/page.tsx
import React from 'react'
import { stocks } from '@/data/stocks'
import EstimatesOverview from '@/components/EstimatesOverview'

export default function EstimatesPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  if (!stock) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-theme-primary mb-4">Aktie nicht gefunden</h1>
          <p className="text-theme-secondary">
            Die Aktie mit dem Symbol "{ticker}" konnte nicht gefunden werden.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8">
        <EstimatesOverview ticker={ticker} />
      </main>
    </div>
  )
}