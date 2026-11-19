// Nur Metadaten für /superinvestor/fear-greed-index (noch in Arbeit) – die Seite selbst ist eine Client-Komponente.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Superinvestor Fear & Greed Index',
  description: 'Der Fear & Greed Index der Superinvestoren – bald auf Finclue.',
  // Platzhalterseite (Coming Soon): nicht indexieren
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
