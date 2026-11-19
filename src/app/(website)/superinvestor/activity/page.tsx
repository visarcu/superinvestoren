// Investor-Aktivität (Server): Käufe/Verkäufe je Quartal vorberechnet, damit
// Inhalt und Links im HTML stehen und kein Holdings-Paket im Browser landet.

import type { Metadata } from 'next'
import { buildActivityData } from '@/lib/superinvestorActivity'
import ActivityClient from './ActivityClient'

export const revalidate = 3600

export function generateMetadata(): Metadata {
  const quarter = buildActivityData().quarters[0]
  return {
    title: `Käufe & Verkäufe der Superinvestoren${quarter ? ` im ${quarter}` : ''}`,
    description: `Welche Aktien haben Superinvestoren${quarter ? ` im ${quarter}` : ''} gekauft und verkauft? Die größten Transaktionen je Investor laut aktuellen 13F-Filings.`,
    alternates: { canonical: '/superinvestor/activity' },
  }
}

export default function ActivityPage() {
  return <ActivityClient data={buildActivityData()} />
}
