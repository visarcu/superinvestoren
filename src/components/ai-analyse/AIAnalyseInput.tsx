'use client'

import React, { useState } from 'react'
import { MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'

interface AIAnalyseInputProps {
  onAnalyze: (ticker: string) => void
  isLoading: boolean
  initialTicker?: string
}

export default function AIAnalyseInput({ onAnalyze, isLoading, initialTicker }: AIAnalyseInputProps) {
  const [searchQuery, setSearchQuery] = useState(initialTicker || '')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const filteredStocks = searchQuery
    ? stocks.filter(s =>
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : []

  const handleSelectStock = (ticker: string) => {
    setSearchQuery(ticker)
    setIsSearchOpen(false)
    onAnalyze(ticker)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim() && !isLoading) {
      onAnalyze(searchQuery.trim().toUpperCase())
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" />
          <input
            type="text"
            placeholder="Ticker eingeben (z.B. AAPL, MSFT, NVDA)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            disabled={isLoading}
            className="w-full bg-theme-card border border-theme rounded-xl pl-12 pr-36 py-4 text-theme-primary placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none text-lg disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!searchQuery.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-5 py-2.5 bg-brand hover:bg-brand/90 disabled:bg-theme-secondary disabled:text-theme-muted text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analysiere...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>Analysieren</span>
              </>
            )}
          </button>
        </div>

        {/* Search Dropdown */}
        {isSearchOpen && filteredStocks.length > 0 && !isLoading && (
          <>
            <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card border border-theme rounded-xl shadow-xl z-50 overflow-hidden">
              {filteredStocks.map(stock => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleSelectStock(stock.ticker)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-theme-hover transition-colors text-left"
                >
                  <Logo ticker={stock.ticker} className="w-8 h-8" alt="" />
                  <div className="flex-1">
                    <div className="text-theme-primary font-medium">{stock.ticker}</div>
                    <div className="text-theme-muted text-xs">{stock.name}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
          </>
        )}
      </form>

      <p className="text-center text-theme-muted text-sm mt-4">
        Die AI analysiert Finanzdaten und erstellt eine professionelle DCF-Bewertung
      </p>
    </div>
  )
}
