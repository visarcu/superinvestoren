// src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Tooltips
const metricInfo: Record<string, string> = {
  revenue:
    'Umsatz: Gesamte Erlöse eines Unternehmens pro Jahr (in Millionen USD).',
  ebitda:
    'EBITDA: Operativer Gewinn vor Zinsen, Steuern und Abschreibungen (in Mio. USD).',
  eps:
    'EPS (Earnings Per Share): Gewinn je Aktie – Nettogewinn geteilt durch ausstehende Aktien.',
}
function InfoIcon({ infoKey }: { infoKey: keyof typeof metricInfo }) {
  return (
    <span
      className="ml-2 cursor-help text-gray-400"
      title={metricInfo[infoKey]}
      aria-label={metricInfo[infoKey]}
    >
      ℹ️
    </span>
  )
}

// Chart nur im Client
const AnalysisChart = dynamic(
  () => import('../../../components/AnalysisChart'),
  { ssr: false }
)

export async function generateStaticParams() {
  return stocks.map((s) => ({ ticker: s.ticker.toLowerCase() }))
}

export default async function AnalysisPage({
  params,
}: {
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)
  if (!stock) notFound()

  // Baue die absolute API-URL
  const base = process.env.NEXT_PUBLIC_BASE_URL!
  const apiUrl = `${base}/api/financials/${ticker}`
  const res = await fetch(apiUrl, { next: { revalidate: 3600 } })
  if (!res.ok) notFound()

  const { data: raw } = (await res.json()) as {
    data: Array<Record<'year' | 'revenue' | 'ebitda' | 'eps', number>>
  }

  // nach Jahr aufsteigend sortieren
  const data = raw.sort((a, b) => a.year - b.year)

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <Link href={`/aktie/${ticker.toLowerCase()}`} className="text-blue-600 hover:underline">
        ← Zurück zur Aktie
      </Link>

      <h1 className="text-3xl font-bold">
        Kennzahlen‐Analyse: {stock.name} ({ticker})
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Umsatz */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Umsatz (Mio. USD)</h2>
            <InfoIcon infoKey="revenue" />
          </div>
          <AnalysisChart
            data={data}
            dataKey="revenue"
            name="Umsatz"
            stroke="#3b82f6"
            fill="rgba(59,130,246,0.3)"
          />
        </div>

        {/* EBITDA */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">EBITDA (Mio. USD)</h2>
            <InfoIcon infoKey="ebitda" />
          </div>
          <AnalysisChart
            data={data}
            dataKey="ebitda"
            name="EBITDA"
            stroke="#10b981"
            fill="rgba(16,185,129,0.3)"
          />
        </div>

        {/* EPS */}
        <div className="bg-white rounded-xl shadow p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">EPS (in $)</h2>
            <InfoIcon infoKey="eps" />
          </div>
          <AnalysisChart
            data={data}
            dataKey="eps"
            name="EPS"
            stroke="#f59e0b"
            fill="rgba(245,158,11,0.3)"
          />
        </div>
      </div>
    </main>
  )
}