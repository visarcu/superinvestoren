'use client'

// Zuletzt analysiert — Fey-Card, zeigt die letzten 6 Aktien aus dem
// localStorage-LRU (siehe src/lib/recentlyViewed.ts).
//
// Zusätzlich: Aktuelle Kurse aus /api/v1/quotes/batch, sodass die Liste
// lebendig wirkt (nicht nur trockene Ticker-Namen).

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecentTickers, removeRecentTicker, type RecentTicker } from '@/lib/recentlyViewed'

interface QuoteRow {
  symbol: string
  price: number
  change: number
  changePercent: number
}

const MAX_ITEMS = 6

export default function RecentlyViewedCard() {
  const [items, setItems] = useState<RecentTicker[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteRow>>({})
  const [mounted, setMounted] = useState(false)

  // localStorage lesen + auf Updates reagieren (z.B. nachdem User eine Aktie öffnet)
  const reload = useCallback(() => {
    const list = getRecentTickers().slice(0, MAX_ITEMS)
    setItems(list)
  }, [])

  useEffect(() => {
    setMounted(true)
    reload()
    const onChange = () => reload()
    window.addEventListener('finclue:recentlyViewed:changed', onChange)
    // Auch storage-Events von anderen Tabs abfangen
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('finclue:recentlyViewed:changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [reload])

  // Quotes für sichtbare Ticker laden + alle 45s refreshen
  useEffect(() => {
    if (items.length === 0) {
      setQuotes({})
      return
    }
    const symbols = items.map(i => i.ticker).join(',')
    const fetchQuotes = () => {
      fetch(`/api/v1/quotes/batch?symbols=${symbols}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (!d?.quotes) return
          const map: Record<string, QuoteRow> = {}
          for (const q of d.quotes as QuoteRow[]) map[q.symbol] = q
          setQuotes(map)
        })
        .catch(() => {})
    }
    fetchQuotes()
    const id = setInterval(fetchQuotes, 45000)
    return () => clearInterval(id)
  }, [items])

  const handleRemove = (e: React.MouseEvent, ticker: string) => {
    e.preventDefault()
    e.stopPropagation()
    removeRecentTicker(ticker)
  }

  // Hydration-safe: erst nach Mount rendern (localStorage ist client-only)
  if (!mounted) {
    return (
      <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-5">
        <h2 className="text-[14px] font-semibold text-white/80">Zuletzt analysiert</h2>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.02] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white/80">Zuletzt analysiert</h2>
          <p className="text-[11px] text-white/30 mt-0.5">
            {items.length === 0
              ? 'Deine Analyse-Historie erscheint hier'
              : `${items.length} Aktie${items.length === 1 ? '' : 'n'}`}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-white/25 py-4">
          Öffne eine Aktie aus dem Screener oder der Watchlist — sie erscheint
          dann hier.
        </p>
      ) : (
        <div className="space-y-0.5">
          {items.map(item => {
            const q = quotes[item.ticker]
            return (
              <Link
                key={item.ticker}
                href={`/analyse/aktien/${item.ticker}`}
                className="flex items-center justify-between py-2.5 px-2 -mx-2 hover:bg-white/[0.02] rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${item.ticker}?size=64`}
                    alt={item.ticker}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] object-contain flex-shrink-0"
                    onError={ev => {
                      ;(ev.target as HTMLImageElement).style.opacity = '0'
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">
                        {item.ticker}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/35 truncate max-w-[220px]">
                      {item.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {q ? (
                    <div className="text-right">
                      <p className="text-[12px] font-medium text-white/70 tabular-nums">
                        {q.price.toLocaleString('de-DE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p
                        className={`text-[10px] tabular-nums ${
                          q.changePercent >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'
                        }`}
                      >
                        {q.changePercent >= 0 ? '+' : ''}
                        {q.changePercent.toFixed(2).replace('.', ',')}%
                      </p>
                    </div>
                  ) : null}
                  <button
                    onClick={e => handleRemove(e, item.ticker)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/25 hover:text-white/70 p-1"
                    aria-label={`${item.ticker} aus Verlauf entfernen`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
