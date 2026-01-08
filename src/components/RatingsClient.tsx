// src/components/RatingsClient.tsx - CLEAN FISCAL STYLE v2.0
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine
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
    momentum: { name: 'Momentum', description: 'Kursentwicklung, Trends' },
    quality: { name: 'Qualität', description: 'FCF, Stabilität' },
    safety: { name: 'Sicherheit', description: 'Verschuldung, Liquidität' }
  }

  // Loading State
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-theme-secondary rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-64 bg-theme-secondary rounded-xl"></div>
            <div className="lg:col-span-2 h-64 bg-theme-secondary rounded-xl"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 bg-theme-secondary rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error || !scores) {
    return (
      <div className="p-6">
        <div className="bg-theme-card rounded-xl border border-theme/10 p-12 text-center">
          <div className="w-16 h-16 bg-negative/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircleIcon className="w-8 h-8 text-negative" />
          </div>
          <h3 className="text-lg font-semibold text-theme-primary mb-2">Fehler beim Laden</h3>
          <p className="text-theme-muted text-sm">{error || 'Keine Daten verfügbar'}</p>
        </div>
      </div>
    )
  }

  const { grade, label } = getGrade(scores.finclueScore)
  
  // Trend berechnen
  const scoreTrend = scores.historicalScores && scores.historicalScores.length >= 2
    ? scores.finclueScore - scores.historicalScores[scores.historicalScores.length - 2].score
    : 0

  return (
    <div className="p-6 space-y-6">
      
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Rating & Bewertung</h1>
        <p className="text-theme-muted text-sm mt-1">Quantitative Analyse basierend auf Fundamentaldaten</p>
      </div>

      {/* ===== MAIN SCORE + HISTORY ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Score Card */}
        <div className="bg-theme-card rounded-xl border border-theme/10 p-6">
          <div className="text-center">
            <p className="text-sm text-theme-muted mb-4">FinClue Score</p>
            
            {/* Score Circle */}
            <div className="relative w-36 h-36 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-theme-secondary"
                />
                {/* Progress Circle */}
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="text-brand"
                  strokeDasharray={`${(scores.finclueScore / 100) * 402} 402`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-theme-primary">{scores.finclueScore}</span>
                <span className="text-xs text-theme-muted">von 100</span>
              </div>
            </div>

            {/* Grade Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-theme-secondary rounded-lg">
              <span className="text-lg font-bold text-theme-primary">{grade}</span>
              <span className="text-sm text-theme-muted">• {label}</span>
            </div>

            {/* Trend */}
            {scoreTrend !== 0 && (
              <div className={`flex items-center justify-center gap-1 mt-4 text-sm ${
                scoreTrend > 0 ? 'text-positive' : 'text-negative'
              }`}>
                {scoreTrend > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                )}
                <span>{scoreTrend > 0 ? '+' : ''}{scoreTrend.toFixed(1)} vs. Vorquartal</span>
              </div>
            )}
          </div>
        </div>

        {/* Score History Chart */}
        <div className="lg:col-span-2 bg-theme-card rounded-xl border border-theme/10 p-6">
          <h3 className="text-sm font-semibold text-theme-primary mb-4">Score-Verlauf</h3>
          
          {scores.historicalScores && scores.historicalScores.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scores.historicalScores}>
                  <XAxis 
                    dataKey="period" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value} Punkte`, 'Score']}
                  />
                  <ReferenceLine y={50} stroke="var(--color-text-muted)" strokeDasharray="3 3" opacity={0.3} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--color-brand)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-brand)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: 'var(--color-brand)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-theme-muted text-sm">Keine historischen Daten verfügbar</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== FACTOR BREAKDOWN ===== */}
      {scores.breakdown && Object.keys(scores.breakdown).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Faktor-Analyse</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(scores.breakdown).map(([key, factor]) => {
              const factorInfo = factorLabels[key] || { name: key, description: '' }
              const factorGrade = getGrade(factor.score)
              
              return (
                <div 
                  key={key} 
                  className="bg-theme-card rounded-xl border border-theme/10 p-5 hover:border-theme/20 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-theme-primary text-sm">{factorInfo.name}</h4>
                      <p className="text-xs text-theme-muted mt-0.5">{factorInfo.description}</p>
                    </div>
                    <span className="text-xs text-theme-muted bg-theme-secondary px-2 py-0.5 rounded">
                      {(factor.weight * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Score Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl font-bold text-theme-primary">{factor.score}</span>
                      <span className="text-sm font-medium text-theme-secondary">{factorGrade.grade}</span>
                    </div>
                    <div className="h-1.5 bg-theme-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Preview */}
                  {factor.metrics && (
                    <div className="space-y-1">
                      {Object.entries(factor.metrics).slice(0, 3).map(([metricKey, value]) => (
                        <div key={metricKey} className="flex items-center justify-between text-xs">
                          <span className="text-theme-muted capitalize">
                            {metricKey.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-theme-primary font-medium">
                            {typeof value === 'number' 
                              ? value < 1 && value > -1 
                                ? `${(value * 100).toFixed(1)}%`
                                : value.toFixed(2)
                              : String(value)
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== COMPARISON SCORES (Altman & Piotroski) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Altman Z-Score */}
        <div className="bg-theme-card rounded-xl border border-theme/10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-theme-primary">Altman Z-Score</h3>
              <p className="text-xs text-theme-muted mt-0.5">Insolvenzrisiko-Indikator</p>
            </div>
            <InformationCircleIcon className="w-5 h-5 text-theme-muted" />
          </div>

          {scores.altmanZScore !== null ? (
            <>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-bold text-theme-primary">
                  {scores.altmanZScore.toFixed(2)}
                </span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  scores.altmanZScore > 2.99 
                    ? 'bg-positive/10 text-positive' 
                    : scores.altmanZScore > 1.81 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-negative/10 text-negative'
                }`}>
                  {scores.altmanZScore > 2.99 ? 'Sicher' : scores.altmanZScore > 1.81 ? 'Grauzone' : 'Risiko'}
                </span>
              </div>

              {/* Scale */}
              <div className="relative h-2 bg-theme-secondary rounded-full mb-2">
                <div className="absolute left-0 h-full w-1/3 bg-negative/30 rounded-l-full"></div>
                <div className="absolute left-1/3 h-full w-1/3 bg-amber-500/30"></div>
                <div className="absolute right-0 h-full w-1/3 bg-positive/30 rounded-r-full"></div>
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-theme-primary rounded-full border-2 border-brand"
                  style={{ 
                    left: `${Math.min(Math.max((scores.altmanZScore / 5) * 100, 0), 100)}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-theme-muted">
                <span>&lt; 1.81</span>
                <span>1.81 - 2.99</span>
                <span>&gt; 2.99</span>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-theme-muted text-sm">Keine Daten verfügbar</p>
            </div>
          )}
        </div>

        {/* Piotroski F-Score */}
        <div className="bg-theme-card rounded-xl border border-theme/10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-theme-primary">Piotroski F-Score</h3>
              <p className="text-xs text-theme-muted mt-0.5">Fundamentale Stärke (0-9)</p>
            </div>
            <InformationCircleIcon className="w-5 h-5 text-theme-muted" />
          </div>

          {scores.piotroskiScore !== null ? (
            <>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-bold text-theme-primary">
                  {scores.piotroskiScore}
                </span>
                <span className="text-lg text-theme-muted">/ 9</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  scores.piotroskiScore >= 7 
                    ? 'bg-positive/10 text-positive' 
                    : scores.piotroskiScore >= 4 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-negative/10 text-negative'
                }`}>
                  {scores.piotroskiScore >= 7 ? 'Stark' : scores.piotroskiScore >= 4 ? 'Neutral' : 'Schwach'}
                </span>
              </div>

              {/* Dots */}
              <div className="flex gap-1.5 mb-2">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      i < scores.piotroskiScore!
                        ? scores.piotroskiScore! >= 7 
                          ? 'bg-positive' 
                          : scores.piotroskiScore! >= 4 
                            ? 'bg-amber-500' 
                            : 'bg-negative'
                        : 'bg-theme-secondary'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-theme-muted">
                <span>Schwach</span>
                <span>Neutral</span>
                <span>Stark</span>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-theme-muted text-sm">Keine Daten verfügbar</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== INFO SECTION ===== */}
      <div className="bg-theme-secondary/30 rounded-xl border border-theme/10 p-6">
        <div className="flex items-start gap-4">
          <InformationCircleIcon className="w-5 h-5 text-theme-muted flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-theme-primary mb-2">Über die Bewertungen</h3>
            <p className="text-sm text-theme-muted leading-relaxed mb-4">
              Der FinClue Score kombiniert verschiedene fundamentale Kennzahlen zu einem 
              ganzheitlichen Score von 0-100 Punkten. Jeder Faktor wird individuell bewertet 
              und entsprechend seiner Relevanz gewichtet.
            </p>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'Profitabilität', weight: '25%', color: 'bg-positive' },
                { name: 'Wachstum', weight: '20%', color: 'bg-brand' },
                { name: 'Bewertung', weight: '20%', color: 'bg-purple-500' },
                { name: 'Momentum', weight: '15%', color: 'bg-amber-500' },
                { name: 'Qualität', weight: '10%', color: 'bg-theme-muted' },
                { name: 'Sicherheit', weight: '10%', color: 'bg-cyan-500' }
              ].map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                  <span className="text-xs text-theme-secondary">
                    {item.name} ({item.weight})
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-theme-muted mt-4">
              Scores werden quartalsweise auf Basis der neuesten Geschäftsdaten aktualisiert.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}