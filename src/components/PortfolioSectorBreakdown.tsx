// src/components/PortfolioSectorBreakdown.tsx
'use client'

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'
import { stocks } from '@/data/stocks'

interface Holding {
  symbol: string
  name: string
  value: number
}

interface PortfolioSectorBreakdownProps {
  holdings: Holding[]
  totalValue: number
}

// Sector colors matching Fey style
const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3B82F6',
  'Technologie': '#3B82F6',
  'Financial Services': '#10B981',
  'Finanzdienstleistungen': '#10B981',
  'Healthcare': '#EF4444',
  'Gesundheitswesen': '#EF4444',
  'Consumer Cyclical': '#F59E0B',
  'Zyklische Konsumgüter': '#F59E0B',
  'Consumer Defensive': '#8B5CF6',
  'Basiskonsumgüter': '#8B5CF6',
  'Energy': '#F97316',
  'Energie': '#F97316',
  'Industrials': '#6B7280',
  'Industrie': '#6B7280',
  'Real Estate': '#EC4899',
  'Immobilien': '#EC4899',
  'Basic Materials': '#84CC16',
  'Rohstoffe': '#84CC16',
  'Utilities': '#06B6D4',
  'Versorger': '#06B6D4',
  'Communication Services': '#F472B6',
  'Kommunikation': '#F472B6',
}

const FALLBACK_COLORS = [
  '#3B82F6', '#10B981', '#EF4444', '#8B5CF6',
  '#F59E0B', '#F97316', '#6B7280', '#EC4899',
  '#84CC16', '#06B6D4', '#F472B6', '#9CA3AF'
]

export default function PortfolioSectorBreakdown({ holdings, totalValue }: PortfolioSectorBreakdownProps) {
  const { formatCurrency } = useCurrency()

  // Calculate sector breakdown from holdings
  const sectorData = useMemo(() => {
    if (holdings.length === 0 || totalValue === 0) return []

    const sectorMap = new Map<string, { value: number; count: number }>()

    holdings.forEach(holding => {
      // Find sector from stocks data
      const stockInfo = stocks.find(s =>
        s.ticker.toUpperCase() === holding.symbol.toUpperCase()
      )
      const sector = stockInfo?.sector || 'Sonstige'

      const existing = sectorMap.get(sector) || { value: 0, count: 0 }
      sectorMap.set(sector, {
        value: existing.value + holding.value,
        count: existing.count + 1
      })
    })

    // Convert to array and calculate percentages
    const data = Array.from(sectorMap.entries())
      .map(([sector, data], index) => ({
        sector,
        value: data.value,
        count: data.count,
        percentage: (data.value / totalValue) * 100,
        color: SECTOR_COLORS[sector] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)

    return data
  }, [holdings, totalValue])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-semibold text-white mb-1">{data.sector}</p>
          <p className="text-xs text-neutral-400">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
          <p className="text-xs text-neutral-500">
            {data.count} Position{data.count !== 1 ? 'en' : ''}
          </p>
        </div>
      )
    }
    return null
  }

  if (sectorData.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-neutral-500 text-sm">Keine Sektor-Daten verfügbar</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-neutral-400">
          Sektor Allokation
        </h3>
      </div>

      {/* Chart Container - Compact */}
      <div className="relative" style={{ height: '160px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectorData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {sectorData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 9999 }}
            />
          </PieChart>
        </ResponsiveContainer>

      </div>

      {/* Legend - Compact list */}
      <div className="mt-4 pt-4 border-t border-neutral-800">
        <div className="space-y-0">
          {sectorData.slice(0, 5).map((entry, index) => (
            <div
              key={`legend-${index}`}
              className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-white text-sm truncate max-w-[120px]">
                  {entry.sector}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 text-xs">
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          {sectorData.length > 5 && (
            <div className="pt-2 text-center">
              <span className="text-neutral-500 text-xs">
                +{sectorData.length - 5} weitere
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
