'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface StockResult {
  symbol: string
  name: string
  exchange: string
}

interface StockSymbolAutocompleteProps {
  value: string
  onChange: (symbol: string, name?: string) => void
  placeholder?: string
  className?: string
}

export default function StockSymbolAutocomplete({
  value,
  onChange,
  placeholder = "AAPL",
  className = ""
}: StockSymbolAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<StockResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchStocks(query)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchStocks = async (searchQuery: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/portfolio/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      const data = await response.json()
      setResults(data.results || [])
      setIsOpen(data.results?.length > 0)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase()
    setQuery(newValue)
    onChange(newValue)
  }

  const handleSelect = (result: StockResult) => {
    setQuery(result.symbol)
    onChange(result.symbol, result.name)
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
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
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const clearInput = () => {
    setQuery('')
    onChange('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={`w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded text-theme-primary text-sm pr-8 focus:outline-none focus:border-green-400 transition-colors ${className}`}
        />
        
        {/* Clear button or loading indicator */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
          )}
          {query && !loading && (
            <button
              onClick={clearInput}
              className="p-0.5 text-theme-muted hover:text-theme-secondary transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-theme-card border border-theme/20 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((result, index) => (
            <div
              key={`${result.symbol}-${result.exchange}`}
              onClick={() => handleSelect(result)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-green-400/10 text-green-400'
                  : 'hover:bg-theme-secondary text-theme-primary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{result.symbol}</div>
                  <div className="text-xs text-theme-muted truncate">
                    {result.name}
                  </div>
                </div>
                <div className="text-xs text-theme-muted ml-2 flex-shrink-0">
                  {result.exchange}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}