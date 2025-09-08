// src/components/RatingsPage/ComparisonCards.tsx
'use client'

import React from 'react'
import { ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface ComparisonCardsProps {
  altmanZScore?: number | null
  piotroskiScore?: number | null
}

export default function ComparisonCards({ altmanZScore, piotroskiScore }: ComparisonCardsProps) {
  
  // Altman Z-Score interpretation
  const getAltmanInfo = (score: number) => {
    if (score > 3.0) return {
      status: 'Sicher',
      description: 'Sehr geringes Insolvenzrisiko',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      percentage: 100
    }
    if (score > 1.8) return {
      status: 'Grauzone',
      description: 'Moderates Insolvenzrisiko',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
      percentage: 60
    }
    return {
      status: 'Risiko',
      description: 'Erhöhtes Insolvenzrisiko',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      percentage: 30
    }
  }

  // Piotroski F-Score interpretation
  const getPiotroskiInfo = (score: number) => {
    if (score >= 8) return {
      status: 'Sehr stark',
      description: 'Exzellente Fundamentaldaten',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50'
    }
    if (score >= 6) return {
      status: 'Stark',
      description: 'Gute Fundamentaldaten',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50'
    }
    if (score >= 4) return {
      status: 'Durchschnitt',
      description: 'Gemischte Fundamentaldaten',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/50'
    }
    return {
      status: 'Schwach',
      description: 'Schwache Fundamentaldaten',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/50'
    }
  }

  const isValidNumber = (value: any): value is number => {
    return value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)
  }

  const validScores = [
    isValidNumber(altmanZScore) && { type: 'altman', score: altmanZScore },
    isValidNumber(piotroskiScore) && { type: 'piotroski', score: piotroskiScore }
  ].filter(Boolean)

  if (validScores.length === 0) {
    return (
      <div className="bg-theme-card rounded-lg border border-theme/10 p-8">
        <div className="text-center">
          <div className="text-theme-muted mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-theme-primary mb-2">
            Keine Vergleichsscores
          </h3>
          <p className="text-sm text-theme-muted">
            Altman Z-Score und Piotroski F-Score sind derzeit nicht verfügbar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Klassische Scores
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bewährte Bewertungsmodelle im Vergleich
          </p>
        </div>
      </div>

      {/* Score Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Altman Z-Score - Terminal Style */}
        {isValidNumber(altmanZScore) && (
          <div className="bg-theme-card border border-theme/10 rounded-lg p-6 hover:bg-theme-tertiary/10 transition-all duration-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-theme-tertiary/30">
                  <ShieldCheckIcon className="w-5 h-5 text-theme-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-theme-primary">
                    Altman Z-Score
                  </h3>
                  <p className="text-sm text-theme-muted">
                    Insolvenzrisiko-Bewertung
                  </p>
                </div>
              </div>
            </div>

            {/* Score Display - Terminal */}
            <div className="text-center mb-6">
              <div className={`text-3xl font-mono font-bold mb-2 ${getAltmanInfo(altmanZScore).color}`}>
                {altmanZScore.toFixed(2)}
              </div>
              <div className="space-y-1">
                <div className={`text-base font-semibold ${getAltmanInfo(altmanZScore).color}`}>
                  {getAltmanInfo(altmanZScore).status}
                </div>
                <div className="text-sm text-theme-muted">
                  {getAltmanInfo(altmanZScore).description}
                </div>
              </div>
            </div>

            {/* Progress Bar - Terminal */}
            <div className="mb-4">
              <div className="bg-theme-tertiary/50 rounded h-2">
                <div 
                  className={`h-2 rounded transition-all duration-1000 ${
                    altmanZScore > 3 ? 'bg-green-400' : 
                    altmanZScore > 1.8 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${getAltmanInfo(altmanZScore).percentage}%` }}
                />
              </div>
            </div>

            {/* Scale - Terminal */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-theme-muted font-mono">&gt; 3.0</span>
                <span className="text-green-400 font-medium">Sicher</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-theme-muted font-mono">1.8 - 3.0</span>
                <span className="text-yellow-400 font-medium">Grauzone</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-theme-muted font-mono">&lt; 1.8</span>
                <span className="text-red-400 font-medium">Gefährdet</span>
              </div>
            </div>
          </div>
        )}

        {/* Piotroski F-Score */}
        {isValidNumber(piotroskiScore) && (
          <div className={`
            bg-gradient-to-br ${getPiotroskiInfo(piotroskiScore).bgColor}
            border ${getPiotroskiInfo(piotroskiScore).borderColor}
            rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300
          `}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${getPiotroskiInfo(piotroskiScore).iconBg}`}>
                  <ChartBarIcon className={`w-6 h-6 ${getPiotroskiInfo(piotroskiScore).color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Piotroski F-Score
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fundamentalstärke-Indikator
                  </p>
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div className="text-center mb-6">
              <div className={`text-4xl font-bold mb-2 ${getPiotroskiInfo(piotroskiScore).color}`}>
                {piotroskiScore}/9
              </div>
              <div className="space-y-1">
                <div className={`text-lg font-semibold ${getPiotroskiInfo(piotroskiScore).color}`}>
                  {getPiotroskiInfo(piotroskiScore).status}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {getPiotroskiInfo(piotroskiScore).description}
                </div>
              </div>
            </div>

            {/* Dot Grid */}
            <div className="grid grid-cols-9 gap-1 mb-4">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-4 rounded transition-all duration-300 ${
                    i < piotroskiScore 
                      ? piotroskiScore >= 8 ? 'bg-emerald-500' :
                        piotroskiScore >= 6 ? 'bg-blue-500' :
                        piotroskiScore >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Description */}
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Prüft 9 fundamentale Kriterien aus den Bereichen Profitabilität, 
              Liquidität und operative Effizienz.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}