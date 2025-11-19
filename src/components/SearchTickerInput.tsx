// src/components/SearchTickerInput.tsx
'use client'

import React, { useState, useEffect, InputHTMLAttributes } from 'react'
import { stocks } from '@/data/stocks'

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSelect'> {
  onSelect: (ticker: string) => void
  inputClassName?: string
  buttonClassName?: string
  dropdownClassName?: string
  itemClassName?: string
}

export default function SearchTickerInput({
  onSelect,
  placeholder = '',
  className = '',
  inputClassName = '',
  buttonClassName = '',
  dropdownClassName = '',
  itemClassName = '',
  ...inputProps
}: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<typeof stocks>([])

  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([])
      return
    }
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
        className={inputClassName || `w-full px-4 py-2 rounded bg-gray-800 text-gray-100 focus:outline-none`}
        {...inputProps}
      />
      {suggestions.length > 0 && (
        <ul className={dropdownClassName || "absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-gray-900 rounded shadow-lg"}>
          {suggestions.map((s) => (
            <li
              key={s.ticker}
              onMouseDown={() => {
                onSelect(s.ticker)
                setQuery('')
                setSuggestions([])
              }}
              className={itemClassName || "px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-100"}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm">{s.ticker}</span>
                  <p className="text-xs opacity-70 truncate">{s.name}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}