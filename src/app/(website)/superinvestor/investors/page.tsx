// Investorenliste (Server): Metadaten + vorberechnete Karten, damit alle
// Investoren-Links direkt im HTML stehen. Filter/Suche: InvestorsClient.tsx.

import type { Metadata } from 'next'
import { buildInvestorList } from '@/lib/investorListData'
import InvestorsClient from './InvestorsClient'

export const revalidate = 3600

export function generateMetadata(): Metadata {
  const count = buildInvestorList().length
  return {
    title: 'Alle Superinvestoren & Fonds im Überblick',
    description: `Alle ${count} Superinvestoren und Fonds auf Finclue – von Warren Buffett bis Bill Ackman – mit Portfolio-Wert, Entwicklung und größten Positionen laut 13F.`,
    alternates: { canonical: '/superinvestor/investors' },
  }
}

export default function InvestorsPage() {
  return <InvestorsClient investorData={buildInvestorList()} />
}
