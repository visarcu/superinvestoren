// Market Insights (Server): meistgekaufte und meistgehaltene Aktien, Big Bets,
// Sektoren u. v. m. vorberechnet. Anzeige in InsightsClient.tsx.

import type { Metadata } from 'next'
import { buildInsightsData } from '@/lib/superinvestorInsightsData'
import MarketInsightsClient from './InsightsClient'

export const revalidate = 3600

export function generateMetadata(): Metadata {
  const { latestQuarter } = buildInsightsData()
  return {
    title: `Meistgekaufte Aktien der Superinvestoren (${latestQuarter})`,
    description: `Welche Aktien kaufen Superinvestoren gerade am häufigsten? Meistgekaufte und meistgehaltene Aktien, größte Wetten und Konträr-Positionen im ${latestQuarter} laut 13F-Filings.`,
    alternates: { canonical: '/superinvestor/insights' },
  }
}

export default function InsightsPage() {
  return <MarketInsightsClient data={buildInsightsData()} />
}
