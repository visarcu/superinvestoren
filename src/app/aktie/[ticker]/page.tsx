// src/app/aktie/[ticker]/page.tsx

import { stocks } from '../../../data/stocks'
import { investors } from '../../../data/investors'
import holdingsHistory from '../../../data/holdings'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import React from 'react'
import Script from 'next/script'
import dynamic from 'next/dynamic'

// Chart‐Widget nur im Client laden
const StockChart = dynamic(
  () => import('../../../components/StockChart'),
  { ssr: false }
)

interface PageProps {
  params: { ticker: string }
}

interface OwningInvestor {
  slug: string
  name: string
  imageUrl?: string
  weight: number
}

export async function generateStaticParams() {
  return stocks.map((s) => ({ ticker: s.ticker.toLowerCase() }))
}

async function fetchLivePrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error('Live price fetch failed')
  const json = await res.json()
  return json.c
}

async function fetchFundamentals(symbol: string) {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${process.env.FINNHUB_API_KEY}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error('Fundamentals fetch failed')
  const json = await res.json()
  return json.metric
}

export default async function StockPage({ params }: PageProps) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker) ?? notFound()

  // Live‐Kurs
  let livePrice: number | null = null
  try {
    livePrice = await fetchLivePrice(ticker)
  } catch {
    console.warn(`Live price for ${ticker} could not be fetched.`)
  }

  // Fundamentaldaten
  let metric: Record<string, number> | null = null
  try {
    metric = await fetchFundamentals(ticker)
  } catch {
    console.warn(`Fundamentals for ${ticker} could not be fetched.`)
  }

  // Investoren, die diese Aktie halten
  const owningInvestors: OwningInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snapshots]) => {
      if (!Array.isArray(snapshots) || snapshots.length === 0) return null
      const latest = snapshots[snapshots.length - 1]
      const positions = latest?.data?.positions
      if (!positions) return null

      const matches = positions.filter((p) => p.cusip === stock.cusip)
      if (matches.length === 0) return null

      const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
      if (totalValue === 0) return null
      const matchedValue = matches.reduce((sum, p) => sum + p.value, 0)

      const inv = investors.find((i) => i.slug === slug)
      if (!inv) return null

      return {
        slug,
        name: inv.name,
        imageUrl: inv.imageUrl,
        weight: matchedValue / totalValue,
      }
    })
    .filter(Boolean) as OwningInvestor[]

  // Format‐Hilfen
  const fmtNum = (n: number) =>
    n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
  const fmtPercent = (n: number) =>
    `${(n * 100).toFixed(1).replace('.', ',')} %`

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <Link href="/" className="text-blue-600 hover:underline">
        ← Zurück
      </Link>
      <h1 className="text-4xl font-bold">{stock.name}</h1>
      <h2 className="text-lg text-gray-500 uppercase">{stock.ticker}</h2>

      {/* Link zur Analyse-Seite */}
      <Link
        href={`/analyse/${ticker.toLowerCase()}`}
        className="inline-block text-primary hover:underline mt-2"
      >
        Kennzahlen-Analyse anzeigen →
      </Link>

      {/* TradingView Chart */}
      <div id="tv-chart" className="bg-white rounded-lg shadow overflow-hidden" />
      <Script
        src="https://s3.tradingview.com/tv.js"
        strategy="afterInteractive"
      />
      <Script id="tv-init" strategy="afterInteractive">
        {`
          new TradingView.widget({
            width: '100%',
            height: 400,
            symbol: '${stock.ticker}',
            interval: 'D',
            timezone: 'Etc/UTC',
            theme: 'Light',
            style: '1',
            locale: 'de',
            toolbar_bg: '#f1f3f6',
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: 'tv-chart'
          });
        `}
      </Script>

      {/* Live‐Kurs */}
      <div className="flex justify-between bg-white rounded-lg shadow p-4">
        <span>Aktueller Kurs</span>
        <span className="font-semibold">
          {livePrice !== null ? `${fmtNum(livePrice)} €` : '–'}
        </span>
      </div>

      {/* Fundamentaldaten */}
      {metric ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* … hier kannst du deine Metrik-Kacheln einfügen … */}
        </div>
      ) : (
        <p className="text-gray-500">Fundamentaldaten nicht verfügbar.</p>
      )}

      {/* Investoren */}
      {owningInvestors.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mt-8">
            Investoren, die {stock.name} halten:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {owningInvestors.map((inv) => (
              <div
                key={inv.slug}
                className="flex items-center bg-white rounded-lg shadow p-4 space-x-4"
              >
                {inv.imageUrl && (
                  <img
                    src={inv.imageUrl}
                    alt={inv.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold">{inv.name}</div>
                  <div className="text-gray-600">
                    Anteil: {fmtPercent(inv.weight)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 mt-8">
          Derzeit hält kein Superinvestor diese Aktie.
        </p>
      )}
    </main>
  )
}