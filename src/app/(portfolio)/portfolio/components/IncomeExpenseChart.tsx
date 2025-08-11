'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PortfolioData } from '../types/portfolio'

interface IncomeExpenseChartProps {
  data: PortfolioData | null
  transactions?: any[] // Optional: pass transactions directly for better chart
}

export default function IncomeExpenseChart({ data, transactions = [] }: IncomeExpenseChartProps) {
  
  const generateMonthlyData = () => {
    if (!transactions || transactions.length === 0) {
      // Fallback: use data from props (current month only)
      if (!data || (data.monthlyIncome === 0 && data.monthlyExpenses === 0)) {
        return []
      }
      
      const currentMonth = new Date().toLocaleDateString('de-DE', { month: 'short' })
      return [{
        month: currentMonth,
        einnahmen: data.monthlyIncome,
        ausgaben: data.monthlyExpenses,
        investiert: 0
      }]
    }

    // 🆕 BETTER: Generate data for last 6 months from transactions
    const monthsData: Record<string, {
      month: string,
      einnahmen: number,
      ausgaben: number,
      investiert: number
    }> = {}

    // Get last 6 months
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      const monthLabel = date.toLocaleDateString('de-DE', { month: 'short' })
      
      monthsData[monthKey] = {
        month: monthLabel,
        einnahmen: 0,
        ausgaben: 0,
        investiert: 0
      }
    }

    // Fill with transaction data
    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      const monthKey = `${txDate.getFullYear()}-${txDate.getMonth()}`
      
      if (monthsData[monthKey]) {
        const amount = tx.quantity * tx.price
        
        if (tx.category === 'INCOME') {
          monthsData[monthKey].einnahmen += amount
        } else if (tx.category === 'EXPENSE') {
          monthsData[monthKey].ausgaben += amount
        } else if (tx.category === 'INVESTMENT' && tx.type === 'BUY') {
          monthsData[monthKey].investiert += amount
        }
      }
    })

    return Object.values(monthsData)
  }

  const chartData = generateMonthlyData()

  const formatCurrency = (value: number) => {
    return `€${value.toFixed(0)}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const einnahmen = payload.find((p: any) => p.dataKey === 'einnahmen')?.value || 0
      const ausgaben = payload.find((p: any) => p.dataKey === 'ausgaben')?.value || 0
      const investiert = payload.find((p: any) => p.dataKey === 'investiert')?.value || 0
      
      return (
        <div className="bg-theme-card border border-theme-hover rounded-lg p-4 shadow-lg">
          <p className="text-theme-primary font-semibold mb-2">{label} 2025</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-theme-secondary text-sm">
                  {entry.dataKey === 'einnahmen' ? 'Einnahmen' :
                   entry.dataKey === 'ausgaben' ? 'Ausgaben' : 'Investiert'}:
                </span>
              </div>
              <span className="text-theme-primary font-medium numeric">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
          
          {/* Net Savings */}
          <div className="border-t border-theme-hover pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-theme-secondary text-sm font-medium">
                Erspartes:
              </span>
              <span className="text-green-400 font-semibold numeric">
                {formatCurrency(einnahmen - ausgaben - investiert)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const totalIncome = chartData.reduce((sum, item) => sum + item.einnahmen, 0)
  const totalExpenses = chartData.reduce((sum, item) => sum + item.ausgaben, 0)
  const totalInvested = chartData.reduce((sum, item) => sum + item.investiert, 0)
  const netSavings = totalIncome - totalExpenses - totalInvested

  // Show empty state if no data
  if (chartData.length === 0 || totalIncome === 0) {
    return (
      <div className="bg-theme-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary mb-1">
              Cashflow Übersicht
            </h3>
            <p className="text-sm text-theme-muted">
              Einnahmen, Ausgaben und Investments
            </p>
          </div>
        </div>
        
        <div className="h-80 flex items-center justify-center text-theme-muted">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>Keine Transaktionsdaten verfügbar</p>
            <p className="text-sm mt-1">Füge Einnahmen und Ausgaben hinzu</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-xl p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary mb-1">
            Cashflow Übersicht
          </h3>
          <p className="text-sm text-theme-muted">
            Einnahmen, Ausgaben und Investments (letzte 6 Monate)
          </p>
        </div>
        
        {/* Summary Stats */}
        <div className="text-right">
          <div className="text-lg font-bold text-green-400 numeric">
            {formatCurrency(netSavings)}
          </div>
          <div className="text-xs text-theme-muted">
            Netto gespart
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-color)" 
              opacity={0.3}
            />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-theme-secondary text-sm">
                  {value === 'einnahmen' ? 'Einnahmen' :
                   value === 'ausgaben' ? 'Ausgaben' : 'Investiert'}
                </span>
              )}
            />
            
            <Bar 
              dataKey="einnahmen" 
              fill="#22c55e" 
              radius={[2, 2, 0, 0]}
              name="einnahmen"
            />
            <Bar 
              dataKey="ausgaben" 
              fill="#ef4444" 
              radius={[2, 2, 0, 0]}
              name="ausgaben"
            />
            <Bar 
              dataKey="investiert" 
              fill="#3b82f6" 
              radius={[2, 2, 0, 0]}
              name="investiert"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-theme-tertiary rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span className="text-xs text-theme-muted uppercase tracking-wide">
              Einnahmen
            </span>
          </div>
          <div className="text-lg font-bold text-theme-primary numeric">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-xs text-theme-muted">
            {chartData.length > 0 && `Ø ${formatCurrency(totalIncome / chartData.length)}/Monat`}
          </div>
        </div>

        <div className="text-center p-3 bg-theme-tertiary rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            <span className="text-xs text-theme-muted uppercase tracking-wide">
              Ausgaben
            </span>
          </div>
          <div className="text-lg font-bold text-theme-primary numeric">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="text-xs text-theme-muted">
            {chartData.length > 0 && `Ø ${formatCurrency(totalExpenses / chartData.length)}/Monat`}
          </div>
        </div>

        <div className="text-center p-3 bg-theme-tertiary rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="text-xs text-theme-muted uppercase tracking-wide">
              Investiert
            </span>
          </div>
          <div className="text-lg font-bold text-theme-primary numeric">
            {formatCurrency(totalInvested)}
          </div>
          <div className="text-xs text-theme-muted">
            {chartData.length > 0 && `Ø ${formatCurrency(totalInvested / chartData.length)}/Monat`}
          </div>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-green-400">
              Durchschnittliche Sparrate
            </div>
            <div className="text-xs text-theme-muted">
              (Einnahmen - Ausgaben) / Einnahmen
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400 numeric">
              {totalIncome > 0 ? `${((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-xs text-green-400/70">
              {totalIncome > 0 && totalIncome - totalExpenses > 0 ? 'Sehr gut! 💪' : 'Mehr sparen! 🎯'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}