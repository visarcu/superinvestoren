'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface SearchedStock {
  ticker: string
  name: string
  exchange?: string
}

interface TickerSearchProps {
  onSelect: (stock: SearchedStock) => void
  placeholder?: string
  autoFocus?: boolean
  /** Bereits gewähltes Symbol (zeigt es als Pill an, Klick → erneut suchen) */
  selected?: SearchedStock | null
  onClear?: () => void
}

export default function TickerSearch({
  onSelect,
  placeholder = 'Aktie suchen (Symbol oder Name)…',
  autoFocus,
  selected,
  onClear,
}: TickerSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchedStock[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Debounced live search via /api/v1/companies (gleicher Endpoint wie FeyBottomNav)
  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/companies?search=${encodeURIComponent(query)}&pageSize=8`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.data || [])
          setHighlightedIdx(0)
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }, 150)
    return () => clearTimeout(timeout)
  }, [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[highlightedIdx]) {
      e.preventDefault()
      onSelect(results[highlightedIdx])
      setQuery('')
      setResults([])
    }
  }

  // Selected-Pill statt Input
  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/v1/logo/${selected.ticker}?size=60`}
          alt={selected.ticker}
          className="w-6 h-6 rounded-md bg-white/[0.06] object-contain flex-shrink-0"
          onError={e => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white">{selected.ticker}</p>
          <p className="text-[10px] text-white/40 truncate">{selected.name}</p>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]"
          >
            Ändern
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors"
      />

      {(results.length > 0 || loading) && query && (
        <div className="absolute z-10 w-full mt-1 bg-[#0c0c16] border border-white/[0.06] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-72 overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-[11px] text-white/30">Suche…</div>
          )}
          {results.map((stock, idx) => (
            <button
              key={`${stock.ticker}-${idx}`}
              onClick={() => {
                onSelect(stock)
                setQuery('')
                setResults([])
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                idx === highlightedIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/v1/logo/${stock.ticker}?size=60`}
                alt={stock.ticker}
                className="w-6 h-6 rounded-md bg-white/[0.06] object-contain flex-shrink-0"
                onError={e => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-white">{stock.ticker}</p>
                <p className="text-[10px] text-white/40 truncate">{stock.name}</p>
              </div>
              {stock.exchange && (
                <span className="text-[9px] text-white/35 uppercase tracking-wider flex-shrink-0">
                  {stock.exchange}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
