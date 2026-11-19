// Superinvestoren-Übersicht (Server): Metadaten + vorberechnete Daten, damit
// Inhalt und Links direkt im HTML stehen. Interaktiver Teil: OverviewClient.tsx.

import type { Metadata } from 'next'
import highlights from '@/data/homepageHighlights.json'
import { investors } from '@/data/investors'
import { buildOverviewData } from '@/lib/superinvestorOverview'
import SuperinvestorOverviewClient from './OverviewClient'

export const revalidate = 3600

const quarter = highlights.reportQuarter ?? 'dem letzten Quartal'

export const metadata: Metadata = {
  title: `Superinvestoren: Portfolios von Buffett, Ackman & Co. (${quarter})`,
  description: `Was kaufen und verkaufen Warren Buffett, Bill Ackman, Michael Burry & Co.? Die 13F-Portfolios von ${investors.length} Superinvestoren mit Käufen, Verkäufen und Trends im ${quarter}.`,
  alternates: { canonical: '/superinvestor' },
}

export default function SuperinvestorOverviewPage() {
  return <SuperinvestorOverviewClient data={buildOverviewData()} latestQuarter={quarter} />
}
