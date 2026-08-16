// src/app/(terminal)/analyse/stocks/[ticker]/page.tsx - CLEAN FISCAL STYLE
import React from 'react'
import { stocks } from '@/data/stocks'
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
      ? `${stock.name} (${ticker}) - Aktienanalyse | Finclue`
      : `${ticker} - Aktienanalyse | Finclue`,
    description: stock
      ? `Detaillierte Kennzahlen-Analyse von ${stock.name} (${ticker}): Live-Kurse, Charts, Fundamentaldaten und mehr.`
      : `Aktienanalyse für ${ticker} mit Live-Kursen, Charts und Fundamentaldaten.`,
  }
}

// ✅ CLEAN Server Component - Minimalistisch wie Fiscal
// Kein Gate gegen die statische stocks-Liste: AnalysisClient lädt alle Daten
// live per Ticker und zeigt selbst "nicht gefunden", wenn die API den Ticker
// nicht kennt. So funktionieren auch internationale Ticker (z.B. VUL.AX).
export default function CleanAnalysisPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ FULL WIDTH HEADER - wie Dashboard */}



      {/* ✅ FULL WIDTH MAIN CONTENT - wie Dashboard */}
      <main className="w-full px-6 lg:px-8 py-8">
        <AnalysisClient ticker={ticker} />
      </main>
    </div>
  )
}