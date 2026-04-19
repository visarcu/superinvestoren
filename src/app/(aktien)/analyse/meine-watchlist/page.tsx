// /analyse/watchlist – Fey-Style Watchlist (Server Component)
// Daten + Interaktivität in <WatchlistClient />.
import type { Metadata } from 'next'
import WatchlistClient from './_components/WatchlistClient'

export const metadata: Metadata = {
  title: 'Watchlist',
  description:
    'Deine Watchlist mit Live-Kursen, Earnings-Terminen und Performance-Übersicht.',
}

// Watchlist ist user-spezifisch → kein Caching/SSG
export const dynamic = 'force-dynamic'

export default function WatchlistPage() {
  return <WatchlistClient />
}
