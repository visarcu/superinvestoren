// Momentum & Sentiment (Server): alle Zeiträume vorberechnet, Anzeige in
// MomentumClient.tsx. So landet kein Holdings-Paket mehr im Browser.

import type { Metadata } from 'next'
import { buildMomentumData } from '@/lib/superinvestorInsightsData'
import MomentumClient from './MomentumClient'

export const revalidate = 3600

export function generateMetadata(): Metadata {
  const { latestQuarter } = buildMomentumData()
  return {
    title: `Momentum der Superinvestoren: Trendwenden, Ausstiege & Neuentdeckungen (${latestQuarter})`,
    description: `Welche Aktien drehen bei Superinvestoren gerade? Trendwenden, komplette Ausstiege, neu entdeckte Aktien und das Kauf-/Verkaufsverhältnis im ${latestQuarter} laut 13F.`,
    alternates: { canonical: '/superinvestor/momentum' },
  }
}

export default function MomentumPage() {
  return <MomentumClient data={buildMomentumData()} />
}
