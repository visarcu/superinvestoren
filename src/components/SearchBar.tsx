// src/components/SearchBar.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { investors } from '@/data/investors'
import { stocks } from '@/data/stocks'

interface Suggestion {
  type: 'investor' | 'stock'
  label: string
  slug?: string
  ticker?: string
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Suggestion[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    const q = query.toLowerCase()
    const invMatches = investors
      .filter(inv => inv.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map<Suggestion>(inv => ({
        type: 'investor',
        label: inv.name,
        slug: inv.slug,
      }))
    const stockMatches = stocks
      .filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map<Suggestion>(s => ({
        type: 'stock',
        label: `${s.ticker} – ${s.name}`,
        ticker: s.ticker,
      }))
    setResults([...invMatches, ...stockMatches])
  }, [query])

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([])
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function onSelect(item: Suggestion) {
    if (item.type === 'investor' && item.slug) {
      router.push(`/investor/${item.slug}`)
    }
    if (item.type === 'stock' && item.ticker) {
      router.push(`/aktie/${item.ticker.toLowerCase()}`)
    }
    setQuery('')
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary"
        placeholder="Suche Aktie oder Investor…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => {
          /* Beim Fokussieren sofort Ergebnisse neu berechnen */
          setQuery(q => q)
        }}
      />

      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-surface dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((item, i) => (
            <li
              key={`${item.type}-${i}`}
              onClick={() => onSelect(item)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}