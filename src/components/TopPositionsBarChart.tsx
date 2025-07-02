// src/components/TopPositionsBarChart.tsx - Clean Version
'use client'

import React from 'react'
import Logo from '@/components/Logo'

export interface TopPosition {
  name: string
  ticker?: string
  percent: number
}

export default function TopPositionsBarChart({
  data
}: {
  data: TopPosition[]
}) {
  // Finde Maximum für Skalierung
  const maxPercent = Math.max(...data.map(item => item.percent))
  
  // Extract ticker from name helper
  const getTickerAndName = (fullName: string, ticker?: string) => {
    // Falls ticker explizit gesetzt ist, verwende den
    if (ticker) {
      return {
        ticker,
        cleanName: fullName.startsWith(`${ticker} - `) 
          ? fullName.substring(`${ticker} - `.length)
          : fullName
      }
    }
    
    // Sonst versuche aus Name zu extrahieren
    const tickerMatch = fullName.match(/^([A-Z]{1,5})\s*[-–]\s*(.+)/)
    return {
      ticker: tickerMatch ? tickerMatch[1] : null,
      cleanName: tickerMatch ? tickerMatch[2] : fullName
    }
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const { ticker, cleanName } = getTickerAndName(item.name, item.ticker)
        
        return (
          <div 
            key={index} 
            className="group hover:bg-gray-800/20 p-3 rounded-lg transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              
              {/* Rank + Logo */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Rank */}
                <div className="w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-300">
                    {index + 1}
                  </span>
                </div>
                
                {/* Logo - Größer und besser sichtbar */}
                {ticker && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-gray-700/30 group-hover:border-gray-600/50 transition-colors flex-shrink-0">
                    <Logo
                      ticker={ticker}
                      alt={`${ticker} Logo`}
                      className="w-full h-full"
                      padding="small"
                    />
                  </div>
                )}
              </div>
              
              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    {/* Ticker in grün! */}
                    {ticker && (
                      <div className="text-green-400 font-mono text-sm font-semibold mb-0.5">
                        {ticker}
                      </div>
                    )}
                    {/* Company Name */}
                    <div className="text-white font-medium truncate text-sm">
                      {cleanName}
                    </div>
                  </div>
                  
                  {/* Percentage */}
                  <div className="flex-shrink-0 ml-4 text-right">
                    <div className="text-white font-bold text-lg">
                      {item.percent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar - Grün statt Blau! */}
                <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700 ease-out group-hover:from-green-400 group-hover:to-green-300"
                    style={{
                      width: `${(item.percent / maxPercent) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}