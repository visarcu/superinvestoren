// src/hooks/useWatchlist.ts
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function useWatchlist(ticker: string) {
  const { data: session } = useSession()
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // nur wenn eingeloggt
    if (!session) {
      setLoading(false)
      return
    }
    fetch(`/api/watchlist/${ticker}`, { method: 'GET' })
      .then(res => res.json())
      .then(data => setInWatchlist(data.exists))
      .finally(() => setLoading(false))
  }, [ticker, session])

  async function toggle() {
    if (!session) return
    const method = inWatchlist ? 'DELETE' : 'POST'
    setLoading(true)
    await fetch(`/api/watchlist/${ticker}`, { method })
    setInWatchlist(!inWatchlist)
    setLoading(false)
  }

  return { inWatchlist, toggle, loading }
}