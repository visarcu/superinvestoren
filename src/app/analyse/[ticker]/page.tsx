// Datei: src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Card from '@/components/Card'
import { irLinks } from '../../../data/irLinks'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

// ➊ ISR: jede Seite wird nach 3600 Sekunden neu gebaut
export const revalidate = 3600

// ➋ Nur diese wenigen Ticker werden beim Build bereits statisch erzeugt:
const FEATURED_TICKERS = ['NVDA', 'AAPL', 'AMZN', 'GOOGL']

export async function generateStaticParams() {
  return FEATURED_TICKERS.map((t) => ({
    ticker: t.toLowerCase(),
  }))
}

// ➌ Dieser Page-Component ist jetzt eine reine Server Component.
//     Sie weiß nur, welchen Ticker sie bekommen hat, und lädt ggf. Daten vor, 
//     rendert aber **nicht** die useEffect/Client-Hooks selbst.
export default function AnalysisPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  // Falls die Aktie nicht existiert, gib 404 aus
  if (!stock) {
    return <p className="text-white">Aktie nicht gefunden.</p>
  }

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      {/* ← Zurücklink */}
      <Link
        href={`/aktie/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Aktie
      </Link>

      {/* Header mit Logo */}
      <div className="flex items-center justify-between space-x-6">
        <div className="flex items-center space-x-4">
          <Logo
            src={`/logos/${ticker.toLowerCase()}.svg`}
            alt={`${ticker} Logo`}
            className="w-12 h-12"
          />
          <div>
            <h1 className="text-3xl font-bold">
              Kennzahlen-Analyse: {stock.name} ({ticker})
            </h1>
            <p className="text-gray-400 text-sm">
              Detaillierte Finanzkennzahlen
            </p>
          </div>
        </div>
      </div>

      {/* ➍ Hier binden wir die Client-Komponente ein und geben den Ticker weiter */}
      <AnalysisClient ticker={ticker} />

      {/* Optional: Du könntest hier schon Footer, statische Abschnitte oder 
          andere Server-only-Blöcke rendern */}
    </main>
  )
}

// ➎ Importiere die Client Component unten (damit Next.js sie richtig erkennt).
//     Der Importpfad muss ggf. an deine Projektstruktur angepasst werden.
import AnalysisClient from '@/components/AnalysisClient'