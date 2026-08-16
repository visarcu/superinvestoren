// src/app/(terminal)/analyse/stocks/[ticker]/estimates/surprises/page.tsx
import React from 'react'
import SurprisesClient from '@/components/SurprisesClient'

// Kein Gate gegen die statische stocks-Liste: der Client lädt live per Ticker.
export default function SurprisesPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8">
        <SurprisesClient ticker={ticker} />
      </main>
    </div>
  )
}