// src/components/CurrencySelector.tsx
'use client'

import React from 'react'
import { useCurrency } from '@/lib/CurrencyContext'

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="flex items-center gap-1 bg-theme-secondary rounded-lg p-1">
      {(['USD', 'EUR'] as const).map((curr) => (
        <button
          key={curr}
          onClick={() => setCurrency(curr)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
            currency === curr 
              ? 'bg-green-500 text-white shadow-sm' 
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary'
          }`}
        >
          {curr}
        </button>
      ))}
    </div>
  )
}