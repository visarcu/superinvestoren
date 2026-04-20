// /analyse/mein-portfolio – Fey-Style Portfolio Dashboard (Server Component)
// Daten + Interaktivität in <PortfolioClient />.
import type { Metadata } from 'next'
import PortfolioClient from './_components/PortfolioClient'

export const metadata: Metadata = {
  title: 'Mein Portfolio',
  description:
    'Dein Portfolio im Überblick: Live-Werte, Tagesperformance, Holdings, Transaktionen und Dividenden.',
}

// User-spezifisch → kein Caching/SSG
export const dynamic = 'force-dynamic'

export default function PortfolioPage() {
  return <PortfolioClient />
}
