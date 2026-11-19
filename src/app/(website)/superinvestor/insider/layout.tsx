// Nur Metadaten für /superinvestor/insider – die Seite selbst ist eine Client-Komponente.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insider-Trades: Käufe & Verkäufe von Managern und Vorständen',
  description: 'Live-Übersicht der Insider-Transaktionen bei US-Aktien: Welche CEOs, Vorstände und Großaktionäre kaufen oder verkaufen gerade Aktien ihres eigenen Unternehmens.',
  alternates: { canonical: '/superinvestor/insider' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
