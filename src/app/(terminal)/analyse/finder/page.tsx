// Stock Finder - Natural Language Stock Screener
'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'

// Typen
interface Stock {
  symbol: string
  name: string
  price: number | null
  marketCap: number | null
  pe: number | null
  sector: string
  exchange: string
  dividendYield: number | null
  // Erweiterte Metriken aus JSON
  revenueGrowth1Y: number | null
  revenueGrowth3Y: number | null
  epsGrowth1Y: number | null
  roe: number | null
  netProfitMargin: number | null
}

interface ParsedFilters {
  sector?: string
  exchange?: string
  country?: string
  // Bewertung
  marketCapMin?: number
  marketCapMax?: number
  priceMin?: number
  priceMax?: number
  peMin?: number
  peMax?: number
  priceToBookMin?: number
  priceToBookMax?: number
  dividendMin?: number
  dividendMax?: number
  betaMin?: number
  betaMax?: number
  // Wachstum
  revenueGrowth1YMin?: number
  revenueGrowth3YMin?: number
  revenueGrowth5YMin?: number
  epsGrowth1YMin?: number
  epsGrowth3YMin?: number
  epsGrowth5YMin?: number
  // Profitabilität
  grossMarginMin?: number
  operatingMarginMin?: number
  netProfitMarginMin?: number
  roeMin?: number
  roaMin?: number
  roicMin?: number
}

// Vorschläge für den User - erweitert um Wachstum & Profitabilität
const SUGGESTIONS = [
  { label: 'Wachstumsaktien', query: 'Aktien mit Umsatzwachstum über 15% und ROE über 15%' },
  { label: 'Qualitätsaktien', query: 'Profitable Aktien mit ROE über 20% und Nettomarge über 15%' },
  { label: 'Value Tech', query: 'Tech Aktien mit KGV unter 25' },
  { label: 'Dividenden Champions', query: 'Large Cap mit Dividende über 3%' },
]

export default function StockFinderPage() {
  const router = useRouter()
  const { formatStockPrice, formatMarketCap } = useCurrency()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ParsedFilters>({})
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fokus auf Input beim Laden
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Suche ausführen - nutzt jetzt lokale JSON-Daten
  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query
    if (!q.trim()) return

    setError(null)
    setParsing(true)
    setHasSearched(true)

    try {
      // 1. Query parsen mit AI
      const parseRes = await fetch('/api/stock-finder/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })

      if (!parseRes.ok) throw new Error('Failed to parse query')

      const { filters } = await parseRes.json()
      setActiveFilters(filters)
      setParsing(false)
      setLoading(true)

      // 2. Aktien aus lokalem JSON Cache laden
      const searchRes = await fetch('/api/stock-finder/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, limit: 100 })
      })

      if (!searchRes.ok) throw new Error('Failed to fetch stocks')

      const { stocks: data, total } = await searchRes.json()

      setStocks(data)
      console.log(`✅ ${total} Aktien gefunden`)
    } catch (err) {
      console.error('Search error:', err)
      setError('Fehler bei der Suche. Bitte versuche es erneut.')
    } finally {
      setParsing(false)
      setLoading(false)
    }
  }, [query])

  // Enter-Taste
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Suggestion klicken
  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
  }

  // Aktie anklicken
  const handleStockClick = (symbol: string) => {
    router.push(`/analyse/stocks/${symbol.toLowerCase()}`)
  }

  // Filter-Tags anzeigen - erweitert um neue Metriken
  const renderFilterTags = () => {
    const tags: string[] = []

    // Basis
    if (activeFilters.sector) tags.push(activeFilters.sector)
    if (activeFilters.exchange) tags.push(activeFilters.exchange)

    // Bewertung
    if (activeFilters.marketCapMin) tags.push(`MCap > ${formatMarketCap(activeFilters.marketCapMin)}`)
    if (activeFilters.marketCapMax) tags.push(`MCap < ${formatMarketCap(activeFilters.marketCapMax)}`)
    if (activeFilters.peMin) tags.push(`P/E > ${activeFilters.peMin}`)
    if (activeFilters.peMax) tags.push(`P/E < ${activeFilters.peMax}`)
    if (activeFilters.dividendMin) tags.push(`Div > ${activeFilters.dividendMin}%`)

    // Wachstum
    if (activeFilters.revenueGrowth1YMin) tags.push(`Rev 1Y > ${activeFilters.revenueGrowth1YMin}%`)
    if (activeFilters.revenueGrowth3YMin) tags.push(`Rev 3Y > ${activeFilters.revenueGrowth3YMin}%`)
    if (activeFilters.revenueGrowth5YMin) tags.push(`Rev 5Y > ${activeFilters.revenueGrowth5YMin}%`)
    if (activeFilters.epsGrowth1YMin) tags.push(`EPS 1Y > ${activeFilters.epsGrowth1YMin}%`)
    if (activeFilters.epsGrowth3YMin) tags.push(`EPS 3Y > ${activeFilters.epsGrowth3YMin}%`)
    if (activeFilters.epsGrowth5YMin) tags.push(`EPS 5Y > ${activeFilters.epsGrowth5YMin}%`)

    // Profitabilität
    if (activeFilters.roeMin) tags.push(`ROE > ${activeFilters.roeMin}%`)
    if (activeFilters.roicMin) tags.push(`ROIC > ${activeFilters.roicMin}%`)
    if (activeFilters.netProfitMarginMin) tags.push(`Nettomarge > ${activeFilters.netProfitMarginMin}%`)
    if (activeFilters.grossMarginMin) tags.push(`Bruttomarge > ${activeFilters.grossMarginMin}%`)

    if (tags.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="px-2 py-1 text-xs font-medium bg-theme-accent/20 text-theme-accent rounded-md"
          >
            {tag}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <SparklesIcon className="w-6 h-6 text-theme-accent" />
            <h1 className="text-2xl font-semibold text-theme-primary">Stock Finder</h1>
          </div>
          <p className="text-theme-secondary text-sm">
            Beschreibe was du suchst - in natürlicher Sprache
          </p>
        </div>

        {/* Search Input */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="z.B. Tech Aktien mit KGV unter 30..."
              className="w-full pl-12 pr-4 py-4 bg-theme-card border border-white/10 rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent/50 focus:ring-1 focus:ring-theme-accent/50 transition-all"
            />
            {(parsing || loading) && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Filter Tags */}
          {renderFilterTags()}

          {/* Suggestions */}
          {!hasSearched && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s.query)}
                  className="px-3 py-1.5 text-sm bg-theme-secondary/30 hover:bg-theme-secondary/50 text-theme-secondary hover:text-theme-primary rounded-lg transition-all flex items-center gap-1.5"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !loading && !parsing && (
          <div className="bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden">
            {/* Results Header */}
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
              <span className="text-sm text-theme-secondary">
                {stocks.length} Ergebnisse
              </span>
            </div>

            {/* Table - erweitert um Wachstum & Profitabilität */}
            {stocks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Unternehmen</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Sektor</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Kurs</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">P/E</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Rev 3Y</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">ROE</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Div</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">MCap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.slice(0, 50).map((stock) => (
                      <tr
                        key={stock.symbol}
                        onClick={() => handleStockClick(stock.symbol)}
                        className="border-b border-white/[0.02] hover:bg-theme-hover cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-theme-secondary/30 flex items-center justify-center text-xs font-bold text-theme-primary">
                              {stock.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-theme-primary">{stock.symbol}</div>
                              <div className="text-xs text-theme-muted truncate max-w-[180px]">{stock.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs bg-theme-secondary/30 text-theme-secondary rounded">
                            {stock.sector || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-theme-primary">
                          {stock.price ? formatStockPrice(stock.price) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-theme-secondary">
                          {stock.pe ? stock.pe.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stock.revenueGrowth3Y !== null ? (
                            <span className={`font-mono text-sm ${stock.revenueGrowth3Y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.revenueGrowth3Y >= 0 ? '+' : ''}{stock.revenueGrowth3Y.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-theme-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stock.roe !== null ? (
                            <span className={`font-mono text-sm ${stock.roe >= 15 ? 'text-green-400' : 'text-theme-secondary'}`}>
                              {stock.roe.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-theme-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-theme-secondary">
                          {stock.dividendYield !== null ? `${(stock.dividendYield * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-theme-secondary">
                          {stock.marketCap ? formatMarketCap(stock.marketCap) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-12 text-center text-theme-muted">
                Keine Aktien gefunden. Versuche eine andere Suche.
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {(loading || parsing) && (
          <div className="bg-theme-card border border-white/[0.04] rounded-xl p-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-theme-secondary text-sm">
                {parsing ? 'Analysiere Anfrage...' : 'Lade Aktien...'}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
