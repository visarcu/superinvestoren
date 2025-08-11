'use client'

import React from 'react'
import { 
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { PortfolioData } from '../types/portfolio'

interface KPICardsProps {
  data: PortfolioData | null
}

export default function KPICards({ data }: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  const kpis = [
    {
      title: 'Monatliches Nettoeinkommen',
      value: data ? formatCurrency(data.monthlyIncome) : '€0',
      icon: BanknotesIcon,
      color: 'green',
      change: null
    },
    {
      title: 'Monatliche Ausgaben', 
      value: data ? formatCurrency(data.monthlyExpenses) : '€0',
      icon: CalendarIcon,
      color: 'red',
      change: null
    },
    {
      title: 'Sparrate',
      value: data ? `${data.savingsRate.toFixed(1)}%` : '0%',
      icon: ChartPieIcon,
      color: 'blue',
      change: null
    },
    {
      title: 'Portfolio Wert',
      value: data ? formatCurrency(data.totalValue) : '€0',
      icon: ArrowTrendingUpIcon,
      color: 'purple',
      change: data ? {
        amount: data.totalGainLoss,
        percent: data.gainLossPercent
      } : null
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-green-600'
      case 'red':
        return 'from-red-500 to-red-600'
      case 'blue':
        return 'from-blue-500 to-blue-600'
      case 'purple':
        return 'from-purple-500 to-purple-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className="bg-theme-card rounded-xl p-6 hover:transform hover:scale-105 transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-r ${getColorClasses(kpi.color)}`}>
              <kpi.icon className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-theme-secondary mb-2">
            {kpi.title}
          </h3>

          {/* Value */}
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-theme-primary numeric">
              {kpi.value}
            </span>
            
            {/* Change Indicator */}
            {kpi.change && (
              <div className={`flex items-center gap-1 text-sm ${
                kpi.change.amount >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {kpi.change.amount >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
                <span className="numeric">
                  {formatPercent(kpi.change.percent)}
                </span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {kpi.change && (
            <div className="mt-2 text-xs text-theme-muted">
              {kpi.change.amount >= 0 ? '+' : ''}{formatCurrency(kpi.change.amount)} Gewinn/Verlust
            </div>
          )}
        </div>
      ))}
    </div>
  )
}