// src/components/RatingsPage/FactorCard.tsx
'use client'

import React from 'react'
import ScoreGauge from './ScoreGauge'
import RatingBadge from './RatingBadge'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

interface FactorCardProps {
  factorKey: string
  factorName: string
  score: number
  weight: number
  metrics?: Record<string, any>
  trend?: number
}

export default function FactorCard({ 
  factorKey, 
  factorName, 
  score, 
  weight, 
  metrics = {}, 
  trend = 0 
}: FactorCardProps) {
  
  // Factor icons mapping
  const getFactorIcon = (key: string) => {
    switch (key) {
      case 'profitability':
        return CurrencyDollarIcon
      case 'growth':
        return RocketLaunchIcon
      case 'valuation':
        return ChartBarIcon
      case 'momentum':
        return ArrowTrendingUpIcon
      case 'safety':
        return ShieldCheckIcon
      case 'quality':
        return SparklesIcon
      default:
        return ChartBarIcon
    }
  }

  // Terminal-style minimal theming - no colors, just subtle differences
  const getFactorTheme = () => {
    return {
      bg: 'bg-theme-card',
      border: 'border-theme/10',
      icon: 'text-theme-secondary',
      iconBg: 'bg-theme-tertiary/30'
    }
  }

  // Format metric values
  const formatMetricValue = (metric: string, value: any): string => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) return ''
    
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
    
    return value.toFixed(2)
  }

  // Get metric labels
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
      currentRatio: 'Current Ratio',
      debtToEquity: 'Verschuldung',
      quickRatio: 'Quick Ratio',
      roa: 'ROA',
      fcf: 'Free Cash Flow',
      operatingMargin: 'Op. Marge'
    }
    return labels[metric] || metric.charAt(0).toUpperCase() + metric.slice(1)
  }

  const IconComponent = getFactorIcon(factorKey)
  const theme = getFactorTheme()
  
  // Get top 3 valid metrics
  const validMetrics = Object.entries(metrics)
    .filter(([_, value]) => value !== null && value !== undefined && typeof value === 'number' && !isNaN(value))
    .slice(0, 3)

  return (
    <div className={`
      ${theme.bg}
      border ${theme.border}
      rounded-lg p-6 hover:bg-theme-tertiary/20 transition-all duration-200
    `}>
      {/* Header - Terminal Style */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${theme.iconBg}`}>
            <IconComponent className={`w-4 h-4 ${theme.icon}`} />
          </div>
          <div>
            <h3 className="font-semibold text-theme-primary text-sm">
              {factorName}
            </h3>
            <p className="text-xs text-theme-muted">
              {weight}% Gewichtung
            </p>
          </div>
        </div>
        
        {trend !== 0 && (
          <div className={`text-xs font-mono font-medium ${
            trend > 0 ? 'text-brand-light' : 'text-red-400'
          }`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}
          </div>
        )}
      </div>

      {/* Score Display - Compact */}
      <div className="flex items-center justify-between mb-6">
        <ScoreGauge score={score} size="md" />
        <div className="text-right">
          <div className="text-lg font-mono font-bold text-theme-primary">
            {score}
          </div>
          <div className="text-xs text-theme-muted">
            /100
          </div>
          <RatingBadge score={score} size="sm" className="mt-1" />
        </div>
      </div>

      {/* Key Metrics - Terminal Table Style */}
      {validMetrics.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-theme/10">
          <h4 className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
            Metriken
          </h4>
          {validMetrics.map(([metric, value], idx) => (
            <div key={idx} className="flex items-center justify-between py-1">
              <span className="text-xs text-theme-muted">
                {getMetricLabel(metric)}
              </span>
              <span className="text-xs font-mono font-semibold text-theme-primary">
                {formatMetricValue(metric, value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}