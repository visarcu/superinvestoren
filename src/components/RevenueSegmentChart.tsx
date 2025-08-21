// src/components/RevenueSegmentsChart.tsx - KORRIGIERT
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
import { ArrowsPointingOutIcon } from '@heroicons/react/24/solid'
import { useCurrency } from '@/lib/CurrencyContext'

function RevenueSegmentsChart({ 
  ticker, 
  onExpand, 
  isPremium 
}: { 
  ticker: string, 
  onExpand: () => void, 
  isPremium: boolean 
}) {
  const { formatCurrency, formatAxisValueDE } = useCurrency()
  const [segmentData, setSegmentData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSegments() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
        
        console.log('🔍 [RevenueSegments] Loading segments for:', ticker)
        
        // v4 API für Product Segmentation
        const res = await fetch(
          `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${ticker}&structure=flat&period=annual&apikey=${apiKey}`
        )
        
        console.log('🔍 [RevenueSegments] API Response status:', res.status, res.ok)
        
        if (res.ok) {
          const data = await res.json()
          console.log('📊 [RevenueSegments] Raw API data:', data)
          
          if (Array.isArray(data) && data.length > 0) {
            // ✅ KORRIGIERTE TRANSFORMATION
            const transformed = data.map((yearData: any) => {
              // Hole den ersten (und einzigen) Key - das ist das Datum
              const dateKey = Object.keys(yearData)[0]
              const segments = yearData[dateKey]
              
              if (!dateKey || !segments) return null
              
              // Extrahiere Jahr aus dem Datum (z.B. "2024-12-31" → "2024")
              const year = dateKey.substring(0, 4)
              const result: any = { label: year }
              
              // Füge alle Segmente hinzu
              Object.entries(segments).forEach(([segmentName, value]) => {
                if (typeof value === 'number' && value > 0) {
                  // Kürze lange Segment-Namen für bessere Darstellung
                  const shortName = segmentName.length > 25 
                    ? segmentName.substring(0, 22) + '...' 
                    : segmentName
                  result[shortName] = value
                }
              })
              
              return result
            })
            .filter(Boolean) // Entferne null-Werte
            .reverse() // Sortiere chronologisch (älteste zuerst)
            
            console.log('✅ [RevenueSegments] Transformed data:', transformed)
            console.log('📅 [RevenueSegments] Years available:', transformed.map(d => d.label))
            
            setSegmentData(transformed)
          } else {
            console.warn('⚠️ [RevenueSegments] No data received or invalid format')
            setSegmentData([])
          }
        } else {
          console.error('❌ [RevenueSegments] API call failed with status:', res.status)
          setSegmentData([])
        }
      } catch (error) {
        console.error('❌ [RevenueSegments] Error loading segments:', error)
        setSegmentData([])
      } finally {
        setLoading(false)
      }
    }

    if (ticker && isPremium) {
      loadSegments()
    } else {
      setLoading(false)
    }
  }, [ticker, isPremium])

  // Premium Check
  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-theme-secondary font-medium">Premium</p>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-theme-primary">Produkt-Segmente</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
            </button>
          </div>
          <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Produkt-Segmente</h3>
        </div>
        <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  // No Data State
  if (segmentData.length === 0) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Produkt-Segmente</h3>
        </div>
        <div className="aspect-square flex items-center justify-center">
          <p className="text-theme-secondary text-xs">Keine Segment-Daten verfügbar</p>
        </div>
      </div>
    )
  }

  // Chart Rendering
  const segmentKeys = Object.keys(segmentData[0] || {}).filter(key => key !== 'label')
  const SEGMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#EC4899']

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">
          Produkt-Segmente
          {segmentData.length > 0 && (
            <span className="text-xs text-theme-muted ml-2">
              ({segmentData[0]?.label} - {segmentData[segmentData.length - 1]?.label})
            </span>
          )}
        </h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      <div className="aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={segmentData} 
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
          >
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickFormatter={(value) => formatAxisValueDE(value)}
              width={35}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload) return null
                const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex justify-between gap-3 text-xs">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="text-theme-primary font-medium">
                          {formatCurrency(entry.value as number)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-theme/20 mt-1 pt-1">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-theme-secondary">Gesamt:</span>
                        <span className="text-theme-primary font-bold">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            
            {/* Stacked Bar Chart für Segmente */}
            {segmentKeys.map((segment, index) => (
              <Bar 
                key={segment}
                dataKey={segment}
                stackId="a"
                fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                radius={index === segmentKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default RevenueSegmentsChart