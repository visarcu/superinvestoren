// src/components/ScoreBadge.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

interface ScoreData {
  altmanZScore: number | null
  piotroskiScore: number | null
  finclueScore: number
}

export default function ScoreBadge({ ticker }: { ticker: string }) {
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await fetch(`/api/scores/${ticker}`)
        const data = await response.json()
        setScores(data)
      } catch (error) {
        console.error('Error fetching scores:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [ticker])

  if (loading) {
    return (
      <div className="animate-pulse bg-theme-tertiary/30 rounded-lg h-12 w-24"></div>
    )
  }

  if (!scores) return null

  const getGrade = (score: number): string => {
    if (score >= 80) return 'A'
    if (score >= 60) return 'B'
    if (score >= 40) return 'C'
    if (score >= 20) return 'D'
    return 'F'
  }

  const getColorClass = (score: number): string => {
    if (score >= 80) return 'bg-brand/20 text-brand-light border-green-500/30'
    if (score >= 60) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (score >= 20) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const getDescription = (score: number): string => {
    if (score >= 80) return 'Exzellente Bewertung'
    if (score >= 60) return 'Gute Bewertung'
    if (score >= 40) return 'Durchschnittliche Bewertung'
    if (score >= 20) return 'Unterdurchschnittliche Bewertung'
    return 'Schwache Bewertung'
  }

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-105 ${getColorClass(scores.finclueScore)}`}
      >
        <ShieldCheckIcon className="w-4 h-4" />
        <div className="flex flex-col items-start">
          <span className="text-xs opacity-75">Score</span>
          <span className="text-lg font-bold">{getGrade(scores.finclueScore)}</span>
        </div>
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 p-4 bg-theme-card border border-theme rounded-lg shadow-xl">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-theme-muted">FinClue Score</span>
                <span className="text-sm font-bold text-theme-primary">{scores.finclueScore}/100</span>
              </div>
              <div className="w-full bg-theme-tertiary rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${scores.finclueScore}%` }}
                />
              </div>
              <p className="text-xs text-theme-muted mt-1 italic">
                {getDescription(scores.finclueScore)}
              </p>
            </div>
            
            <div className="border-t border-theme pt-2 space-y-1">
              {scores.altmanZScore !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-theme-muted">Altman Z-Score</span>
                  <span className={`font-medium ${
                    scores.altmanZScore > 3 ? 'text-brand-light' : 
                    scores.altmanZScore > 1.8 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {scores.altmanZScore.toFixed(2)}
                  </span>
                </div>
              )}
              
              {scores.piotroskiScore !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-theme-muted">Piotroski F-Score</span>
                  <span className={`font-medium ${
                    scores.piotroskiScore >= 8 ? 'text-brand-light' : 
                    scores.piotroskiScore >= 6 ? 'text-emerald-400' : 
                    scores.piotroskiScore >= 4 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {scores.piotroskiScore}/9
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}