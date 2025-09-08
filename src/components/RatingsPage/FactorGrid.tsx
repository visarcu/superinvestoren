// src/components/RatingsPage/FactorGrid.tsx
'use client'

import React from 'react'
import FactorCard from './FactorCard'

interface FactorData {
  score: number
  weight: number
  metrics?: Record<string, any>
  trend?: number
}

interface FactorGridProps {
  breakdown: Record<string, FactorData>
}

export default function FactorGrid({ breakdown }: FactorGridProps) {
  
  // Factor display names
  const factorNames: Record<string, string> = {
    profitability: 'Profitabilität',
    growth: 'Wachstum',
    valuation: 'Bewertung',
    momentum: 'Momentum',
    safety: 'Sicherheit',
    quality: 'Qualität'
  }

  // Define order for consistent display
  const factorOrder = ['profitability', 'growth', 'valuation', 'momentum', 'safety', 'quality']
  
  // Sort factors by defined order, falling back to alphabetical
  const sortedFactors = Object.entries(breakdown).sort(([a], [b]) => {
    const aIndex = factorOrder.indexOf(a)
    const bIndex = factorOrder.indexOf(b)
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    } else if (aIndex !== -1) {
      return -1
    } else if (bIndex !== -1) {
      return 1
    }
    
    return a.localeCompare(b)
  })

  if (sortedFactors.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Keine Faktor-Daten
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Die Aufschlüsselung der Bewertungsfaktoren ist derzeit nicht verfügbar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Bewertungsfaktoren
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Detaillierte Aufschlüsselung der Einzelbewertungen
          </p>
        </div>
      </div>

      {/* Factor Cards Grid - Better Spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedFactors.map(([key, data]) => (
          <FactorCard
            key={key}
            factorKey={key}
            factorName={factorNames[key] || key.charAt(0).toUpperCase() + key.slice(1)}
            score={data.score}
            weight={data.weight}
            metrics={data.metrics}
            trend={data.trend}
          />
        ))}
      </div>

      {/* Summary Stats - Terminal Style */}
      <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl font-mono font-bold text-theme-primary">
              {sortedFactors.length}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider">
              Faktoren
            </div>
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-theme-primary">
              {Math.round(sortedFactors.reduce((sum, [, data]) => sum + data.score, 0) / sortedFactors.length)}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider">
              Ø Score
            </div>
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-green-400">
              {sortedFactors.filter(([, data]) => data.score >= 70).length}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider">
              Stark
            </div>
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-red-400">
              {sortedFactors.filter(([, data]) => data.score < 50).length}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider">
              Schwach
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}