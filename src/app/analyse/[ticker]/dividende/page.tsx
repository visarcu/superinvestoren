// src/app/analyse/[ticker]/dividende/page.tsx
import React from 'react'
import { notFound } from 'next/navigation'
import { stocks } from '../../../../data/stocks'
import StockLineChart from '@/components/StockLineChart'
import { fmtP, fmtDate } from '@/utils/formatters'
import Link from 'next/link'

interface AnnualDividend {
  date:  string
  close: number
}

export default async function DividendDetailPage({
  params,
}: {
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  if (!stocks.find(s => s.ticker === ticker)) notFound()

  // 1) Basis-Kennzahlen (Yield, Payout) + Jahresdaten aus unserer internen API holen
  const resFin = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/financials/${ticker}?period=annual&limit=20`,
    { next: { revalidate: 3600 } }
  )
  if (!resFin.ok) notFound()
  const { keyMetrics, data: finData } = await resFin.json() as {
    keyMetrics: { dividendYield?: number; payoutRatio?: number }
    data: Array<{ year: number; dividend?: number }>
  }

  const dividendYield = keyMetrics.dividendYield ?? null
  const payoutRatio   = keyMetrics.payoutRatio   ?? null

  // 2) Aus den jährlichen Daten eine für den Chart geeignete Struktur bauen
  const annual: AnnualDividend[] = finData
    .filter(r => typeof r.dividend === 'number')
    .map(r => ({
      date:  r.year.toString(),
      close: r.dividend!,
    }))

  // 3) 5-Jahres-CAGR berechnen (wenn möglich)
  let cagr5: number | null = null
  if (annual.length >= 6) {
    const slice5 = annual.slice(-6) // z.B. [2019,2020,2021,2022,2023,2024]
    const start = slice5[0].close
    const end   = slice5[slice5.length - 1].close
    const n     = slice5.length - 1
    if (start > 0 && end > 0) {
      cagr5 = (Math.pow(end / start, 1 / n) - 1) * 100
    }
  }

  // 4) Wachstumsjahre zählen
  let growthYears = 0
  for (let i = 1; i < annual.length; i++) {
    if (annual[i].close > annual[i - 1].close) growthYears++
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <Link
        href={`/analyse/${ticker.toLowerCase()}`}
        className="text-accent hover:underline"
      >
        ← Zurück zur Analyse
      </Link>

      <h1 className="text-3xl font-bold mb-4 text-gray-100">
        Dividenden-Detail: {ticker}
      </h1>

      {/* Kennzahlen */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-card-dark p-6 rounded-xl shadow">
        <div>
          <h2 className="font-semibold mb-1 text-gray-300">Rendite (TTM)</h2>
          <p className="text-lg text-white">{fmtP(dividendYield)}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-1 text-gray-300">Payout Ratio</h2>
          <p className="text-lg text-white">{fmtP(payoutRatio)}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-1 text-gray-300">5-Jahres-CAGR</h2>
          <p className="text-lg text-white">
            {cagr5 != null ? `${cagr5.toFixed(2)} %` : '–'}
          </p>
        </div>
        <div>
          <h2 className="font-semibold mb-1 text-gray-300">Wachstumsjahre</h2>
          <p className="text-lg text-white">{growthYears}</p>
        </div>
      </section>

      {/* Historische Jahresdividende pro Aktie */}
      <section className="bg-card-dark p-6 rounded-xl shadow">
        <h2 className="text-2xl font-semibold mb-4 text-gray-100">
          Historische Jahresdividenden pro Aktie
        </h2>
        {annual.length > 0 ? (
          <StockLineChart
            data={annual.map(a => ({ date: a.date, close: a.close }))}
          />
        ) : (
          <p className="text-gray-400">Keine Dividenden-Daten verfügbar.</p>
        )}
      </section>
    </main>
  )
}