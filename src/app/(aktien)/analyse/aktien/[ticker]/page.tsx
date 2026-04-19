// /analyse/aktien/[ticker] – Fey-Style Stock Page (Server Component)
// Liefert SSR/SEO; State + Interaktivität in <StockPageClient />
import type { Metadata } from 'next'
import { stocks } from '@/data/stocks'
import StockPageClient from './_components/StockPageClient'

// ISR: jede Seite wird nach 3600 Sekunden neu gebaut
export const revalidate = 3600

// Featured Tickers werden beim Build statisch erzeugt (gleicher Satz wie Production)
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

  // Root-Layout hängt automatisch " | Finclue" an (titleTemplate)
  const title = `${name} (${ticker}) – Aktienanalyse`
  const description = stock
    ? `Detaillierte Aktienanalyse von ${name} (${ticker}): Live-Kurs, Earnings, Financials, Quartalszahlen und KPIs aus SEC-Filings.`
    : `Aktienanalyse für ${ticker} mit Live-Kurs, Quartalszahlen, Financials und KPIs.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function AktienDetailPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  return <StockPageClient ticker={ticker} />
}
