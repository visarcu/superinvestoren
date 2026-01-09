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
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Green
  '#F59E0B', // Yellow/Amber
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
        color: '#6B7280'
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
        color: '#9CA3AF'
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
          className="bg-theme-primary rounded-lg px-4 py-3 shadow-2xl border-2 border-green-400/20"
          style={{
            zIndex: 9999,
            transform: transformStyle,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)',
            position: 'relative',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full border border-white/20" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-theme-primary text-sm">
              {data.symbol}
            </span>
          </div>
          <p className="text-xs text-theme-secondary mb-1 truncate max-w-[180px]">
            {data.name}
          </p>
          <p className="font-bold text-lg text-theme-primary">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-brand-light font-medium">
            {data.percentage.toFixed(1)}% des Portfolios
          </p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-theme-card rounded-xl p-8 border border-theme/10">
        <div className="text-center">
          <img
            src="/illustrations/undraw_investing_uzcu.svg"
            alt="Asset Allokation"
            className="w-44 h-44 mx-auto mb-6 opacity-85"
          />
          <h3 className="text-lg font-semibold text-theme-primary mb-2">
            Keine Daten verfügbar
          </h3>
          <p className="text-theme-secondary text-sm max-w-sm mx-auto">
            Füge Positionen zu deinem Portfolio hinzu, um die Asset-Allokation zu sehen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-theme-primary mb-2">
          Asset Allokation
        </h3>
        <p className="text-theme-secondary text-sm">
          Verteilung Ihres Portfolios nach Werten
        </p>
      </div>

      <div className="relative">
        {/* Chart Container */}
        <div className="relative" style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={2}
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.15))',
                      transition: 'all 0.3s ease'
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

          {/* Center Content - kompakt, passt in den Donut-Ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div
                className="bg-theme-card backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-theme/10"
                style={{ maxWidth: '100px' }}
              >
                <p className="text-base font-bold text-theme-primary leading-tight">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-xs text-theme-secondary mt-0.5">
                  {activeInvestments} Position{activeInvestments !== 1 ? 'en' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend - kompakter */}
        <div className="mt-3 pt-3 border-t border-theme/10">
          <h4 className="text-xs font-medium text-theme-secondary mb-2">Positionen</h4>
          <div className="flex flex-wrap gap-2">
            {chartData.map((entry, index) => (
              <div
                key={`legend-${index}`}
                className="flex items-center gap-2 py-1.5 px-2.5 bg-theme-secondary/10 rounded-md"
              >
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
                <span className="font-medium text-theme-primary text-xs">
                  {entry.symbol}
                </span>
                <span className="text-theme-secondary text-xs">
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PortfolioAllocationChart