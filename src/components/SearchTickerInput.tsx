// src/components/SearchTickerInput.tsx
'use client'

import React, { useState, useEffect, InputHTMLAttributes } from 'react'
import { stocks } from '@/data/stocks'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  onSelect: (ticker: string) => void
}

export default function SearchTickerInput({ onSelect, placeholder = '', className = '' }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<typeof stocks>([])

  useEffect(() => {
    if (query.trim() === '') return setSuggestions([])
    const q = query.trim().toUpperCase()
    setSuggestions(
      stocks
        .filter(
          (s) =>
            s.ticker.startsWith(q) || s.name.toUpperCase().includes(q)
        )
        .slice(0, 10)
    )
  }, [query])

  return (
    <div className={`relative ${className}`}>  
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded bg-gray-800 text-gray-100 focus:outline-none"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-gray-900 rounded shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s.ticker}
              onMouseDown={() => onSelect(s.ticker)}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-100"
            >
              <strong>{s.ticker}</strong> – {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


