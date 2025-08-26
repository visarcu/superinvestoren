// src/components/RatingsClient.tsx - CLEAN TERMINAL DESIGN
'use client'

import React, { useState, useEffect } from 'react'
import { 
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

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

  // Hilfsfunktion für sichere Nummer-Überprüfung
  const isValidNumber = (value: any): value is number => {
    return value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)
  }

  // Formatierung der Metrik-Werte
  const formatMetricValue = (metric: string, value: any): string => {
    if (!isValidNumber(value)) return ''
    
    const percentMetrics = ['roe', 'netMargin', 'grossMargin', 'revenueGrowth', 
                           'epsGrowth', 'priceChange', 'operatingMargin', 'roa']
    const ratioMetrics = ['pe', 'pb', 'peg', 'currentRatio', 'debtToEquity', 'quickRatio']
    
    if (percentMetrics.includes(metric)) {
      return `${(value * 100).toFixed(1)}%`
    }
    
    if (ratioMetrics.includes(metric)) {
      return value.toFixed(2) + 'x'
    }
    
    if (metric === 'fcf') {
      if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(1)}B`
      }
      return `$${value.toFixed(0)}M`
    }
    
    if (metric === 'volume' || metric === 'avgVolume') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      }
      return value.toLocaleString()
    }
    
    return value.toFixed(2)
  }

  const getMetricLabel = (metric: string): string => {
    const labels: Record<string, string> = {
      roe: 'ROE',
      netMargin: 'Nettomarge',
      grossMargin: 'Bruttomarge',
      revenueGrowth: 'Umsatzwachstum',
      epsGrowth: 'EPS-Wachstum',
      pe: 'KGV',
      pb: 'KBV',
      peg: 'PEG',
      priceChange: 'Kursänderung',
      volume: 'Volumen',
      avgVolume: 'Ø Volumen',
      currentRatio: 'Current Ratio',
      debtToEquity: 'Verschuldung',
      quickRatio: 'Quick Ratio',
      roa: 'ROA',
      fcf: 'Free Cash Flow',
      operatingMargin: 'Op. Marge'
    }
    return labels[metric] || metric
  }

  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await fetch(`/api/scores/${ticker}`)
        if (!response.ok) {
          throw new Error('Failed to fetch scores')
        }
        const data = await response.json()
        setScores(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching scores:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary">Bewertungen & Scores</h3>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-theme-secondary text-sm">Lade Bewertungen...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !scores) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary">Bewertungen & Scores</h3>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 mb-2 text-sm font-medium">Fehler beim Laden der Bewertungen</p>
            <p className="text-theme-muted text-xs">{error || 'Keine Daten verfügbar'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Berechne Trend aus historischen Daten
  const scoreTrend = scores.historicalScores && scores.historicalScores.length >= 2
    ? scores.finclueScore - scores.historicalScores[scores.historicalScores.length - 2].score
    : 0

  // Subtile Farben für cleanes Design
  const getScoreIndicator = (score: number) => {
    if (score >= 80) return { color: 'text-green-400', bg: 'bg-green-500/10', grade: 'A' }
    if (score >= 60) return { color: 'text-blue-400', bg: 'bg-blue-500/10', grade: 'B' }
    if (score >= 40) return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', grade: 'C' }
    if (score >= 20) return { color: 'text-orange-400', bg: 'bg-orange-500/10', grade: 'D' }
    return { color: 'text-red-400', bg: 'bg-red-500/10', grade: 'F' }
  }

  const mainScore = getScoreIndicator(scores.finclueScore)

  return (
    <div className="max-w-11xl mx-auto p-6 space-y-6">
      {/* Header Card - FinClue Rating */}
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-theme-primary">FinClue Rating</h3>
              <p className="text-theme-muted text-sm">Ganzheitliche Fundamentalanalyse</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-theme-muted">Aktuell</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Score */}
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${mainScore.bg} mb-3`}>
                <span className={`text-3xl font-bold ${mainScore.color}`}>
                  {mainScore.grade}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-theme-primary">
                  {scores.finclueScore}/100
                </div>
                <div className="text-theme-secondary text-sm">Gesamtbewertung</div>
              </div>
            </div>
            
            {/* Trend */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <div className={`p-3 rounded-full ${scoreTrend >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {scoreTrend >= 0 ? (
                    <ArrowTrendingUpIcon className={`w-6 h-6 ${scoreTrend >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  ) : (
                    <ArrowTrendingDownIcon className={`w-6 h-6 ${scoreTrend >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className={`text-lg font-semibold ${scoreTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}
                </div>
                <div className="text-theme-secondary text-sm">Quartalstrend</div>
              </div>
            </div>
            
            {/* History Preview */}
            <div className="space-y-3">
              <div className="text-sm text-theme-secondary mb-3">Letzte Quartale</div>
              {scores.historicalScores?.slice(-3).map((hist, idx) => {
                const histIndicator = getScoreIndicator(hist.score)
                return (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-theme-muted text-sm">{hist.period}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-theme-primary text-sm font-medium">{hist.score}</span>
                      <span className={`text-xs font-medium ${histIndicator.color}`}>
                        {histIndicator.grade}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      {scores.breakdown && (
        <div className="bg-theme-card rounded-lg">
          <div className="px-6 py-4 border-b border-theme/10">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-theme-secondary" />
              <h3 className="text-lg font-bold text-theme-primary">Faktor-Aufschlüsselung</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(scores.breakdown).map(([key, data]) => {
                const indicator = getScoreIndicator(data.score)
                const factorName = {
                  profitability: 'Profitabilität',
                  growth: 'Wachstum', 
                  valuation: 'Bewertung',
                  momentum: 'Momentum',
                  safety: 'Sicherheit',
                  quality: 'Qualität'
                }[key] || key

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-theme-primary font-medium">{factorName}</span>
                        <span className="text-xs text-theme-muted">({data.weight}% Gewichtung)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-theme-primary text-sm font-medium">{data.score}</span>
                        <span className={`text-sm font-medium ${indicator.color}`}>
                          {indicator.grade}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-theme-tertiary rounded-full h-2">
                      <div 
                        className="bg-theme-accent rounded-full h-2 transition-all duration-300"
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                    
                    {/* Key Metrics */}
                    {data.metrics && (
                      <div className="flex gap-4 text-xs">
                        {Object.entries(data.metrics)
                          .filter(([_, value]) => isValidNumber(value))
                          .slice(0, 3)
                          .map(([metric, value]: [string, any]) => (
                            <div key={metric} className="flex items-center gap-1">
                              <span className="text-theme-muted">{getMetricLabel(metric)}:</span>
                              <span className="text-theme-secondary font-medium">
                                {formatMetricValue(metric, value)}
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
        </div>
      )}

      {/* Traditional Scores Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Altman Z-Score */}
        {isValidNumber(scores.altmanZScore) && (
          <div className="bg-theme-card rounded-lg">
            <div className="px-6 py-4 border-b border-theme/10">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-theme-secondary" />
                <h3 className="text-lg font-bold text-theme-primary">Altman Z-Score</h3>
              </div>
              <p className="text-theme-muted text-sm">Insolvenzrisiko-Bewertung</p>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`text-4xl font-bold mb-2 ${
                  scores.altmanZScore > 3 ? 'text-green-400' : 
                  scores.altmanZScore > 1.8 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {scores.altmanZScore.toFixed(2)}
                </div>
                <div className="text-theme-secondary text-sm">
                  {scores.altmanZScore > 3 ? 'Sicher' : 
                   scores.altmanZScore > 1.8 ? 'Grauzone' : 'Risiko'}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-theme-muted">&gt; 3.0</span>
                  <span className="text-green-400">Sicher</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-muted">1.8 - 3.0</span>
                  <span className="text-yellow-400">Grauzone</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-muted">&lt; 1.8</span>
                  <span className="text-red-400">Gefährdet</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Piotroski F-Score */}
        {isValidNumber(scores.piotroskiScore) && (
          <div className="bg-theme-card rounded-lg">
            <div className="px-6 py-4 border-b border-theme/10">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-theme-secondary" />
                <h3 className="text-lg font-bold text-theme-primary">Piotroski F-Score</h3>
              </div>
              <p className="text-theme-muted text-sm">Fundamentalstärke-Indikator</p>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`text-4xl font-bold mb-2 ${
                  scores.piotroskiScore >= 8 ? 'text-green-400' : 
                  scores.piotroskiScore >= 6 ? 'text-blue-400' : 
                  scores.piotroskiScore >= 4 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {scores.piotroskiScore}/9
                </div>
                <div className="text-theme-secondary text-sm">
                  {scores.piotroskiScore >= 8 ? 'Sehr stark' : 
                   scores.piotroskiScore >= 6 ? 'Stark' : 
                   scores.piotroskiScore >= 4 ? 'Durchschnitt' : 'Schwach'}
                </div>
              </div>
              
              <div className="grid grid-cols-9 gap-1 mb-4">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i}
                    className={`h-4 rounded transition-all duration-300 ${
                      i < scores.piotroskiScore! ? 'bg-theme-accent' : 'bg-theme-tertiary'
                    }`}
                  />
                ))}
              </div>
              
              <div className="text-xs text-theme-muted">
                Prüft 9 fundamentale Kriterien aus Profitabilität, Liquidität und Effizienz.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Score History */}
      {scores.historicalScores && scores.historicalScores.length > 0 && (
        <div className="bg-theme-card rounded-lg">
          <div className="px-6 py-4 border-b border-theme/10">
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-theme-secondary" />
              <h3 className="text-lg font-bold text-theme-primary">Score-Verlauf</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {scores.historicalScores.map((item, index) => {
                const indicator = getScoreIndicator(item.score)
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="text-sm text-theme-muted w-20">{item.period}</div>
                    <div className="flex-1">
                      <div className="bg-theme-tertiary rounded-full h-3">
                        <div 
                          className="bg-theme-accent rounded-full h-3 transition-all duration-300"
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-theme-primary w-8 text-right">
                        {item.score}
                      </div>
                      <div className={`text-sm font-medium w-6 ${indicator.color}`}>
                        {indicator.grade}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-theme-card/50 rounded-lg border border-theme/30">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-theme-secondary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-theme-muted">
              <p className="font-medium text-theme-secondary mb-2">Über die FinClue Bewertung</p>
              <p className="mb-3">
                Die FinClue-Bewertung kombiniert verschiedene fundamentale Kennzahlen zu einem 
                ganzheitlichen Score von 0-100 Punkten:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div>• <strong>Profitabilität (25%):</strong> ROE, Nettogewinnmarge</div>
                <div>• <strong>Momentum (15%):</strong> Kursentwicklung</div>
                <div>• <strong>Wachstum (20%):</strong> Umsatz- und Gewinnwachstum</div>
                <div>• <strong>Sicherheit (10%):</strong> Liquidität, Verschuldung</div>
                <div>• <strong>Bewertung (20%):</strong> KGV im Branchenvergleich</div>
                <div>• <strong>Qualität (10%):</strong> ROA, Free Cash Flow</div>
              </div>
              <p className="mt-3 text-xs">
                Scores werden quartalsweise aktualisiert. Grade A (80+) = exzellent, Grade B (60+) = gut.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}