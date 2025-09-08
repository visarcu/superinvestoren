// src/components/RatingsPage/RatingHero.tsx - TERMINAL STYLE
'use client'

import React from 'react'
import ScoreGauge from './ScoreGauge'
import RatingBadge from './RatingBadge'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface RatingHeroProps {
  ticker: string
  finclueScore: number
  scoreTrend?: number
  historicalScores?: Array<{
    date: string
    period: string
    score: number
  }>
}

export default function RatingHero({ 
  ticker, 
  finclueScore, 
  scoreTrend = 0, 
  historicalScores = [] 
}: RatingHeroProps) {
  
  const getScoreDescription = (score: number) => {
    if (score >= 90) return { text: 'Exzellent', subtext: 'Hervorragende Fundamentaldaten' }
    if (score >= 80) return { text: 'Sehr gut', subtext: 'Starke fundamentale Position' }
    if (score >= 70) return { text: 'Gut', subtext: 'Solide Fundamentaldaten' }
    if (score >= 60) return { text: 'Befriedigend', subtext: 'Durchschnittliche Performance' }
    if (score >= 50) return { text: 'Ausreichend', subtext: 'Gemischte Signale' }
    if (score >= 30) return { text: 'Schwach', subtext: 'Einige Schwachstellen' }
    return { text: 'Sehr schwach', subtext: 'Erhebliche Bedenken' }
  }

  const description = getScoreDescription(finclueScore)
  const recentScores = historicalScores.slice(-4)

  return (
    <div className="bg-theme-card rounded-lg border border-theme/10">
      {/* Header - Clean Terminal Style */}
      <div className="px-6 py-4 border-b border-theme/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-theme-primary">
              FinClue Rating
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-mono font-semibold text-theme-secondary">{ticker}</span>
              <span className="text-theme-muted">•</span>
              <span className="text-sm text-theme-muted">Fundamentalanalyse</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-theme-muted">LIVE</span>
          </div>
        </div>
      </div>

      {/* Content - Grid Layout */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          
          {/* Main Score Display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-6 mb-4">
              <ScoreGauge 
                score={finclueScore} 
                size="lg" 
              />
              <RatingBadge score={finclueScore} size="lg" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">
              {description.text}
            </h3>
            <p className="text-sm text-theme-muted max-w-xs mx-auto">
              {description.subtext}
            </p>
            <div className="text-2xl font-mono font-bold text-theme-secondary mt-2">
              {finclueScore}/100
            </div>
          </div>

          {/* Trend Analysis - Clean */}
          <div className="text-center border-l border-r border-theme/20 px-8">
            <div className="flex items-center justify-center mb-4">
              <div className={`
                p-3 rounded-lg border
                ${scoreTrend >= 0 
                  ? 'bg-green-400/10 border-green-400/30' 
                  : 'bg-red-400/10 border-red-400/30'
                }
              `}>
                {scoreTrend >= 0 ? (
                  <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
                ) : (
                  <ArrowTrendingDownIcon className="w-6 h-6 text-red-400" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className={`text-xl font-mono font-bold ${
                scoreTrend >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {scoreTrend >= 0 ? '+' : ''}{scoreTrend}
              </div>
              <div className="text-sm text-theme-muted">
                Trend (Quartal)
              </div>
              <div className={`text-xs font-medium ${
                scoreTrend >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {scoreTrend > 5 ? 'Stark verbessert' : 
                 scoreTrend > 0 ? 'Verbessert' :
                 scoreTrend > -5 ? 'Verschlechtert' : 'Stark verschlechtert'}
              </div>
            </div>
          </div>

          {/* Historical Scores - Terminal Table Style */}
          <div>
            <h4 className="font-semibold text-theme-secondary mb-4 text-sm uppercase tracking-wider">
              Verlauf
            </h4>
            <div className="space-y-2">
              {recentScores.map((hist, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-theme-tertiary/30 rounded border border-theme/10">
                  <span className="text-sm text-theme-muted font-mono">
                    {hist.period}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-theme-primary">
                      {hist.score}
                    </span>
                    <RatingBadge score={hist.score} size="sm" />
                  </div>
                </div>
              ))}
              
              {recentScores.length === 0 && (
                <div className="text-center py-4 text-theme-muted text-sm">
                  Keine historischen Daten
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}