// src/app/(terminal)/analyse/portfolio/stocks/[ticker]/page.tsx
import React from 'react'
import PortfolioStockDetail from '@/components/portfolio/PortfolioStockDetail'

export default function PortfolioStockPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="w-full px-4 py-4 pb-20 sm:px-6 xl:px-8">
        <PortfolioStockDetail ticker={ticker} />
      </main>
    </div>
  )
}
