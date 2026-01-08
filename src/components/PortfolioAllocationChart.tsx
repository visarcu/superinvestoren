// src/components/PortfolioAllocationChart.tsx
'use client'

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'

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

  // Prepare chart data
  const chartData = useMemo(() => {
    if (totalValue === 0) return []

    const data: ChartData[] = []
    
    // Add stock holdings
    holdings.forEach((holding, index) => {
      const percentage = (holding.value / totalValue) * 100
      
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
      const percentage = (holding.value / totalValue) * 100
      return percentage < 1
    })

    if (smallHoldings.length > 0) {
      const smallHoldingsValue = smallHoldings.reduce((sum, holding) => sum + holding.value, 0)
      const smallHoldingsPercentage = (smallHoldingsValue / totalValue) * 100
      
      data.push({
        name: `Andere (${smallHoldings.length})`,
        symbol: 'OTHERS',
        value: smallHoldingsValue,
        percentage: smallHoldingsPercentage,
        color: '#6B7280' // Gray for others
      })
    }

    // Add cash position if significant
    if (cashPosition > 0) {
      const cashPercentage = (cashPosition / totalValue) * 100
      if (cashPercentage >= 1) {
        data.push({
          name: 'Cash Position',
          symbol: 'CASH',
          value: cashPosition,
          percentage: cashPercentage,
          color: '#9CA3AF' // Light gray for cash
        })
      }
    }

    return data.sort((a, b) => b.value - a.value)
  }, [holdings, totalValue, cashPosition])

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
          <div className="w-24 h-24 bg-theme-secondary/30 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl text-theme-muted">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-theme-primary mb-2">
            Keine Daten verfügbar
          </h3>
          <p className="text-theme-secondary text-sm">
            Fügen Sie Positionen hinzu, um die Asset-Allokation zu sehen
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
        <div className="relative" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
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

          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-4">
              <div className="bg-theme-primary/95 backdrop-blur-sm rounded-lg p-2.5 shadow-lg border border-theme/10" style={{ zIndex: 5 }}>
                <p className="text-xl lg:text-2xl font-bold text-theme-primary mb-1">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-xs lg:text-sm text-theme-secondary">
                  {activeInvestments.toLocaleString('de-DE')} Position{activeInvestments !== 1 ? 'en' : ''}
                </p>
                {cashPosition > 0 && (
                  <p className="text-xs text-theme-muted mt-1">
                    + {formatCurrency(cashPosition)} Cash
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {chartData.map((entry, index) => (
            <div 
              key={`legend-${index}`}
              className="flex items-center gap-3 p-3 bg-theme-secondary/20 rounded-lg hover:bg-theme-secondary/30 transition-colors"
            >
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-theme-primary text-sm truncate">
                    {entry.symbol}
                  </span>
                  <span className="text-theme-secondary text-xs ml-2">
                    {entry.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-theme-muted truncate">
                  {entry.name}
                </p>
                <p className="text-xs font-medium text-theme-primary">
                  {formatCurrency(entry.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PortfolioAllocationChart