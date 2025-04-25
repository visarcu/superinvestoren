// src/components/WatchlistButton.tsx
'use client'
import { useWatchlist } from '../hooks/useWatchlist'

interface Props {
  slug: string
}

export default function WatchlistButton({ slug }: Props) {
  const { isInList, toggle } = useWatchlist()
  const active = isInList(slug)

  return (
    <button
      onClick={() => toggle(slug)}
      className={`px-3 py-1 text-sm rounded ${
        active
          ? 'bg-yellow-400 text-black'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      }`}
    >
      {active ? '★ Entfernen' : '☆ Zur Watchlist'}
    </button>
  )
}