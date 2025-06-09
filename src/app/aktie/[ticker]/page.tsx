// src/app/aktie/[ticker]/page.tsx
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Card from '@/components/Card'
import InvestorAvatar from '@/components/InvestorAvatar'  // ✅ Default import
import { InvestorDelta } from '@/components/InvestorDelta'  // ✅ Named import
import { stocks } from '../../../data/stocks'
import { investors } from '../../../data/investors'
import holdingsHistory from '../../../data/holdings'
import { EnvelopeIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'  // ✅ NEU

// Featured tickers
const FEATURED_TICKERS = ['nvda', 'aapl', 'amzn', 'googl']

// Dynamic imports
const StockLineChart  = dynamic(() => import('../../../components/StockLineChart'), { ssr: false })
const WatchlistButton = dynamic(() => import('@/components/WatchlistButton'),  { ssr: false })
const Sparkline       = dynamic(() => import('../../../components/Sparkline'),    { ssr: false })

// ISR
export const revalidate = 3600

export async function generateStaticParams() {
  return FEATURED_TICKERS.map((t) => ({
    ticker: t.toLowerCase()
  }))
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

// Historische Kursdaten von FMP
async function fetchHistorical(symbol: string): Promise<{ date: string; close: number }[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 * 60 * 6 } }
  )
  if (!res.ok) throw new Error('Historical fetch failed')
  const { historical = [] } = await res.json()
  return (historical as any[]).reverse()
}

export default async function StockPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock  = stocks.find(s => s.ticker === ticker) ?? notFound()
  const logoSrc = `/logos/${ticker}.svg`

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

  // Formatter
  const fmtPrice   = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  const fmtPercent = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')} %`

  // 3) Aktuelle Halter
  interface OwningInvestor {
    slug: string
    name: string
    imageUrl?: string
    weight: number
  }
  const owningInvestors: OwningInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return null
      const matches = latest.positions.filter(p => p.cusip === stock.cusip)
      if (!matches.length) return null
      const total   = latest.positions.reduce((sum, p) => sum + p.value, 0)
      const matched = matches.reduce((sum, p) => sum + p.value, 0)
      if (!total) return null
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null
      return { slug, name: inv.name, imageUrl: inv.imageUrl, weight: matched / total }
    })
    .filter(Boolean) as OwningInvestor[]

  // 4) Käufer im letzten Quartal
  interface BuyingInvestor {
    slug: string
    name: string
    imageUrl?: string
    deltaShares: number
    pctDelta: number
  }
  const buyingInvestors: BuyingInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      if (snaps.length < 2) return null
      const prev = snaps[snaps.length - 2].data
      const cur  = snaps[snaps.length - 1].data
      if (!prev?.positions || !cur?.positions) return null
      const prevShares = prev.positions.filter(p => p.cusip === stock.cusip).reduce((s, p) => s + p.shares, 0)
      const curShares  = cur.positions .filter(p => p.cusip === stock.cusip).reduce((s, p) => s + p.shares, 0)
      const delta = curShares - prevShares
      if (delta <= 0) return null
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null
      return { slug, name: inv.name, imageUrl: inv.imageUrl, deltaShares: delta, pctDelta: prevShares > 0 ? delta / prevShares : 1 }
    })
    .filter(Boolean) as BuyingInvestor[]

  // 5) Verkäufer im letzten Quartal
  interface SellingInvestor {
    slug: string
    name: string
    imageUrl?: string
    deltaShares: number
    pctDelta: number
  }
  const sellingInvestors: SellingInvestor[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      if (snaps.length < 2) return null
      const prev = snaps[snaps.length - 2].data
      const cur  = snaps[snaps.length - 1].data
      if (!prev?.positions || !cur?.positions) return null
      const prevShares = prev.positions.filter(p => p.cusip === stock.cusip).reduce((s, p) => s + p.shares, 0)
      const curShares  = cur.positions .filter(p => p.cusip === stock.cusip).reduce((s, p) => s + p.shares, 0)
      const delta = curShares - prevShares
      if (delta >= 0) return null
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null
      return { slug, name: inv.name, imageUrl: inv.imageUrl, deltaShares: Math.abs(delta), pctDelta: prevShares > 0 ? Math.abs(delta) / prevShares : 1 }
    })
    .filter(Boolean) as SellingInvestor[]

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      {/* Back Link */}
      <Link href="/" className="text-gray-400 hover:text-white">← Zurück</Link>

      {/* Header Card */}
      <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl p-6 flex flex-col lg:flex-row items-center lg:items-start gap-6 shadow-lg">
        {/* Logo + Titel */}
        <div className="flex items-center space-x-6 flex-1">
        <Logo
  ticker={ticker}
  alt={`${stock.name} Logo`}
  className="w-20 h-20"
  padding="medium"
/>
          <div className="flex-1">
            <h1 className="text-3xl font-orbitron text-white leading-tight">
              {stock.name}{' '}
              <span className="text-lg text-gray-500 font-normal">({ticker})</span>
            </h1>
            {livePrice != null && (
              <p className="mt-1 text-2xl text-accent font-semibold">{fmtPrice(livePrice)}</p>
            )}
          </div>
        </div>

        {/* Mini-Sparkline (nur Desktop) */}
        {history.length > 0 && (
          <div className="hidden lg:block">
            <Sparkline data={history.slice(-30)} width={160} height={48} />
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col items-center lg:items-end space-y-4">
          <WatchlistButton ticker={ticker} />
          <Link
            href={`/analyse/${ticker.toLowerCase()}`}
            className="px-4 py-2 border-2 border-accent text-accent rounded-full hover:bg-accent/20 transition"
          >
            Zur Analyse →
          </Link>
        </div>
      </div>

      {/* Chart Card */}
      <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-md">
        <h2 className="text-xl font-orbitron text-gray-100 mb-4">Historischer Chart</h2>
        {history.length > 0
          ? <StockLineChart data={history} />
          : <p className="text-gray-400">Keine historischen Daten vorhanden.</p>
        }
      </div>

      {/* Investoren, die halten */}
      {owningInvestors.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-orbitron text-gray-100">Investoren, die halten</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {owningInvestors.map(inv => (
              <Link key={inv.slug} href={`/investor/${inv.slug}`}>
                <Card borderColor="border-gray-700" hoverBg="hover:bg-gray-700/50">
                  <div className="flex items-center gap-4">
                    <InvestorAvatar 
                      name={inv.name} 
                      imageUrl={inv.imageUrl} 
                      size="md"
                      className="ring-2 ring-gray-700"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{inv.name}</p>
                      <p className="text-gray-400 text-sm">
                        Anteil: {(inv.weight * 100).toFixed(1).replace('.', ',')} %
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Gekauft (letztes Q.) */}
      {buyingInvestors.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-orbitron text-gray-100">Gekauft (letztes Q.)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {buyingInvestors.map(inv => (
              <Link key={inv.slug} href={`/investor/${inv.slug}`}>
                <Card borderColor="border-green-500" hoverBg="hover:bg-gray-700/50">
                  <div className="flex items-center gap-4">
                    <InvestorAvatar 
                      name={inv.name} 
                      imageUrl={inv.imageUrl} 
                      size="md"
                      className="ring-2 ring-green-500"
                    />
                    <InvestorDelta 
                      name={inv.name} 
                      delta={inv.deltaShares} 
                      pct={inv.pctDelta} 
                      positive={true} 
                    />
                    <ArrowUpRightIcon className="w-5 h-5 text-green-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Verkauft (letztes Q.) */}
      {sellingInvestors.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-orbitron text-gray-100">Verkauft (letztes Q.)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {sellingInvestors.map(inv => (
              <Link key={inv.slug} href={`/investor/${inv.slug}`}>
                <Card borderColor="border-red-500" hoverBg="hover:bg-gray-700/50">
                  <div className="flex items-center gap-4">
                    <InvestorAvatar 
                      name={inv.name} 
                      imageUrl={inv.imageUrl} 
                      size="md"
                      className="ring-2 ring-red-500"
                    />
                    <InvestorDelta 
                      name={inv.name} 
                      delta={inv.deltaShares} 
                      pct={inv.pctDelta} 
                      positive={false} 
                    />
                    <ArrowUpRightIcon className="w-5 h-5 text-red-400 transform rotate-45" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}