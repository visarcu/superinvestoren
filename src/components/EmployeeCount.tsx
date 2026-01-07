// src/components/EmployeeCount.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ArrowsPointingOutIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid'

interface EmployeeCountProps {
  ticker: string
  isPremium?: boolean
}

interface EmployeeData {
  currentEmployeeCount: number
  historicalData: Array<{
    year: string
    employeeCount: number
    estimated?: boolean
  }>
  employeeGrowth: {
    yearOverYear: number
    cagr: number | null
    trend: 'growing' | 'declining' | 'stable'
  } | null
  companyName: string
  industry: string
  dataQuality: 'good' | 'limited'
}

export default function EmployeeCount({ ticker, isPremium = false }: EmployeeCountProps) {
  const [data, setData] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function loadEmployeeData() {
      if (!ticker) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/employee-count/${ticker}`)
        if (response.ok) {
          const result = await response.json()
          setData(result.data)
        } else {
          console.error('Failed to load employee data')
          setData(null)
        }
      } catch (error) {
        console.error('Employee data error:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    loadEmployeeData()
  }, [ticker])

  const formatEmployeeCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}k`
    }
    return count.toLocaleString()
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing':
        return <ArrowTrendingUpIcon className="w-3 h-3 text-green-400" />
      case 'declining':
        return <ArrowTrendingDownIcon className="w-3 h-3 text-red-400" />
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Mitarbeiteranzahl</h3>
        </div>
        <div className="h-32 bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  // Kein Daten-Fall
  if (!data) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Mitarbeiteranzahl</h3>
        </div>
        <div className="h-32 bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  // Premium Teaser: Zeige aktuelle Zahl + Trend, blur den historischen Chart
  if (!isPremium) {
    const teaserData = data.historicalData.slice(-3) // Letzte 3 Jahre als Teaser

    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-theme-primary">Mitarbeiteranzahl</h3>
            {data.employeeGrowth && getTrendIcon(data.employeeGrowth.trend)}
          </div>
        </div>

        {/* Sichtbarer Teaser: Aktuelle Mitarbeiterzahl */}
        <div className="mb-4">
          <div className="text-lg font-semibold text-theme-primary">
            {formatEmployeeCount(data.currentEmployeeCount)}
          </div>
          {data.employeeGrowth && (
            <div className="flex items-center gap-2 text-xs text-theme-secondary">
              {data.employeeGrowth.yearOverYear > 0 ? '+' : ''}
              {data.employeeGrowth.yearOverYear}% YoY
            </div>
          )}
        </div>

        {/* Teaser-Chart (3 Jahre) + Blur für Rest */}
        <div className="relative">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teaserData} margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                />
                <YAxis hide />
                <Bar dataKey="employeeCount" fill="#F97316" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Premium Overlay für mehr Historie */}
          {data.historicalData.length > 3 && (
            <div className="absolute -right-2 top-0 bottom-0 w-24 bg-gradient-to-l from-theme-card via-theme-card/90 to-transparent flex items-center justify-end pr-2">
              <a
                href="/pricing"
                className="bg-theme-card/95 backdrop-blur-sm rounded-lg px-3 py-2 text-center shadow-lg border border-green-500/20 hover:border-green-500/40 transition-colors"
              >
                <svg className="w-4 h-4 text-green-500 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                </svg>
                <p className="text-theme-primary font-medium text-xs">+{data.historicalData.length - 3}J</p>
                <p className="text-green-500 text-[10px]">Premium</p>
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  const chartData = data.historicalData.slice(-10) // Last 10 years für bessere historische Übersicht

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">Mitarbeiteranzahl</h3>
          {data.employeeGrowth && getTrendIcon(data.employeeGrowth.trend)}
        </div>
        <button 
          onClick={() => setExpanded(true)}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      {/* Current Employee Count */}
      <div className="mb-4">
        <div className="text-lg font-semibold text-theme-primary">
          {formatEmployeeCount(data.currentEmployeeCount)}
        </div>
        {data.employeeGrowth && (
          <div className="flex items-center gap-2 text-xs text-theme-secondary">
            {data.employeeGrowth.yearOverYear > 0 ? '+' : ''}
            {data.employeeGrowth.yearOverYear}% YoY
            {data.employeeGrowth.cagr && (
              <span className="text-theme-muted">
                • {data.employeeGrowth.cagr > 0 ? '+' : ''}{data.employeeGrowth.cagr}% CAGR
              </span>
            )}
          </div>
        )}
      </div>

      {/* Additional Employee Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="bg-theme-tertiary rounded-lg p-3">
          <div className="text-xs text-theme-secondary mb-1">Trend</div>
          <div className={`text-sm font-medium ${
            data.employeeGrowth?.trend === 'growing' ? 'text-green-400' : 
            data.employeeGrowth?.trend === 'declining' ? 'text-red-400' : 
            'text-theme-primary'
          }`}>
            {data.employeeGrowth?.trend === 'growing' ? 'Wachsend' :
             data.employeeGrowth?.trend === 'declining' ? 'Sinkend' : 'Stabil'}
          </div>
        </div>
        
        <div className="bg-theme-tertiary rounded-lg p-3">
          <div className="text-xs text-theme-secondary mb-1">Branche</div>
          <div className="text-sm font-medium text-theme-primary truncate">
            {data.industry}
          </div>
        </div>
      </div>
      
      {/* Larger Chart für bessere Proportionen */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 5, right: 5, bottom: 15, left: 5 }}
          >
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval={0}
              height={15}
            />
            <YAxis hide />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const value = payload[0].value as number
                const dataPoint = chartData.find(d => d.year === label)
                
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme-border">
                    <p className="text-theme-secondary text-xs mb-1">
                      {label}
                      {dataPoint?.estimated && (
                        <span className="text-amber-400 ml-1">(geschätzt)</span>
                      )}
                    </p>
                    <p className="text-theme-primary text-sm font-medium">
                      {value.toLocaleString()} Mitarbeiter
                    </p>
                  </div>
                )
              }}
            />
            <Bar 
              dataKey="employeeCount" 
              fill="#F97316"
              radius={[1, 1, 0, 0]}
              className="drop-shadow-sm"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Data Quality Indicator */}
      {data.dataQuality === 'limited' && (
        <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
          <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
          Geschätzte Daten
        </div>
      )}
    </div>
  )
}