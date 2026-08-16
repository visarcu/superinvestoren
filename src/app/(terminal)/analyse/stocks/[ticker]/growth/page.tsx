// src/app/(terminal)/analyse/stocks/[ticker]/growth/page.tsx
import React from 'react'
import { stocks } from '@/data/stocks'
import GrowthAnalysisClient from '@/components/GrowthAnalysisClient'

// ISR: jede Seite wird nach 3600 Sekunden neu gebaut
export const revalidate = 3600

// Nur diese wenigen Ticker werden beim Build bereits statisch erzeugt:
const FEATURED_TICKERS = ['NVDA', 'AAPL', 'AMZN', 'GOOGL', 'MSFT', 'TSLA']

export async function generateStaticParams() {
  return FEATURED_TICKERS.map((t) => ({
    ticker: t.toLowerCase(),
  }))
}

// Metadata für SEO
export async function generateMetadata({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)
  
  return {
    title: stock 
      ? `${stock.name} (${ticker}) - Wachstumsanalyse | Finclue`
      : `${ticker} - Wachstumsanalyse | Finclue`,
    description: stock
      ? `Detaillierte Wachstumsanalyse von ${stock.name} (${ticker}): Revenue Growth, EPS Growth, CAGR-Berechnungen und Forward Estimates.`
      : `Wachstumsanalyse für ${ticker} mit Revenue Growth, EPS Growth und historischen Trends.`,
  }
}

// Kein Gate gegen die statische stocks-Liste: der Client lädt live per Ticker.
export default function GrowthAnalysisPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-theme-primary">
      <GrowthAnalysisClient ticker={ticker} />
    </div>
  )
}