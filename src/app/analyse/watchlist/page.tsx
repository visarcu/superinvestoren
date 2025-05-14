// src/app/analyse/watchlist/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { stocks, type Stock } from '../../../data/stocks'

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('watchlist')
      if (raw) setWatchlist(JSON.parse(raw))
    } catch {
      console.warn('Could not read watchlist from localStorage')
    }
  }, [])

  // Lookup each ticker’s full Stock entry, filter out any not found
  const items = watchlist
    .map(t => stocks.find(s => s.ticker === t))
    .filter((s): s is Stock => Boolean(s))

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Watchlist</h1>

      {items.length === 0 ? (
        <p className="text-gray-400">Deine Watchlist ist noch leer.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(({ ticker, name }) => (
            <Link
              key={ticker}
              href={`/aktie/${ticker.toLowerCase()}`}
              className="block bg-card-dark p-4 rounded-lg shadow hover:bg-gray-700 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{name}</p>
                  <p className="text-accent font-semibold">{ticker}</p>
                </div>
                <span className="text-green-400 hover:underline">Anschauen →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}