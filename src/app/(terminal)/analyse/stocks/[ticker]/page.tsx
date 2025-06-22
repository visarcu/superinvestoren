// src/app/(terminal)/analyse/stocks/[ticker]/page.tsx - BALANCED LAYOUT
import React from 'react'
import { stocks } from '@/data/stocks'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import AnalysisClient from '@/components/AnalysisClient'

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
      ? `${stock.name} (${ticker}) - Aktienanalyse | FinClue`
      : `${ticker} - Aktienanalyse | FinClue`,
    description: stock
      ? `Detaillierte Kennzahlen-Analyse von ${stock.name} (${ticker}): Live-Kurse, Charts, Fundamentaldaten und mehr.`
      : `Aktienanalyse für ${ticker} mit Live-Kursen, Charts und Fundamentaldaten.`,
  }
}

// Diese Page-Component ist eine reine Server Component - Theme-aware
export default function AnalysisPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  // Falls die Aktie nicht existiert, gib 404 aus - Theme-aware
  if (!stock) {
    return (
      <div className="min-h-screen bg-theme-primary noise-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-theme-primary mb-4">Aktie nicht gefunden</h1>
          <p className="text-theme-secondary mb-8">
            Die Aktie mit dem Symbol "{ticker}" konnte nicht gefunden werden.
          </p>
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zur Analyse
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary noise-bg">
      {/* Hero Section mit Gradient - Theme-aware */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-theme-primary to-theme-primary"></div>
        </div>
        
        {/* ✅ BALANCED Container - nicht zu breit, nicht zu schmal */}
        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-16 pb-8">
          {/* Zurück-Link - Theme-aware */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          {/* Header mit Logo und Info - Theme-aware */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-theme-secondary rounded-xl flex items-center justify-center border border-theme">
                <Logo
                  src={`/logos/${ticker.toLowerCase()}.svg`}
                  alt={`${ticker} Logo`}
                  className="w-12 h-12"
                />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-theme-primary mb-2">
                  {stock.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-lg text-theme-secondary font-medium">{ticker}</span>
                  <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                  <span className="text-sm text-theme-muted">
                    Aktienanalyse
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ MAIN CONTENT - Balanced Width */}
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pb-16">
        <AnalysisClient ticker={ticker} />
      </main>
    </div>
  )
}