// src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Wrapper mit Zeitraum-Buttons und Chart
const StockLineChartWrapper = dynamic(
  () => import('../../../components/StockLineChartWrapper'),
  { ssr: false }
)
// Client-Component für Financial Analysis Charts
const FinancialAnalysisClient = dynamic(
  () => import('../../../components/FinancialAnalysisClient'),
  { ssr: false }
)

// Format-Hilfen
const fmtB = (n: number) =>
  `$${(n / 1e9).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} b`
const fmtP = (n?: number) =>
  typeof n === 'number' ? `${(n * 100).toFixed(2).replace('.', ',')} %` : '–'
const fmtDate = (d?: string | null) => d ?? '–'
const fmtPrice = (n?: number) =>
  typeof n === 'number'
    ? n.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '–'

export async function generateStaticParams() {
  return stocks.map((s) => ({ ticker: s.ticker.toLowerCase() }))
}

export default async function AnalysisPage({
  params,
}: {
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker) ?? notFound()

  // … (deine bisherigen Daten‐Fetches bleiben unverändert) …

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      <Link
        href={`/aktie/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Aktie
      </Link>

      <h1 className="text-3xl font-bold">
        Kennzahlen-Analyse: {stock.name} ({ticker})
      </h1>

      {/* … Live-Quote und Kennzahlen-Boxes … */}

      {/* ─── Historischer Kursverlauf mit Selector ─── */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Historischer Kursverlauf
        </h2>
        <StockLineChartWrapper ticker={ticker} />
      </section>

      {/* ─── Weitere Kennzahlen-Charts ─── */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Kennzahlen-Charts auswählen
        </h2>
        <FinancialAnalysisClient ticker={ticker} />
      </section>

      {/* ─── Vollbild-Modal für FinancialAnalysisClient ─── */}
      {/* Beispiel: im FinancialAnalysisClient selbst ersetzen wir `height="100%"` */}
      {/* durch `height={600}` — siehe unten in der Client-Komponente */}

    </main>
  )
}