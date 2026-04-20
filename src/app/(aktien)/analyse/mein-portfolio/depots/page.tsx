// /analyse/mein-portfolio/depots – Depot-Verwaltung (Server Component)
import type { Metadata } from 'next'
import DepotsClient from './_components/DepotsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Depots',
  description: 'Verwalte deine Depots, Broker und Cash-Positionen.',
}

export default function DepotsPage() {
  return <DepotsClient />
}
