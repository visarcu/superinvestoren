// src/app/analyse/watchlist/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { stocks, type Stock } from '../../../data/stocks'
import Card from '@/components/Card'

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
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-orbitron text-white">Watchlist</h1>

      {items.length === 0 ? (
        <Card className="p-6 text-center text-gray-400">
          Deine Watchlist ist noch leer.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.map(({ ticker, name }) => (
            <Link
              key={ticker}
              href={`/aktie/${ticker.toLowerCase()}`}
              passHref
            >
              <Card
                as="a"
                className="
                  flex items-center justify-between
                  px-6 py-4
                  bg-gray-800/60 backdrop-blur-md border border-gray-700
                  rounded-2xl shadow-lg hover:shadow-2xl
                  transition
                "
              >
                <div>
                  <p className="text-lg font-semibold text-white">{name}</p>
                  <p className="text-accent font-medium">{ticker}</p>
                </div>
                <span className="text-accent font-medium hover:underline">
                  Anschauen &rarr;
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}