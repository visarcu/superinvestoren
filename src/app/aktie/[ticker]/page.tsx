// src/app/aktie/[ticker]/page.tsx
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

import { stocks } from '../../../data/stocks'
import { investors } from '../../../data/investors'
import holdingsHistory from '../../../data/holdings'

// unser eigener Chart – client-only
const StockLineChart = dynamic(
  () => import('../../../components/StockLineChart'),
  { ssr: false }
)

interface OwningInvestor {
  slug: string
  name: string
  imageUrl?: string
  weight: number
}
interface BuyingInvestor {
  slug: string
  name: string
  imageUrl?: string
  deltaShares: number
  pctDelta: number
}
interface SellingInvestor {
  slug: string
  name: string
  imageUrl?: string
  deltaShares: number
  pctDelta: number
}

export async function generateStaticParams() {
  return stocks.map(s => ({ ticker: s.ticker.toLowerCase() }))
}

// Live-Preis von FMP
async function fetchLivePrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote-short/${symbol}?apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error('Live price fetch failed')
  const [data] = await res.json()
  return data.price
}

// Historische Kursdaten von FMP für unseren eigenen Chart
async function fetchHistorical(symbol: string): Promise<{ date: string; close: number }[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 * 60 * 6 } }
  )
  if (!res.ok) throw new Error('Historical fetch failed')
  const { historical = [] } = await res.json()
  return historical.reverse()
}

export default async function StockPage({
  params: { ticker: tickerParam },
}: {
  params: { ticker: string }
}) {
  const ticker = tickerParam.toUpperCase()
  const stock = stocks.find(s => s.ticker === ticker) ?? notFound()

  // 1) Live-Preis
  let livePrice: number | null = null
  try {
    livePrice = await fetchLivePrice(ticker)
  } catch {
    console.warn(`Live price for ${ticker} could not be fetched.`)
  }

  // 2) Historische Daten
  let history: { date: string; close: number }[] = []
  try {
    history = await fetchHistorical(ticker)
  } catch {
    console.warn(`Historical data for ${ticker} could not be fetched.`)
  }

  // Format-Hilfen
  const fmtPrice = (n: number) =>
    n.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    })
  const fmtPercent = (n: number) =>
    `${(n * 100).toFixed(1).replace('.', ',')} %`

  // 3) Aktuelle Halter
  const owningInvestors: OwningInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return null
      const matches = latest.positions.filter(p => p.cusip === stock.cusip)
      if (matches.length === 0) return null
      const total = latest.positions.reduce((sum, p) => sum + p.value, 0)
      const matched = matches.reduce((sum, p) => sum + p.value, 0)
      if (total === 0) return null
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null
      return { slug, name: inv.name, imageUrl: inv.imageUrl, weight: matched / total }
    })
    .filter(Boolean) as OwningInvestor[]

  // 4) Käufer im letzten Quartal
  const buyingInvestors: BuyingInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      if (snaps.length < 2) return null
      const prev = snaps[snaps.length - 2].data
      const cur  = snaps[snaps.length - 1].data
      if (!prev?.positions || !cur?.positions) return null
      const prevShares = prev.positions
        .filter(p => p.cusip === stock.cusip)
        .reduce((s, p) => s + p.shares, 0)
      const curShares  = cur.positions
        .filter(p => p.cusip === stock.cusip)
        .reduce((s, p) => s + p.shares, 0)
      const delta = curShares - prevShares
      if (delta <= 0) return null
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null
      return { slug, name: inv.name, imageUrl: inv.imageUrl, deltaShares: delta, pctDelta: prevShares > 0 ? delta/prevShares : 1 }
    })
    .filter(Boolean) as BuyingInvestor[]

  // 5) Verkäufer im letzten Quartal
  const sellingInvestors: SellingInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      if (snaps.length < 2) return null
      const prev = snaps[snaps.length - 2].data
      const cur  = snaps[snaps.length - 1].data
      if (!prev?.positions || !cur?.positions) return null
      const prevShares = prev.positions
        .filter(p => p.cusip === stock.cusip)
        .reduce((s, p) => s + p.shares, 0)
      const curShares  = cur.positions
        .filter(p => p.cusip === stock.cusip)
        .reduce((s, p) => s + p.shares, 0)
      const delta = curShares - prevShares
      if (delta >= 0) return null
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null
      return { slug, name: inv.name, imageUrl: inv.imageUrl, deltaShares: Math.abs(delta), pctDelta: prevShares > 0 ? Math.abs(delta)/prevShares : 1 }
    })
    .filter(Boolean) as SellingInvestor[]

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <Link href="/" className="text-blue-600 hover:underline">
        ← Zurück
      </Link>

      <h1 className="text-4xl font-bold">{stock.name}</h1>
      <h2 className="text-lg text-gray-500 uppercase">{stock.ticker}</h2>

      {/* Aktueller Kurs & Analyse-Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <div className="text-2xl font-semibold">
          {livePrice !== null ? fmtPrice(livePrice) : '–'}
        </div>
        <Link
          href={`/analyse/${ticker.toLowerCase()}`}
          className="inline-block bg-blue-600 text-dark px-4 py-2 rounded hover:bg-blue-700"
        >
          Zur Aktien-Analyse →
        </Link>
      </div>

      {/* Historischer Chart */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Historischer Kursverlauf</h3>
        {history.length > 0 ? (
          <StockLineChart data={history} />
        ) : (
          <p className="text-gray-500">Keine historischen Daten verfügbar.</p>
        )}
      </section>

      {/* Investoren, die halten */}
      {owningInvestors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mt-8">Investoren, die halten:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {owningInvestors.map(inv => (
              <Link
                key={inv.slug}
                href={`/investor/${inv.slug}`}
                className="flex items-center bg-gray-900 rounded-lg shadow p-4 space-x-4 hover:bg-gray-50"
              >
                {inv.imageUrl && (
                  <img
                    src={inv.imageUrl}
                    alt={inv.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold text-on-surface">{inv.name}</div>
                  <div className="text-gray-600">
                    Anteil: {fmtPercent(inv.weight)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Investoren, die gekauft haben */}
      {buyingInvestors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mt-8">Gekauft im letzten Quartal:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {buyingInvestors.map(inv => (
              <Link
                key={inv.slug}
                href={`/investor/${inv.slug}`}
                className="flex items-center bg-green-50 rounded-lg shadow p-4 space-x-4 hover:bg-green-100"
              >
                {inv.imageUrl && (
                  <img
                    src={inv.imageUrl}
                    alt={inv.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold text-on-surface">
                    {inv.name}
                  </div>
                  <div className="text-gray-700">
                    +{inv.deltaShares.toLocaleString('de-DE')} Anteile ({fmtPercent(inv.pctDelta)})
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Investoren, die verkauft haben */}
      {sellingInvestors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mt-8">Verkauft im letzten Quartal:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {sellingInvestors.map(inv => (
              <Link
                key={inv.slug}
                href={`/investor/{inv.slug}`}
                className="flex items-center bg-red-50 rounded-lg shadow p-4 space-x-4 hover:bg-red-100"
              >
                {inv.imageUrl && (
                  <img
                    src={inv.imageUrl}
                    alt={inv.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold text-on-surface">
                    {inv.name}
                  </div>
                  <div className="text-gray-700">
                    −{inv.deltaShares.toLocaleString('de-DE')} Anteile ({fmtPercent(inv.pctDelta)})
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}