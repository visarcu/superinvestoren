// src/components/RatingsClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-theme-secondary">Lade Bewertungen...</p>
        </div>
      </div>
    )
  }

  if (error || !scores) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 font-medium">Fehler beim Laden der Bewertungen</p>
          <p className="text-theme-muted text-sm mt-1">{error || 'Keine Daten verfügbar'}</p>
        </div>
      </div>
    )
  }

  // Berechne Trend aus historischen Daten
  const scoreTrend = scores.historicalScores && scores.historicalScores.length >= 2
    ? scores.finclueScore - scores.historicalScores[scores.historicalScores.length - 2].score
    : 0

  const getGradeColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-emerald-400'
    if (score >= 40) return 'text-yellow-400'
    if (score >= 20) return 'text-orange-400'
    return 'text-red-400'
  }

  const getGrade = (score: number) => {
    if (score >= 80) return 'A'
    if (score >= 60) return 'B'
    if (score >= 40) return 'C'
    if (score >= 20) return 'D'
    return 'F'
  }

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Overall Score Section */}
      <div className="bg-theme-card rounded-xl p-6 mb-6 border border-theme">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-theme-primary">FinClue Rating für {ticker}</h2>
          <div className="text-xs text-theme-muted">
            Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Score */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${getGradeColor(scores.finclueScore)}`}>
              {getGrade(scores.finclueScore)}
            </div>
            <div className="text-theme-secondary mt-2">Gesamtbewertung</div>
            <div className="text-2xl font-semibold text-theme-primary mt-1">
              {scores.finclueScore}/100
            </div>
          </div>
          
          {/* Score Trend */}
          <div className="flex items-center justify-center">
            <div className="space-y-2">
              <div className="text-sm text-theme-muted">Quartalstrend</div>
              <div className="flex items-center gap-2">
                {scoreTrend >= 0 ? (
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-2xl font-semibold ${scoreTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}
                </span>
              </div>
              <div className="text-xs text-theme-muted">
                {scoreTrend >= 0 ? 'Verbesserung' : 'Verschlechterung'}
              </div>
            </div>
          </div>
          
          {/* Historical Scores */}
          <div className="flex items-center justify-center">
            <div className="space-y-2">
              <div className="text-sm text-theme-muted">Historisch</div>
              {scores.historicalScores?.slice(-3).map((hist, idx) => (
                <div key={idx} className="flex justify-between gap-4 text-xs">
                  <span className="text-theme-muted">{hist.period}</span>
                  <span className="text-theme-primary font-medium">{hist.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Factor Breakdown mit echten Metriken */}
      {scores.breakdown && (
        <div className="bg-theme-card rounded-xl p-6 mb-6 border border-theme">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Faktor-Aufschlüsselung</h3>
          <div className="space-y-4">
            {Object.entries(scores.breakdown).map(([key, data]) => (
              <div key={key}>
                <div className="flex items-center gap-4 mb-1">
                  <div className="w-32 text-sm text-theme-secondary capitalize">
                    {key === 'profitability' ? 'Profitabilität' :
                     key === 'growth' ? 'Wachstum' :
                     key === 'valuation' ? 'Bewertung' :
                     key === 'momentum' ? 'Momentum' :
                     key === 'safety' ? 'Sicherheit' :
                     key === 'quality' ? 'Qualität' : key}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-theme-tertiary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(data.score)}`}
                          style={{ width: `${data.score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${getGradeColor(data.score)} w-8`}>
                        {getGrade(data.score)}
                      </span>
                      <span className="text-xs text-theme-muted w-12">
                        {data.weight}%
                      </span>
                    </div>
                  </div>
                </div>
                {/* Verbesserte Metrik-Anzeige */}
                {data.metrics && (
                  <div className="ml-36 text-xs text-theme-muted flex gap-3">
                    {Object.entries(data.metrics)
                      .filter(([_, value]) => isValidNumber(value))
                      .slice(0, 3)
                      .map(([metric, value]: [string, any]) => (
                        <span key={metric} className="flex items-center gap-1">
                          <span className="text-theme-secondary">{getMetricLabel(metric)}:</span>
                          <span className="font-medium text-theme-primary">
                            {formatMetricValue(metric, value)}
                          </span>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traditional Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Altman Z-Score */}
        {isValidNumber(scores.altmanZScore) && (
          <div className="bg-theme-card rounded-xl p-6 border border-theme">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Altman Z-Score</h3>
            <div className="flex items-center justify-between mb-4">
              <div className={`text-3xl font-bold ${
                scores.altmanZScore > 3 ? 'text-green-400' : 
                scores.altmanZScore > 1.8 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {scores.altmanZScore.toFixed(2)}
              </div>
              <div className="text-sm text-theme-muted">Insolvenz-Risiko</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-theme-muted">&gt; 3.0</span>
                <span className="text-green-400">Sicher</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">1.8 - 3.0</span>
                <span className="text-yellow-400">Grauzone</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">&lt; 1.8</span>
                <span className="text-red-400">Gefährdet</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-theme-tertiary/30 rounded-lg">
              <p className="text-xs text-theme-muted">
                Der Altman Z-Score misst die Wahrscheinlichkeit einer Insolvenz 
                innerhalb der nächsten 2 Jahre basierend auf 5 finanziellen Kennzahlen.
              </p>
            </div>
          </div>
        )}

        {/* Piotroski F-Score */}
        {isValidNumber(scores.piotroskiScore) && (
          <div className="bg-theme-card rounded-xl p-6 border border-theme">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Piotroski F-Score</h3>
            <div className="flex items-center justify-between mb-4">
              <div className={`text-3xl font-bold ${
                scores.piotroskiScore >= 8 ? 'text-green-400' : 
                scores.piotroskiScore >= 6 ? 'text-emerald-400' : 
                scores.piotroskiScore >= 4 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {scores.piotroskiScore}/9
              </div>
              <div className="text-sm text-theme-muted">Fundamentalstärke</div>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-8 rounded transition-all duration-300 ${
                    i < scores.piotroskiScore! ? 'bg-emerald-500' : 'bg-theme-tertiary'
                  }`}
                />
              ))}
            </div>
            <div className="space-y-1 text-xs text-theme-muted">
              <div className="flex justify-between">
                <span>8-9 Punkte</span>
                <span className="text-green-400">Sehr stark</span>
              </div>
              <div className="flex justify-between">
                <span>6-7 Punkte</span>
                <span className="text-emerald-400">Stark</span>
              </div>
              <div className="flex justify-between">
                <span>3-5 Punkte</span>
                <span className="text-yellow-400">Durchschnitt</span>
              </div>
              <div className="flex justify-between">
                <span>0-2 Punkte</span>
                <span className="text-red-400">Schwach</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-theme-tertiary/30 rounded-lg">
              <p className="text-xs text-theme-muted">
                Prüft 9 fundamentale Kriterien aus Profitabilität, Liquidität und Effizienz.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Score History Chart */}
      {scores.historicalScores && scores.historicalScores.length > 0 && (
        <div className="bg-theme-card rounded-xl p-6 mt-6 border border-theme">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Score-Verlauf</h3>
          <div className="space-y-3">
            {scores.historicalScores.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="text-sm text-theme-muted w-24">{item.period}</div>
                <div className="flex-1">
                  <div className="bg-theme-tertiary rounded-full h-6">
                    <div 
                      className={`h-6 rounded-full flex items-center justify-end pr-2 text-xs font-medium text-white ${getProgressColor(item.score)}`}
                      style={{ width: `${item.score}%` }}
                    >
                      {item.score}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium w-8 ${getGradeColor(item.score)}`}>
                  {getGrade(item.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-theme-card/50 rounded-xl p-6 mt-6 border border-theme/50">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-theme-muted mt-0.5 flex-shrink-0" />
          <div className="text-sm text-theme-muted">
            <p className="font-medium text-theme-secondary mb-2">Über die FinClue Bewertung</p>
            <p>
              Die FinClue-Bewertung kombiniert verschiedene fundamentale Kennzahlen zu einem 
              ganzheitlichen Score von 0-100. Die Bewertung berücksichtigt:
            </p>
            <ul className="mt-2 space-y-1">
              <li>• <strong>Profitabilität (25%):</strong> ROE, Nettogewinnmarge</li>
              <li>• <strong>Wachstum (20%):</strong> Umsatz- und Gewinnwachstum</li>
              <li>• <strong>Bewertung (20%):</strong> KGV im Branchenvergleich</li>
              <li>• <strong>Momentum (15%):</strong> Aktuelle Kursentwicklung</li>
              <li>• <strong>Sicherheit (10%):</strong> Liquidität und Verschuldung</li>
              <li>• <strong>Qualität (10%):</strong> ROA und Free Cash Flow</li>
            </ul>
            <p className="mt-2">
              Die Scores werden quartalsweise aktualisiert. Ein Score über 80 (Grade A) 
              gilt als exzellent, über 60 (Grade B) als gut.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}