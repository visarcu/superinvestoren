// Sektor-Analyse (Server): Sektoren, Netto-Zuflüsse je Zeitraum und
// Konzentration vorberechnet. Anzeige in SectorsClient.tsx.

import type { Metadata } from 'next'
import { buildSectorsData } from '@/lib/superinvestorInsightsData'
import SectorsClient from './SectorsClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Sektor-Analyse: In welche Branchen Superinvestoren investieren',
  description:
    'Wie verteilen Superinvestoren ihr Kapital auf Sektoren? Größte Sektoren, Netto-Zuflüsse und -Abflüsse der letzten Quartale und Portfolio-Konzentration laut 13F.',
  alternates: { canonical: '/superinvestor/sectors' },
}

export default function SectorsPage() {
  return <SectorsClient data={buildSectorsData()} />
}
