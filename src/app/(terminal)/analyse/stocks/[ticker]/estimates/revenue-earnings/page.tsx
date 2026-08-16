// src/app/(terminal)/analyse/stocks/[ticker]/estimates/revenue-earnings/page.tsx
import React from 'react'
import RevenueEarningsClient from '@/components/RevenueEarningsClient'

// Kein Gate gegen die statische stocks-Liste: der Client lädt live per Ticker.
export default function RevenueEarningsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8">
        <RevenueEarningsClient ticker={ticker} />
      </main>
    </div>
  )
}