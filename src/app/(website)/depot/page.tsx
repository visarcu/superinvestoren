// Öffentliche Depot-Landingpage finclue.de/depot. Der Inhalt liegt in
// components/depot/DepotLanding, damit depot.finclue.de ihn als eigene
// Startseite (ohne Finclue-Navigation) nutzen kann.

import type { Metadata } from 'next'
import DepotLanding from '@/components/depot/DepotLanding'
import { IMPORT_BROKERS } from '@/lib/importBrokerConfig'

export const revalidate = 86400

const brokers = IMPORT_BROKERS.filter(b => b.id !== 'other').map(b => b.name)

const TITLE = 'Depot-Tracker mit Risikoanalyse: Monte Carlo, Stresstest & Faktoren'
const DESCRIPTION = `Importiere dein Depot von ${brokers.slice(0, 3).join(', ')} & Co. und analysiere es wie ein Profi: echte Rendite, ETF-Durchblick, Sharpe Ratio, Max Drawdown, Monte-Carlo-Simulation und Stresstests.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/depot' },
  openGraph: {
    type: 'website',
    siteName: 'Finclue',
    locale: 'de_DE',
    url: '/depot',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/features/hero-portfolio.png', width: 1920, height: 1200, alt: 'Depot-Übersicht in Finclue' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function DepotLandingPage() {
  return <DepotLanding />
}
