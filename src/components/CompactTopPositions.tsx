// src/components/CompactTopPositions.tsx
'use client'

import React from 'react'
import Logo from '@/components/Logo'

export interface TopPosition {
  name: string
  ticker?: string
  percent: number
}

export default function CompactTopPositions({
  data
}: {
  data: TopPosition[]
}) {
  const getTickerAndName = (fullName: string, ticker?: string) => {
    if (ticker) {
      return {
        ticker,
        cleanName: fullName.startsWith(`${ticker} - `) 
          ? fullName.substring(`${ticker} - `.length)
          : fullName
      }
    }
    
    const tickerMatch = fullName.match(/^([A-Z]{1,5})\s*[-–]\s*(.+)/)
    return {
      ticker: tickerMatch ? tickerMatch[1] : null,
      cleanName: tickerMatch ? tickerMatch[2] : fullName
    }
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const { ticker, cleanName } = getTickerAndName(item.name, item.ticker)
        
        return (
          <div 
            key={index} 
            className="flex items-center gap-3 group hover:bg-gray-800/20 p-2 rounded-lg transition-all duration-200"
          >
            {/* Rank */}
            <div className="w-5 h-5 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-300">
                {index + 1}
              </span>
            </div>
            
            {/* Logo */}
            {ticker && (
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 border border-gray-700/30 group-hover:border-gray-600/50 transition-colors flex-shrink-0">
                <Logo
                  ticker={ticker}
                  alt={`${ticker} Logo`}
                  className="w-full h-full"
                  padding="small"
                />
              </div>
            )}
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  {/* Ticker + Company in einer Zeile */}
                  <div className="flex items-center gap-2">
                    {ticker && (
                      <span className="text-brand-light font-mono text-xs font-semibold flex-shrink-0">
                        {ticker}
                      </span>
                    )}
                    <span className="text-white text-sm font-medium truncate">
                      {cleanName.length > 18 ? cleanName.substring(0, 18) + '...' : cleanName}
                    </span>
                  </div>
                </div>
                
                {/* Percentage */}
                <div className="flex-shrink-0 ml-3">
                  <span className="text-white font-bold text-sm">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Mini Progress Bar */}
              <div className="w-full bg-gray-800/50 rounded-full h-1 mt-1">
                <div
                  className="h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((item.percent / data[0].percent) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}