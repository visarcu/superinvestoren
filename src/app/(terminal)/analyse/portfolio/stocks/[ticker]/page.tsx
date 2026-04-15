// src/app/(terminal)/analyse/portfolio/stocks/[ticker]/page.tsx
import React from 'react'
import PortfolioStockDetail from '@/components/portfolio/PortfolioStockDetail'

export default function PortfolioStockPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-dark">
      <main className="w-full px-6 lg:px-8 py-6 pb-24">
        <PortfolioStockDetail ticker={ticker} />
      </main>
    </div>
  )
}
