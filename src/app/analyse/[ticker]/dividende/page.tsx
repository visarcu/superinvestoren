// src/app/analyse/[ticker]/dividende/page.tsx
import React from 'react'
import { notFound } from 'next/navigation'
import { stocks } from '../../../../data/stocks'
import StockLineChart from '@/components/StockLineChart'
import { fmtP, fmtDate } from '@/utils/formatters'
import Link from 'next/link'

export default async function DividendDetailPage({
  params,
}: {
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  if (!stocks.find((s) => s.ticker === ticker)) notFound()

  // 1) Dividend Daten holen
  let dividendYield: number | null = null
  let payoutRatio: number | null = null
  let exDate: string | null = null
  let payDate: string | null = null
  let history: { date: string; dividend: number }[] = []

  // Beispiel: Key‐Metrics‐API liefert Yield/Payout
  const resKM = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/financials/${ticker}`,
    { next: { revalidate: 3600 } }
  )
  if (resKM.ok) {
    const { keyMetrics } = await resKM.json()
    dividendYield = keyMetrics.dividendYield ?? null
    payoutRatio  = keyMetrics.payoutRatio  ?? null
  }

  // Ex- und Payment Date
  const resDiv = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 * 60 * 6 } }
  )
  if (resDiv.ok) {
    const { historical } = await resDiv.json()
    if (historical.length) {
      const L = historical.sort((a,b)=>b.date.localeCompare(a.date))[0]
      exDate   = L.date
      payDate  = L.paymentDate
      history  = historical
        .slice()
        .reverse()
        .map((h: any)=>({ date: h.date, dividend: h.dividend }))
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <Link
        href={`/analyse/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Analyse
      </Link>

      <h1 className="text-3xl font-bold mb-4">
        Dividenden-Detail: {ticker}
      </h1>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow">
        <div>
          <h2 className="font-semibold mb-2">Basics</h2>
          <ul className="text-sm space-y-1">
            <li>Rendite: {fmtP(dividendYield)}</li>
            <li>Payout Ratio: {fmtP(payoutRatio)}</li>
            <li>Ex-Date: {fmtDate(exDate)}</li>
            <li>Payment Date: {fmtDate(payDate)}</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Historie (letzte Jahre)</h2>
          {history.length > 0 ? (
            <StockLineChart data={history.map(h => ({ date: h.date, close: h.dividend }))} />
          ) : (
            <p className="text-gray-500 text-sm">Keine Daten</p>
          )}
        </div>
      </section>

      {/* Du kannst hier noch Kennzahlen-Charts, Growth‐Raten usw. einbauen */}
    </main>
  )
}