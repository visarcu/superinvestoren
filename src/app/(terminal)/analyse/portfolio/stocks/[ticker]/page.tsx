// src/app/(terminal)/analyse/portfolio/stocks/[ticker]/page.tsx
import React from 'react'
import PortfolioStockDetail from '@/components/portfolio/PortfolioStockDetail'

export default function PortfolioStockPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  // Seiten-Shell (Kopfzeile, Padding) liegt in der Komponente — wie im Workspace
  return <PortfolioStockDetail ticker={ticker} />
}
