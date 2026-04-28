// /analyse/aktien/[ticker] – Stock-Layout
// Lädt alle Daten EINMAL (via StockPageClient), rendert Stock-Hero + Tabs +
// Sub-Page-Content. Tabs sind echte Sub-Routes (eigene URLs pro Tab).
import type { Metadata } from 'next'
import { stocks } from '@/data/stocks'
import StockPageClient from './_components/StockPageClient'

// ISR: jede Seite wird nach 3600 Sekunden neu gebaut
export const revalidate = 3600

const FEATURED_TICKERS = ['NVDA', 'AAPL', 'AMZN', 'GOOGL', 'MSFT', 'TSLA']

export async function generateStaticParams() {
  return FEATURED_TICKERS.map(t => ({ ticker: t.toLowerCase() }))
}

export async function generateMetadata({
  params,
}: {
  params: { ticker: string }
}): Promise<Metadata> {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find(s => s.ticker === ticker)
  const name = stock?.name ?? ticker

  const title = `${name} (${ticker}) – Aktienanalyse`
  const description = stock
    ? `Detaillierte Aktienanalyse von ${name} (${ticker}): Live-Kurs, Earnings, Financials, Quartalszahlen und KPIs aus SEC-Filings.`
    : `Aktienanalyse für ${ticker} mit Live-Kurs, Quartalszahlen, Financials und KPIs.`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function StockLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  return <StockPageClient ticker={ticker}>{children}</StockPageClient>
}
