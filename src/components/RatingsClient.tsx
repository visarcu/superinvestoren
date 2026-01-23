// src/components/RatingsClient.tsx - INSIGHTS/FEY STYLE v3.0
'use client'

import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts'

interface ScoreData {
  altmanZScore: number | null
  piotroskiScore: number | null
  finclueScore: number
  breakdown: {
    [key: string]: {
      score: number
      weight: number
      metrics: any
    }
  }
  historicalScores: Array<{
    date: string
    period: string
    score: number
  }>
  rawData?: any
}

export default function RatingsClient({ ticker }: { ticker: string }) {
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await fetch(`/api/scores/${ticker}`)
        if (!response.ok) throw new Error('Failed to fetch scores')
        const data = await response.json()
        setScores(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [ticker])

  // Score Grade Berechnung
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', label: 'Exzellent' }
    if (score >= 80) return { grade: 'A', label: 'Sehr gut' }
    if (score >= 70) return { grade: 'B+', label: 'Gut' }
    if (score >= 60) return { grade: 'B', label: 'Befriedigend' }
    if (score >= 50) return { grade: 'C', label: 'Durchschnitt' }
    if (score >= 40) return { grade: 'D', label: 'Unterdurchschnittlich' }
    return { grade: 'F', label: 'Schwach' }
  }

  // Faktor Labels
  const factorLabels: Record<string, { name: string; description: string }> = {
    profitability: { name: 'Profitabilität', description: 'ROE, Margen, Effizienz' },
    growth: { name: 'Wachstum', description: 'Umsatz- & Gewinnwachstum' },
    valuation: { name: 'Bewertung', description: 'KGV, KBV, PEG' },
    momentum: { name: 'Momentum', description: 'Kursentwicklung' },
    quality: { name: 'Qualität', description: 'FCF, Stabilität' },
    safety: { name: 'Sicherheit', description: 'Verschuldung' }
  }

  // Loading State - Minimalistisch
  if (loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-5 bg-neutral-800 rounded w-48"></div>
          <div className="flex gap-8">
            <div className="w-20 h-20 bg-neutral-800 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-neutral-800 rounded w-24"></div>
              <div className="h-4 bg-neutral-800 rounded w-32"></div>
            </div>
          </div>
          <div className="space-y-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-12 bg-neutral-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error State - Clean
  if (error || !scores) {
    return (
      <div className="w-full px-6 lg:px-8 py-8 text-center">
        <p className="text-neutral-500">Keine Daten verfügbar</p>
      </div>
    )
  }

  const { grade, label } = getGrade(scores.finclueScore)

  // Trend berechnen
  const scoreTrend = scores.historicalScores && scores.historicalScores.length >= 2
    ? scores.finclueScore - scores.historicalScores[scores.historicalScores.length - 2].score
    : 0

  return (
    <div className="w-full px-6 lg:px-8 py-8">

      {/* ===== HEADER ===== */}
      <div className="mb-8 pb-6 border-b border-neutral-800">
        <h1 className="text-xl font-medium text-white mb-1">Rating & Bewertung</h1>
        <p className="text-sm text-neutral-500">Quantitative Analyse basierend auf Fundamentaldaten</p>
      </div>

      {/* ===== MAIN SCORE - INLINE (keine Card!) ===== */}
      <div className="flex items-center gap-8 mb-8 pb-8 border-b border-neutral-800">

        {/* Kleinerer Score Circle */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#262626"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#10b981"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(scores.finclueScore / 100) * 226} 226`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{scores.finclueScore}</span>
          </div>
        </div>

        {/* Grade Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-semibold text-white">{grade}</span>
            <span className="text-neutral-500">• {label}</span>
          </div>
          <p className="text-sm text-neutral-500">Finclue Score</p>
          {scoreTrend !== 0 && (
            <p className={`text-xs mt-1 ${scoreTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {scoreTrend > 0 ? '↗' : '↘'} {Math.abs(scoreTrend).toFixed(1)} vs. Vorquartal
            </p>
          )}
        </div>

        {/* Mini Sparkline - keine Box */}
        {scores.historicalScores && scores.historicalScores.length > 0 && (
          <div className="w-48 h-12 hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scores.historicalScores}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ===== FAKTOR-ANALYSE ALS LISTE ===== */}
      {scores.breakdown && Object.keys(scores.breakdown).length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Faktor-Analyse
          </h3>

          <div className="space-y-0">
            {Object.entries(scores.breakdown).map(([key, factor]) => {
              const factorInfo = factorLabels[key] || { name: key, description: '' }
              const factorGrade = getGrade(factor.score)

              return (
                <div
                  key={key}
                  className="flex items-center py-4 border-b border-neutral-800/50 last:border-b-0 group hover:bg-neutral-800/20 -mx-2 px-2 rounded transition-colors"
                >
                  {/* Links: Name + Beschreibung */}
                  <div className="w-40">
                    <p className="text-sm font-medium text-white">{factorInfo.name}</p>
                    <p className="text-xs text-neutral-500">{factorInfo.description}</p>
                  </div>

                  {/* Mitte: Progress Bar */}
                  <div className="flex-1 mx-6">
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          factor.score >= 70 ? 'bg-emerald-500' :
                          factor.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Rechts: Score + Grade + Weight */}
                  <div className="flex items-center gap-4 w-32 justify-end">
                    <span className="text-lg font-semibold text-white">{factor.score}</span>
                    <span className="text-sm text-neutral-500">{factorGrade.grade}</span>
                    <span className="text-xs text-neutral-600">{(factor.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== ALTMAN & PIOTROSKI - SIDE BY SIDE OHNE CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8 pb-8 border-b border-neutral-800">

        {/* Altman Z-Score */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-sm font-medium text-white">Altman Z-Score</h3>
            {scores.altmanZScore !== null && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                scores.altmanZScore > 2.99
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : scores.altmanZScore > 1.81
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
              }`}>
                {scores.altmanZScore > 2.99 ? 'Sicher' : scores.altmanZScore > 1.81 ? 'Grauzone' : 'Risiko'}
              </span>
            )}
          </div>

          {scores.altmanZScore !== null ? (
            <>
              <p className="text-3xl font-bold text-white mb-1">
                {scores.altmanZScore.toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500 mb-3">Insolvenzrisiko-Indikator</p>

              {/* Minimale Scale */}
              <div className="flex gap-1 h-1">
                <div className="flex-1 bg-red-500/30 rounded-l"></div>
                <div className="flex-1 bg-amber-500/30"></div>
                <div className="flex-1 bg-emerald-500/30 rounded-r"></div>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                <span>Risiko</span>
                <span>Grauzone</span>
                <span>Sicher</span>
              </div>
            </>
          ) : (
            <p className="text-neutral-500 text-sm">Keine Daten</p>
          )}
        </div>

        {/* Piotroski F-Score */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-sm font-medium text-white">Piotroski F-Score</h3>
            {scores.piotroskiScore !== null && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                scores.piotroskiScore >= 7
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : scores.piotroskiScore >= 4
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
              }`}>
                {scores.piotroskiScore >= 7 ? 'Stark' : scores.piotroskiScore >= 4 ? 'Neutral' : 'Schwach'}
              </span>
            )}
          </div>

          {scores.piotroskiScore !== null ? (
            <>
              <p className="text-3xl font-bold text-white mb-1">
                {scores.piotroskiScore}
                <span className="text-lg text-neutral-500 ml-1">/9</span>
              </p>
              <p className="text-xs text-neutral-500 mb-3">Fundamentale Stärke</p>

              {/* Minimale Dots */}
              <div className="flex gap-0.5">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full ${
                      i < scores.piotroskiScore! ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-neutral-500 text-sm">Keine Daten</p>
          )}
        </div>
      </div>

      {/* ===== FUSSZEILE - MINIMALE GEWICHTUNGS-INFO ===== */}
      <p className="text-xs text-neutral-600">
        Gewichtung: Profitabilität 25% · Wachstum 20% · Bewertung 20% · Momentum 15% · Qualität 10% · Sicherheit 10%
      </p>
    </div>
  )
}
