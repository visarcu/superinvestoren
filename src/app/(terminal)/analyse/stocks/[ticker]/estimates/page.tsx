// src/app/(terminal)/analyse/stocks/[ticker]/estimates/page.tsx - INSIGHTS STYLE
import React from 'react'
import EstimatesPageClient from '@/components/EstimatesPageClient'

// Kein Gate gegen die statische stocks-Liste: der Client lädt live per Ticker.
export default function EstimatesPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-dark">
      <EstimatesPageClient ticker={ticker} />
    </div>
  )
}
