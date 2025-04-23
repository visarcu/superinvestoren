// src/app/aktie/[ticker]/page.tsx
import { stocks, Stock } from '../../../data/stocks'
import { notFound }      from 'next/navigation'
import Link              from 'next/link'

interface PageProps {
  params: { ticker: string }
}

export async function generateStaticParams() {
  return stocks.map(stock => ({
    ticker: stock.ticker.toLowerCase(),
  }))
}

// Live-Preis abrufen
async function fetchLivePrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error('Failed to fetch live price')
  const data = await res.json()
  return data.c
}

export default async function StockPage({ params }: PageProps) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find(s => s.ticker === ticker) ?? notFound()

  let livePrice: number | null = null
  try {
    livePrice = await fetchLivePrice(ticker)
  } catch {
    console.warn(`Live price for ${ticker} could not be fetched.`)
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Zurück
      </Link>
      <h1 className="text-4xl font-bold mb-2">{stock.name}</h1>
      <h2 className="text-lg text-gray-500 uppercase tracking-wide mb-6">
        {stock.ticker}
      </h2>

      <div className="space-y-4">
        {/* Live-Kurs */}
        <div className="flex justify-between bg-white dark:bg-surface-dark rounded-lg shadow p-4">
          <span className="font-medium">Aktueller Kurs</span>
          <span className="font-semibold">
            {livePrice !== null ? `${livePrice.toFixed(2)} €` : '–'}
          </span>
        </div>

        {/* Statische Kennzahlen */}
        {stock.metrics.map(m => (
          <div
            key={m.label}
            className="flex justify-between bg-white dark:bg-surface-dark rounded-lg shadow p-4"
          >
            <span className="font-medium">{m.label}</span>
            <span className="font-semibold">{m.value}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
