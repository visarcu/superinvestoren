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
import RatingHero from './RatingsPage/RatingHero'
import FactorGrid from './RatingsPage/FactorGrid'
import ComparisonCards from './RatingsPage/ComparisonCards'

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
    if (score >= 80) return { color: 'text-brand-light', bg: 'bg-brand/10', grade: 'A' }
    if (score >= 60) return { color: 'text-blue-400', bg: 'bg-blue-500/10', grade: 'B' }
    if (score >= 40) return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', grade: 'C' }
    if (score >= 20) return { color: 'text-orange-400', bg: 'bg-orange-500/10', grade: 'D' }
    return { color: 'text-red-400', bg: 'bg-red-500/10', grade: 'F' }
  }

  const mainScore = getScoreIndicator(scores.finclueScore)

  return (
    <div className="w-full p-6 space-y-8">
      
      {/* Modern Rating Hero - Terminal Style */}
      <RatingHero 
        ticker={ticker}
        finclueScore={scores.finclueScore}
        scoreTrend={scoreTrend}
        historicalScores={scores.historicalScores}
      />

      {/* Factor Grid - Modern Cards but Terminal Colors */}
      {scores.breakdown && Object.keys(scores.breakdown).length > 0 && (
        <FactorGrid breakdown={scores.breakdown} />
      )}

      {/* Comparison Cards - Altman & Piotroski */}
      <ComparisonCards 
        altmanZScore={scores.altmanZScore}
        piotroskiScore={scores.piotroskiScore}
      />

      {/* Info Section - Terminal Style */}
      <div className="bg-theme-card/50 rounded-lg border border-theme/30 p-6">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-theme-secondary mt-0.5 flex-shrink-0" />
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-theme-primary mb-2">
                Über die FinClue Bewertung
              </h3>
              <p className="text-theme-muted leading-relaxed">
                Die FinClue-Bewertung kombiniert verschiedene fundamentale Kennzahlen zu einem 
                ganzheitlichen Score von 0-100 Punkten. Jeder Faktor wird individuell bewertet und 
                entsprechend seiner Relevanz gewichtet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-theme-card rounded-lg p-3 border border-theme/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="font-semibold text-theme-primary text-sm">Profitabilität (25%)</span>
                </div>
                <p className="text-xs text-theme-muted">
                  ROE, Nettogewinnmarge, Operative Marge
                </p>
              </div>

              <div className="bg-theme-card rounded-lg p-3 border border-theme/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="font-semibold text-theme-primary text-sm">Wachstum (20%)</span>
                </div>
                <p className="text-xs text-theme-muted">
                  Umsatz- und Gewinnwachstum, Expansion
                </p>
              </div>

              <div className="bg-theme-card rounded-lg p-3 border border-theme/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="font-semibold text-theme-primary text-sm">Bewertung (20%)</span>
                </div>
                <p className="text-xs text-theme-muted">
                  KGV, KBV, PEG im Branchenvergleich
                </p>
              </div>

              <div className="bg-theme-card rounded-lg p-3 border border-theme/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="font-semibold text-theme-primary text-sm">Momentum (15%)</span>
                </div>
                <p className="text-xs text-theme-muted">
                  Kursentwicklung, Volumen-Trends
                </p>
              </div>

              <div className="bg-theme-card rounded-lg p-3 border border-theme/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="font-semibold text-theme-primary text-sm">Qualität (10%)</span>
                </div>
                <p className="text-xs text-theme-muted">
                  ROA, Free Cash Flow, Dividendenstabilität
                </p>
              </div>

              <div className="bg-theme-card rounded-lg p-3 border border-theme/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="font-semibold text-theme-primary text-sm">Sicherheit (10%)</span>
                </div>
                <p className="text-xs text-theme-muted">
                  Liquidität, Verschuldungsgrad, Stabilität
                </p>
              </div>
            </div>

            <p className="text-sm text-theme-muted">
              <strong>Aktualisierung:</strong> Scores werden quartalsweise auf Basis der neuesten Geschäftsdaten berechnet. 
              Alle Bewertungen sind automatisiert und objektiv basierend auf quantitativen Metriken.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}