// src/app/watchlist/page.tsx
'use client'

import Link from 'next/link'
import { useWatchlist } from '@/hooks/useWatchlist'
import { investors, Investor } from '@/data/investors'

export default function WatchlistPage() {
  const { items } = useWatchlist()
  const list = (investors as Investor[]).filter(inv =>
    items.includes(inv.slug)
  )

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Meine Watchlist</h1>

      {list.length === 0 ? (
        <p className="text-gray-600">Deine Watchlist ist noch leer.</p>
      ) : (
        <ul className="space-y-2">
          {list.map(inv => (
            <li key={inv.slug} className="flex justify-between items-center">
              <Link
                href={`/investor/${inv.slug}`}
                className="text-blue-600 hover:underline text-lg"
              >
                {inv.name}
              </Link>
              <Link
                href={`/investor/${inv.slug}`}
                className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
              >
                Zum Profil
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}