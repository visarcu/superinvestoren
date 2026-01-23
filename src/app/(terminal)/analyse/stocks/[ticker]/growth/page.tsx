// src/app/(terminal)/analyse/stocks/[ticker]/growth/page.tsx
import React from 'react'
import { stocks } from '@/data/stocks'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
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

export default function GrowthAnalysisPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  // Falls die Aktie nicht existiert, gib 404 aus
  if (!stock) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-white mb-2">Aktie nicht gefunden</h1>
          <p className="text-neutral-500 mb-6">
            Die Aktie mit dem Symbol "{ticker}" konnte nicht gefunden werden.
          </p>
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zur Analyse
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      <GrowthAnalysisClient ticker={ticker} />
    </div>
  )
}