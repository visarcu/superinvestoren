// src/components/CompanyEfficiencyMetrics.tsx - MIT LEARN TOOLTIPS BASIEREND AUF DEINEM CODE
'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from 'recharts'
import { ArrowsPointingOutIcon, LockClosedIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid'
import { LearnTooltipButton } from '@/components/LearnSidebar'

interface CompanyEfficiencyMetricsProps {
  ticker: string
  isPremium?: boolean
}

interface EfficiencyData {
  historicalMetrics: Array<{
    year: string
    roaPercent: number
    roePercent: number
    assetTurnover: number
    revenuePerEmployee: number | null
    operatingMargin: number
    netMargin: number
    debtToEquity: number
    currentRatio: number
  }>
  currentMetrics: {
    roa: number
    roe: number
    assetTurnover: number
    revenuePerEmployee: number | null
    efficiency: 'excellent' | 'good' | 'fair' | 'poor'
    trend: 'improving' | 'declining' | 'stable'
  }
  companyName: string
  dataQuality: 'excellent' | 'good' | 'fair' | 'limited'
}

export default function CompanyEfficiencyMetrics({ ticker, isPremium = false }: CompanyEfficiencyMetricsProps) {
  const [data, setData] = useState<EfficiencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'roa' | 'roe' | 'margins'>('roa')

  useEffect(() => {
    async function loadEfficiencyData() {
      if (!ticker) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/company-efficiency/${ticker}`)
        if (response.ok) {
          const result = await response.json()
          setData(result.data)
        } else {
          console.error('Failed to load efficiency data')
          setData(null)
        }
      } catch (error) {
        console.error('Efficiency data error:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    loadEfficiencyData()
  }, [ticker])

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  const formatRatio = (value: number): string => {
    return value.toFixed(2)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowTrendingUpIcon className="w-3 h-3 text-green-400" />
      case 'declining':
        return <ArrowTrendingDownIcon className="w-3 h-3 text-red-400" />
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-blue-400'
      case 'fair': return 'text-yellow-400'
      default: return 'text-red-400'
    }
  }

  const getChartData = () => {
    if (!data) return []
    
    switch (selectedMetric) {
      case 'roa':
        return data.historicalMetrics.map(m => ({ 
          year: m.year, 
          value: m.roaPercent,
          name: 'ROA'
        }))
      case 'roe':
        return data.historicalMetrics.map(m => ({ 
          year: m.year, 
          value: m.roePercent,
          name: 'ROE'
        }))
      case 'margins':
        return data.historicalMetrics.map(m => ({ 
          year: m.year, 
          operating: m.operatingMargin,
          net: m.netMargin
        }))
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Unternehmenseffizienz</h3>
        </div>
        <div className="h-48 bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  if (!data || !isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        {!isPremium && (
          <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <LockClosedIcon className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs text-theme-secondary font-medium">Premium</p>
            </div>
          </div>
        )}
        
        <div className={!isPremium ? "opacity-30" : ""}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-theme-primary">Unternehmenseffizienz</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
            </button>
          </div>
          <div className="h-48 bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  const chartData = getChartData()

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">Unternehmenseffizienz</h3>
          {getTrendIcon(data.currentMetrics.trend)}
        </div>
        <button 
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      {/* Current Key Metrics MIT LEARN TOOLTIPS */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="bg-theme-tertiary rounded-lg p-3">
          <div className="text-xs text-theme-secondary mb-1 flex items-center gap-1">
            <span>ROA (Return on Assets)</span>
            <LearnTooltipButton term="ROA" />
          </div>
          <div className="text-sm font-semibold text-theme-primary">
            {formatPercent(data.currentMetrics.roa)}
          </div>
        </div>
        
        <div className="bg-theme-tertiary rounded-lg p-3">
          <div className="text-xs text-theme-secondary mb-1 flex items-center gap-1">
            <span>ROE (Return on Equity)</span>
            <LearnTooltipButton term="ROE" />
          </div>
          <div className="text-sm font-semibold text-theme-primary">
            {formatPercent(data.currentMetrics.roe)}
          </div>
        </div>
        
        <div className="bg-theme-tertiary rounded-lg p-3">
          <div className="text-xs text-theme-secondary mb-1 flex items-center gap-1">
            <span>Asset Turnover</span>
            <LearnTooltipButton term="Asset Turnover" />
          </div>
          <div className="text-sm font-semibold text-theme-primary">
            {formatRatio(data.currentMetrics.assetTurnover)}x
          </div>
        </div>
        
        <div className="bg-theme-tertiary rounded-lg p-3">
          <div className="text-xs text-theme-secondary mb-1">Effizienz-Score</div>
          <div className={`text-sm font-semibold ${getEfficiencyColor(data.currentMetrics.efficiency)}`}>
            {data.currentMetrics.efficiency === 'excellent' ? 'Exzellent' :
             data.currentMetrics.efficiency === 'good' ? 'Gut' :
             data.currentMetrics.efficiency === 'fair' ? 'Ausreichend' : 'Schwach'}
          </div>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="mb-3">
        <div className="flex gap-1 bg-theme-tertiary rounded-lg p-1">
          {[
            { key: 'roa' as const, label: 'ROA' },
            { key: 'roe' as const, label: 'ROE' },
            { key: 'margins' as const, label: 'Margen' }
          ].map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedMetric === metric.key
                  ? 'bg-theme-card text-theme-primary font-medium'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          {selectedMetric === 'margins' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
              <XAxis 
                dataKey="year" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                height={15}
              />
              <YAxis hide />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null
                  
                  return (
                    <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme-border">
                      <p className="text-theme-secondary text-xs mb-1">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-theme-primary text-xs">
                          <span style={{ color: entry.color }}>{entry.name}:</span> {formatPercent(entry.value as number)}
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Line 
                type="monotone" 
                dataKey="operating" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={false}
                name="Operating Margin"
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
                name="Net Margin"
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
              <XAxis 
                dataKey="year" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                height={15}
              />
              <YAxis hide />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.[0]) return null
                  const value = payload[0].value as number
                  
                  return (
                    <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme-border">
                      <p className="text-theme-secondary text-xs mb-1">{label}</p>
                      <p className="text-theme-primary text-sm font-medium">
                        {selectedMetric.toUpperCase()}: {formatPercent(value)}
                      </p>
                    </div>
                  )
                }}
              />
              <Area 
                dataKey="value" 
                fill={selectedMetric === 'roa' ? '#8B5CF6' : '#EF4444'}
                fillOpacity={0.2}
                stroke={selectedMetric === 'roa' ? '#8B5CF6' : '#EF4444'}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {/* Data Quality Indicator */}
      <div className="mt-2 flex items-center justify-between">
        <div className={`text-xs flex items-center gap-1 ${
          data.dataQuality === 'excellent' ? 'text-green-400' :
          data.dataQuality === 'good' ? 'text-blue-400' :
          data.dataQuality === 'fair' ? 'text-yellow-400' :
          'text-theme-muted'
        }`}>
          <div className={`w-1 h-1 rounded-full ${
            data.dataQuality === 'excellent' ? 'bg-green-400' :
            data.dataQuality === 'good' ? 'bg-blue-400' :
            data.dataQuality === 'fair' ? 'bg-yellow-400' :
            'bg-theme-muted'
          }`}></div>
          <span>
            {data.dataQuality === 'excellent' ? 'Exzellente Daten' :
             data.dataQuality === 'good' ? 'Gute Daten' :
             data.dataQuality === 'fair' ? 'Ausreichende Daten' :
             'Begrenzte Daten'}
          </span>
        </div>
        
        <div className="text-xs text-green-400 flex items-center gap-1">
          <div className="w-1 h-1 bg-green-400 rounded-full"></div>
          <span>Berechnete Kennzahlen</span>
        </div>
      </div>
    </div>
  )
}