// src/components/WatchlistButton.tsx
'use client'

import { useState } from 'react'
import { useWatchlist } from '@/hooks/useWatchlist'
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid }   from '@heroicons/react/24/solid'

interface Props {
  ticker: string
}

export default function WatchlistButton({ ticker }: Props) {
  const { inWatchlist, toggle } = useWatchlist(ticker)
  const [loading, setLoading]   = useState(false)

  const handleClick = async () => {
    setLoading(true)
    await toggle()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={inWatchlist ? 'Von Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
      className={`
        flex items-center gap-2 px-4 py-2
        rounded-full transition
        ${inWatchlist
          ? 'bg-red-600 text-white hover:bg-red-500'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
        ${loading ? 'opacity-50 cursor-wait' : ''}
      `}
    >
      {inWatchlist
        ? <HeartSolid className="w-5 h-5" />
        : <HeartOutline className="w-5 h-5" />
      }
      {loading 
        ? '…'
        : inWatchlist 
          ? 'Entfernen' 
          : 'Watchlist'
      }
    </button>
  )
}