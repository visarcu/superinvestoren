// /analyse/mein-portfolio/dividenden – Dividenden-Detail (Server Component)
import type { Metadata } from 'next'
import DividendsDetailClient from './_components/DividendsDetailClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dividenden',
  description: 'Übersicht deiner Dividenden-Zahlungen mit Verlauf nach Jahr und Aktie.',
}

export default function PortfolioDividendsPage() {
  return <DividendsDetailClient />
}
