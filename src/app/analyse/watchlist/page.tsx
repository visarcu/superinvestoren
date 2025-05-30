// src/app/analyse/watchlist/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Card from '@/components/Card'
import Logo from '@/components/Logo'
import WatchlistButton from '@/components/WatchlistButton'
import { stocks, type Stock } from '@/data/stocks'

interface Quote {
  price: number
  changePct: number
}

// helper: Live-Quote holen
async function fetchQuote(ticker: string): Promise<Quote> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
  )
  if (!res.ok) throw new Error('Quote fetch failed')
  const [data] = await res.json()
  return {
    price: data.price as number,
    changePct: parseFloat(data.changesPercentage as string),
  }
}

export default function WatchlistPage() {
  const { data: session, status } = useSession()
  const [tickers, setTickers] = useState<string[] | null>(null)
  const [quotes, setQuotes]   = useState<Record<string, Quote>>({})

  // ➊: Watchlist per API laden, sobald eingeloggt
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(d => setTickers(d.tickers as string[]))
      .catch(() => setTickers([]))
  }, [status])

  // ➋: Live-Quotes für alle Ticker nachladen
  useEffect(() => {
    if (!tickers) return
    tickers.forEach(t => {
      fetchQuote(t)
        .then(q => setQuotes(prev => ({ ...prev, [t]: q })))
        .catch(() => {})
    })
  }, [tickers])

  // ➌: States
  if (status === 'loading' || tickers === null) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <p className="text-gray-400">Lade deine Watchlist…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <Card className="p-6 text-center text-gray-400">
          Bitte melde dich an, um deine Watchlist zu sehen.
        </Card>
      </main>
    )
  }

  // ➍: keine Einträge?
  if (tickers.length === 0) {
    return (
      <main className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Logo + Headline */}
        <div className="flex flex-col items-center space-y-2">
      
          <h1 className="text-3xl font-orbitron text-white">Deine Watchlist</h1>
        </div>
        <Card className="p-6 text-center text-gray-400">
          Deine Watchlist ist noch leer.
        </Card>
      </main>
    )
  }

  // ➎: Stocks-Array aus den geladenen Ticker-Strings
  const items: Stock[] = tickers
    .map(t => stocks.find(s => s.ticker === t))
    .filter((s): s is Stock => Boolean(s))

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Logo + Titel */}
      <div className="flex flex-col items-center space-y-2">
        
        <h1 className="text-3xl font-orbitron text-white">Deine Watchlist</h1>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {items.map(stock => {
          const q = quotes[stock.ticker]
          return (
            <div key={stock.ticker} className="relative">
             
              {/* Card als Link */}
              <Link href={`/analyse/${stock.ticker.toLowerCase()}`}>
                <Card className="
                  p-6
                  bg-gray-800/60 backdrop-blur-md border border-gray-700
                  rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer
                ">
                  {/* Logo */}
                  <div className="flex justify-center mb-4">
                    <Logo
                      src={`/logos/${stock.ticker.toLowerCase()}.svg`}
                      alt={`${stock.ticker} Logo`}
                      className="w-12 h-12"
                    />
                  </div>

                  {/* Name & Ticker */}
                  <div className="text-center space-y-1">
                    <p className="text-lg font-semibold text-white">{stock.name}</p>
                    <p className="text-accent font-medium">{stock.ticker}</p>
                  </div>

                  {/* Live-Quote */}
                  {q && (
                    <div className="mt-4 text-center space-y-1">
                      <p className="text-2xl font-bold text-white">
                        {q.price.toLocaleString('de-DE', {
                          style:    'currency',
                          currency: 'USD',
                        })}
                      </p>
                      <p className={`text-sm font-mono ${
                        q.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {q.changePct >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(q.changePct).toFixed(2).replace('.', ',')} %
                      </p>
                    </div>
                  )}
                </Card>
              </Link>
            </div>
          )
        })}
      </div>
    </main>
  )
}