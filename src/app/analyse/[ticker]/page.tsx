// src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dein Chart-Client (client-only)
const FinancialAnalysisClient = dynamic(
  () => import('../../../components/FinancialAnalysisClient'),
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

  const base = process.env.NEXT_PUBLIC_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_BASE_URL is not defined')

  const res = await fetch(`${base}/api/financials/${ticker}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) notFound()

  const json = (await res.json()) as {
    data: Array<Record<string, any>>
    keyMetrics?: Record<string, any> | null
  }
  const { data }   = json
  const keyMetrics = json.keyMetrics ?? {}
  const hasKeyMetrics = Object.keys(keyMetrics).length > 0

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-6">
      <Link
        href={`/aktie/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Aktie
      </Link>

      <h1 className="text-3xl font-bold">
        Kennzahlen-Analyse: {stock.name} ({ticker})
      </h1>

      {/* Key Metrics oben */}
      {hasKeyMetrics ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 bg-white rounded-xl shadow p-6">
          {/* VALUE */}
          <div>
            <h3 className="font-semibold mb-2">Value</h3>
            <ul className="text-sm space-y-1">
              <li>
                Market Cap:{' '}
                {keyMetrics.marketCap != null
                  ? `$${(keyMetrics.marketCap / 1e9).toFixed(2)} b`
                  : '–'}
              </li>
              <li>
                PE (TTM):{' '}
                {keyMetrics.pe != null
                  ? keyMetrics.pe.toFixed(1)
                  : '–'}
              </li>
              <li>
                Price / Sales (TTM):{' '}
                {keyMetrics.priceToSalesTrailing12Months != null
                  ? keyMetrics.priceToSalesTrailing12Months.toFixed(2)
                  : '–'}
              </li>
              <li>
                Free Cash Flow Yield:{' '}
                {keyMetrics.freeCashFlowYield != null
                  ? `${(keyMetrics.freeCashFlowYield * 100).toFixed(2)} %`
                  : '–'}
              </li>
            </ul>
          </div>

         
      {/* BALANCE */}
      <div>
        <h3 className="font-semibold mb-2">Balance</h3>
        <ul className="text-sm space-y-1">
          <li>
            Cash:{' '}
            {keyMetrics.cashAndShortTermInvestments != null
              ? `$${(keyMetrics.cashAndShortTermInvestments / 1e9).toFixed(2)} b`
              : '–'}
          </li>
          <li>
            Debt:{' '}
            {keyMetrics.totalDebt != null
              ? `$${(keyMetrics.totalDebt / 1e9).toFixed(2)} b`
              : '–'}
          </li>
          <li>
            Net:{' '}
            {keyMetrics.netDebt != null
              ? `$${(keyMetrics.netDebt / 1e9).toFixed(2)} b`
              : '–'}
          </li>
        </ul>
      </div>

          {/* DIVIDEND */}
          <div>
            <h3 className="font-semibold mb-2">Dividend</h3>
            <ul className="text-sm space-y-1">
              <li>
                Yield:{' '}
                {keyMetrics.dividendYield != null
                  ? `${(keyMetrics.dividendYield * 100).toFixed(2)} %`
                  : '–'}
              </li>
              <li>
                Payout Ratio:{' '}
                {keyMetrics.payoutRatio != null
                  ? `${(keyMetrics.payoutRatio * 100).toFixed(1)} %`
                  : '–'}
              </li>
              <li>
                Ex-Dividend Date: {keyMetrics.exDividendDate ?? '–'}
              </li>
              <li>
                Payout Date: {keyMetrics.declaredDividendDate ?? '–'}
              </li>
            </ul>
          </div>
        </section>
      ) : (
        <p className="text-gray-500">Key Metrics nicht verfügbar.</p>
      )}

      {/* Charts */}
      <FinancialAnalysisClient ticker={ticker} />
    </main>
  )
}