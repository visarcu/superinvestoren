// Nur Metadaten für /superinvestor/trends – die Seite selbst ist eine Client-Komponente.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Superinvestor-Trends: Was die Profis gerade bewegt',
  description: 'Aktuelle Trends bei Superinvestoren: Welche Aktien und Sektoren gerade gefragt sind und wohin das Kapital der bekanntesten Investoren fließt.',
  alternates: { canonical: '/superinvestor/trends' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
