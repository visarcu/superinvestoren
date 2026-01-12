// src/components/PortfolioAllocationChart.tsx
'use client'

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'
import Logo from '@/components/Logo'

interface ChartData {
  name: string
  symbol: string
  value: number
  percentage: number
  color: string
}

interface Holding {
  symbol: string
  name: string
  value: number
  quantity: number
}

interface PortfolioAllocationChartProps {
  holdings: Holding[]
  totalValue: number
  cashPosition: number
  activeInvestments: number
}

// Modern vibrant colors for the segments
const COLORS = [
  '#10B981', // Emerald (primary)
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F43F5E', // Rose
]

const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({
  holdings,
  totalValue,
  cashPosition,
  activeInvestments
}) => {
  const { formatCurrency } = useCurrency()

  // Prepare chart data - korrigierte Prozentberechnung
  const chartData = useMemo(() => {
    // Berechne echten Total INKLUSIVE Cash für korrekte Prozente
    const stocksTotal = holdings.reduce((sum, h) => sum + h.value, 0)
    const actualTotal = stocksTotal + cashPosition

    if (actualTotal === 0) return []

    const data: ChartData[] = []

    // Add stock holdings
    holdings.forEach((holding, index) => {
      const percentage = (holding.value / actualTotal) * 100  // Nutze actualTotal!

      // Only show holdings that represent at least 1% of portfolio
      if (percentage >= 1) {
        data.push({
          name: holding.name,
          symbol: holding.symbol,
          value: holding.value,
          percentage,
          color: COLORS[index % COLORS.length]
        })
      }
    })

    // Group small holdings into "Others"
    const smallHoldings = holdings.filter((holding) => {
      const percentage = (holding.value / actualTotal) * 100
      return percentage < 1
    })

    if (smallHoldings.length > 0) {
      const smallHoldingsValue = smallHoldings.reduce((sum, holding) => sum + holding.value, 0)
      const smallHoldingsPercentage = (smallHoldingsValue / actualTotal) * 100

      data.push({
        name: `Andere (${smallHoldings.length})`,
        symbol: 'OTHERS',
        value: smallHoldingsValue,
        percentage: smallHoldingsPercentage,
        color: '#525252'
      })
    }

    // Add cash position
    if (cashPosition > 0) {
      const cashPercentage = (cashPosition / actualTotal) * 100  // Nutze actualTotal!
      data.push({
        name: 'Bargeld',
        symbol: 'CASH',
        value: cashPosition,
        percentage: cashPercentage,
        color: '#737373'
      })
    }

    return data.sort((a, b) => b.value - a.value)
  }, [holdings, cashPosition])

  // Custom tooltip optimized to avoid center overlap
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload

      // Calculate position to avoid center area (110px radius + 20px margin)
      let transformStyle = 'translateY(-10px)'
      if (coordinate) {
        const chartCenterX = 160 // Approximate center X
        const chartCenterY = 160 // Approximate center Y
        const centerRadius = 130 // Safe zone around center

        const distanceFromCenter = Math.sqrt(
          Math.pow(coordinate.x - chartCenterX, 2) +
          Math.pow(coordinate.y - chartCenterY, 2)
        )

        // If tooltip would appear near center, push it outward
        if (distanceFromCenter < centerRadius) {
          if (coordinate.x < chartCenterX) {
            transformStyle = 'translateX(-100%) translateY(-50%)'
          } else {
            transformStyle = 'translateX(20px) translateY(-50%)'
          }
        }
      }

      return (
        <div
          className="bg-neutral-900 rounded-lg px-4 py-3 shadow-2xl border border-neutral-700"
          style={{
            zIndex: 9999,
            transform: transformStyle,
            backdropFilter: 'blur(10px)',
            position: 'relative',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-semibold text-white text-sm">
              {data.symbol}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mb-1 truncate max-w-[180px]">
            {data.name}
          </p>
          <p className="font-semibold text-lg text-white">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-emerald-400 font-medium">
            {data.percentage.toFixed(1)}% des Portfolios
          </p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="py-12">
        <div className="text-center">
          <img
            src="/illustrations/undraw_investing_uzcu.svg"
            alt="Asset Allokation"
            className="w-32 h-32 mx-auto mb-6 opacity-60"
          />
          <h3 className="text-base font-medium text-white mb-2">
            Keine Daten verfügbar
          </h3>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            Füge Positionen zu deinem Portfolio hinzu, um die Asset-Allokation zu sehen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-neutral-400">
          Asset Allokation
        </h3>
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="transparent"
                  style={{
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                zIndex: 9999,
                pointerEvents: 'none',
                filter: 'none',
                outline: 'none'
              }}
              allowEscapeViewBox={{ x: true, y: true }}
              offset={20}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-neutral-500">
              {activeInvestments} Position{activeInvestments !== 1 ? 'en' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Legend - flat list */}
      <div className="mt-4 pt-4 border-t border-neutral-800">
        <div className="space-y-0">
          {chartData.map((entry, index) => (
            <div
              key={`legend-${index}`}
              className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                {entry.symbol !== 'CASH' && entry.symbol !== 'OTHERS' ? (
                  <Logo
                    ticker={entry.symbol}
                    alt={entry.symbol}
                    className="w-5 h-5"
                    padding="none"
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  >
                    <span className="text-[8px] font-bold text-white">
                      {entry.symbol === 'CASH' ? '€' : '...'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-white text-sm">
                    {entry.symbol}
                  </span>
                  <span className="text-neutral-500 text-xs ml-2">
                    {entry.name}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white text-sm font-medium">
                  {formatCurrency(entry.value)}
                </span>
                <span className="text-emerald-400 text-xs ml-2">
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PortfolioAllocationChart
