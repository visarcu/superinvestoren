'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface StockResult {
  symbol: string
  name: string
  exchange?: string
}

interface StockAutocompleteProps {
  value: string
  onSelect: (symbol: string, name: string) => void
  placeholder?: string
  className?: string
}

export default function StockAutocomplete({ 
  value, 
  onSelect, 
  placeholder = "z.B. AAPL, MSFT, TSLA",
  className = ""
}: StockAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<StockResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchStocks(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchStocks = async (searchQuery: string) => {
    if (searchQuery.length < 2) return

    setLoading(true)
    try {
      const response = await fetch('/api/portfolio/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setIsOpen(true)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (result: StockResult) => {
    setQuery(result.symbol)
    setIsOpen(false)
    onSelect(result.symbol, result.name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value.toUpperCase()
    setQuery(newQuery)
    
    // If user types exact symbol, auto-select
    const exactMatch = results.find(r => r.symbol === newQuery)
    if (exactMatch && newQuery.length >= 3) {
      onSelect(exactMatch.symbol, exactMatch.name)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-10 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition ${className}`}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
          ) : (
            <MagnifyingGlassIcon className="w-4 h-4 text-theme-muted" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-theme-card border border-theme-hover rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={`${result.symbol}-${result.exchange}`}
              onClick={() => handleSelect(result)}
              className={`w-full px-4 py-3 text-left hover:bg-theme-tertiary transition-colors border-b border-theme-hover last:border-b-0 ${
                index === selectedIndex ? 'bg-theme-tertiary' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-theme-primary">
                    {result.symbol}
                  </div>
                  <div className="text-sm text-theme-secondary truncate max-w-64">
                    {result.name}
                  </div>
                </div>
                {result.exchange && (
                  <div className="text-xs text-theme-muted bg-theme-tertiary px-2 py-1 rounded">
                    {result.exchange}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-theme-card border border-theme-hover rounded-lg shadow-lg">
          <div className="px-4 py-3 text-theme-muted text-center">
            Keine Ergebnisse für "{query}"
          </div>
        </div>
      )}
    </div>
  )
}