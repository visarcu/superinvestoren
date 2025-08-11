'use client'

import React from 'react'
import { PieChart, Pie, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts'
import { PortfolioData } from '../types/portfolio'

interface PortfolioChartProps {
  data: PortfolioData | null
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  if (!data || data.positions.length === 0) {
    return (
      <div className="bg-theme-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">
          Portfolio Verteilung
        </h3>
        <div className="flex items-center justify-center h-64 text-theme-muted">
          Keine Portfolio-Daten verfügbar
        </div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = data.positions.map((position, index) => ({
    name: position.symbol,
    value: position.currentValue,
    percentage: ((position.currentValue / data.totalValue) * 100).toFixed(1)
  }))

  // Colors for the pie chart
  const COLORS = [
    '#22c55e', // green-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#84cc16'  // lime-500
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-theme-card border border-theme-hover rounded-lg p-3 shadow-lg">
          <p className="text-theme-primary font-semibold">{data.name}</p>
          <p className="text-theme-secondary">
            Wert: {formatCurrency(data.value)}
          </p>
          <p className="text-theme-secondary">
            Anteil: {data.percentage}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-theme-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-theme-primary">
          Portfolio Verteilung
        </h3>
        <div className="text-sm text-theme-secondary">
          Gesamt: {formatCurrency(data.totalValue)}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => (
                <span className="text-theme-secondary text-sm">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Position Details */}
      <div className="mt-6 space-y-3">
        {data.positions.slice(0, 5).map((position, index) => (
          <div key={position.symbol} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div>
                <div className="text-sm font-medium text-theme-primary">
                  {position.symbol}
                </div>
                <div className="text-xs text-theme-muted">
                  {position.quantity} Stück
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-theme-primary numeric">
                {formatCurrency(position.currentValue)}
              </div>
              <div className="text-xs text-theme-muted">
                {((position.currentValue / data.totalValue) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}