import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const FinancialAnalysis = dynamic(
  () => import('../../../components/FinancialAnalysisClient'),
  { ssr: false }
)

export async function generateStaticParams() {
  return stocks.map(s => ({ ticker: s.ticker.toLowerCase() }))
}

export default function AnalysisPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find(s => s.ticker === ticker)
  if (!stock) notFound()

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <Link href={`/aktie/${ticker.toLowerCase()}`} className="text-blue-600 hover:underline">
        ← Zurück zur Aktie
      </Link>
      <h1 className="text-3xl font-bold">Kennzahlen-Analyse: {stock.name} ({ticker})</h1>
      <FinancialAnalysis ticker={ticker} />
    </main>
  )
}