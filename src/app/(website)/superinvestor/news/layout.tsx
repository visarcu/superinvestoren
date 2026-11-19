// Nur Metadaten für /superinvestor/news – die Seite selbst ist eine Client-Komponente.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Superinvestor-News: Neuigkeiten zu Buffett, Ackman & Co.',
  description: 'Nachrichten rund um Superinvestoren wie Warren Buffett, Bill Ackman und Michael Burry – Portfolio-Änderungen, Aussagen und Hintergründe.',
  alternates: { canonical: '/superinvestor/news' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
