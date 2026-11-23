// Startseite von depot.finclue.de für Abgemeldete (die Middleware schreibt "/"
// dorthin um). Gleicher Inhalt wie finclue.de/depot, die Buttons führen aber
// direkt zur Registrierung mit Rücksprung ins Depot. Nicht indexieren: das
// Original steht unter finclue.de/depot.

import type { Metadata } from 'next'
import DepotLanding from '@/components/depot/DepotLanding'
import { mainSiteHref } from '@/lib/siteHosts'
import { WORKSPACE_PATH } from '@/lib/depotRoutes'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: 'Finclue Depot: Depot-Tracker mit Risikoanalyse' },
  description: 'Dein Depot wie ein Profi analysieren: echte Rendite, Durchblick, Stresstests, Monte Carlo und Faktoren.',
  alternates: { canonical: 'https://finclue.de/depot' },
  robots: { index: false, follow: true },
}

export default function DepotStartPage() {
  return (
    <DepotLanding
      ctaHref={mainSiteHref(`/auth/signup?redirect=${encodeURIComponent(WORKSPACE_PATH)}`)}
      siteHref={mainSiteHref}
    />
  )
}
