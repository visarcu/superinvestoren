import type { Metadata } from 'next'
import FeaturesClient from './FeaturesClient'

export const metadata: Metadata = {
  title: 'Features — Finclue',
  description:
    'Portfolio-Tracking, Kongress-Trades, Superinvestoren-Filings, Kennzahlen und mehr. Entdecke alle Features von Finclue.',
  openGraph: {
    title: 'Features — Finclue',
    description:
      'Portfolio-Tracking, Kongress-Trades, Superinvestoren-Filings, Kennzahlen und mehr. Entdecke alle Features von Finclue.',
    images: ['/features/hero-portfolio.png'],
  },
}

export default function FeaturesPage() {
  return <FeaturesClient />
}
