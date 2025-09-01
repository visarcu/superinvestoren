// src/components/CurrencySwitch.tsx
'use client'

import React from 'react'
import { useCurrency } from '@/lib/CurrencyContext'
import { GlobeAltIcon } from '@heroicons/react/24/outline'

interface CurrencySwitchProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function CurrencySwitch({ 
  size = 'md', 
  showLabel = true, 
  className = '' 
}: CurrencySwitchProps) {
  const { currency, setCurrency } = useCurrency()

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2', 
    lg: 'text-base px-4 py-3'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2 text-gray-400">
          <GlobeAltIcon className={iconSizes[size]} />
          <span className="text-xs font-medium">Format:</span>
        </div>
      )}
      
      <div className="flex bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <button
          onClick={() => setCurrency('EUR')}
          className={`${sizeClasses[size]} font-medium transition-all duration-200 ${
            currency === 'EUR'
              ? 'bg-green-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          EUR
        </button>
        <button
          onClick={() => setCurrency('USD')}
          className={`${sizeClasses[size]} font-medium transition-all duration-200 ${
            currency === 'USD'
              ? 'bg-green-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          USD
        </button>
      </div>
      
      {showLabel && (
        <span className="text-xs text-gray-500">
          {currency === 'EUR' ? 'Mrd. €' : '$B'}
        </span>
      )}
    </div>
  )
}