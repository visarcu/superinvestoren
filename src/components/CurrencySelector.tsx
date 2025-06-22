// src/components/CurrencySelector.tsx
'use client'

import React, { useState } from 'react'

export default function CurrencySelector() {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <div 
        className="flex items-center gap-1 bg-theme-secondary rounded-lg p-1 cursor-not-allowed opacity-60"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {(['USD', 'EUR'] as const).map((curr) => (
          <button
            key={curr}
            disabled
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
              curr === 'USD' 
                ? 'bg-green-500 text-white shadow-sm' 
                : 'text-theme-muted'
            }`}
          >
            {curr}
          </button>
        ))}
      </div>
      
      {/* Coming Soon Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
          <div className="text-center">
            <div className="font-medium">🚀 Coming Soon</div>
            <div className="text-gray-300 mt-1">EUR Support in Entwicklung</div>
          </div>
          {/* Arrow */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  )
}