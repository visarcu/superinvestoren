// /analyse/mein-portfolio/aktien/[ticker] – Stock-Detail aus Sicht des Portfolios
// (Server Component, Daten + Interaktivität in <PortfolioStockDetailClient />)
import type { Metadata } from 'next'
import PortfolioStockDetailClient from './_components/PortfolioStockDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { ticker: string }
}): Promise<Metadata> {
  const ticker = params.ticker.toUpperCase()
  return {
    title: `${ticker} im Portfolio`,
    description: `Performance, Käufe, Verkäufe und Dividenden für ${ticker} in deinem Portfolio.`,
  }
}

export default function PortfolioStockDetailPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  return <PortfolioStockDetailClient ticker={ticker} />
}
