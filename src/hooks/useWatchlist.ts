// src/hooks/useWatchlist.ts
'use client'
import { useState, useEffect } from 'react'

export function useWatchlist(ticker: string) {
  const [inWatchlist, setInWatchlist] = useState(false)

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]') as string[]
    setInWatchlist(list.includes(ticker))
  }, [ticker])

  async function toggle() {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]') as string[]
    let updated: string[]
    if (list.includes(ticker)) {
      updated = list.filter(t => t !== ticker)
      setInWatchlist(false)
    } else {
      updated = [...list, ticker]
      setInWatchlist(true)
    }
    localStorage.setItem('watchlist', JSON.stringify(updated))
  }

  return { inWatchlist, toggle }
}