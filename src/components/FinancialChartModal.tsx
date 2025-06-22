// src/components/FinancialChartModal.tsx - KONSISTENTES THEME-DESIGN
'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useCurrency } from '@/lib/CurrencyContext'

type MetricKey =
  | 'revenue'
  | 'ebitda'
  | 'eps'
  | 'freeCashFlow'
  | 'dividendPS'
  | 'sharesOutstanding'
  | 'netIncome'
  | 'cashDebt'
  | 'pe'
  | 'returnOnEquity'
  | 'stockAward'
  | 'capEx'
  | 'researchAndDevelopment'
  | 'operatingIncome' 

interface FinancialChartModalProps {
  isOpen: boolean
  onClose: () => void
  ticker: string
  metricKey: MetricKey | null
  period: 'annual' | 'quarterly'
}

// CAGR Calculator
const calculateCAGR = (data: any[], key: string, years: number): number | null => {
  if (data.length < 2) return null
  
  const relevantData = data.filter(d => d[key] != null && d[key] > 0).slice(-years)
  if (relevantData.length < 2) return null
  
  const startValue = relevantData[0][key]
  const endValue = relevantData[relevantData.length - 1][key]
  const periods = relevantData.length - 1
  
  if (startValue <= 0 || endValue <= 0 || periods <= 0) return null
  
  const cagr = Math.pow(endValue / startValue, 1 / periods) - 1
  return cagr * 100
}

// API Data Fetcher (same as before but simplified)
async function fetchFinancialData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
  
  try {
    const [incomeRes, balanceRes, cashFlowRes, keyMetricsRes, dividendRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${years}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${years}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${years}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=${period}&limit=${years}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`)
    ])

    if (!incomeRes.ok || !balanceRes.ok || !cashFlowRes.ok || !keyMetricsRes.ok) {
      throw new Error('API request failed')
    }

    const [incomeData, balanceData, cashFlowData, keyMetricsData, dividendData] = await Promise.all([
      incomeRes.json(),
      balanceRes.json(), 
      cashFlowRes.json(),
      keyMetricsRes.json(),
      dividendRes.json()
    ])

    // Dividends by year
    const dividendsByYear: Record<string, number> = {}
    if (dividendData && dividendData.historical && Array.isArray(dividendData.historical)) {
      dividendData.historical.forEach((div: any) => {
        try {
          const year = new Date(div.date).getFullYear().toString()
          if (!dividendsByYear[year]) {
            dividendsByYear[year] = 0
          }
          dividendsByYear[year] += div.dividend || 0
        } catch (e) {
          console.warn('Error parsing dividend date:', div.date, e)
        }
      })
    }

    const combinedData = incomeData.slice(0, years).reverse().map((income: any, index: number) => {
      const balance = balanceData[balanceData.length - 1 - index] || {}
      const cashFlow = cashFlowData[cashFlowData.length - 1 - index] || {}
      const metrics = keyMetricsData[keyMetricsData.length - 1 - index] || {}
      const year = income.calendarYear || income.date?.slice(0, 4) || '—'

      return {
        label: year,
        revenue: income.revenue || 0,
        netIncome: income.netIncome || 0,
        operatingIncome: income.operatingIncome || 0,
        ebitda: income.ebitda || 0,
        eps: income.eps || 0,
        dividendPS: dividendsByYear[year] || metrics.dividendPerShare || 0,
        cash: balance.cashAndCashEquivalents || balance.cashAndShortTermInvestments || 0,
        debt: balance.totalDebt || 0,
        sharesOutstanding: balance.commonStockSharesOutstanding || income.weightedAverageShsOut || 0,
        freeCashFlow: cashFlow.freeCashFlow || 0,
        capEx: Math.abs(cashFlow.capitalExpenditure) || 0,
        pe: metrics.peRatio || 0,
        returnOnEquity: metrics.roe || 0,
        researchAndDevelopment: income.researchAndDevelopmentExpenses || 0,
        stockAward: income.stockBasedCompensation || 0
      }
    })

    return combinedData
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return []
  }
}

const METRICS = [
  { key: 'revenue' as const, name: 'Umsatz', shortName: 'Umsatz', fill: 'rgba(59,130,246,0.8)', stroke: '#3b82f6' },
  { key: 'ebitda' as const, name: 'EBITDA', shortName: 'EBITDA', fill: 'rgba(16,185,129,0.8)', stroke: '#10b981' },
  { key: 'eps' as const, name: 'Gewinn je Aktie', shortName: 'EPS', fill: 'rgba(245,158,11,0.8)', stroke: '#f59e0b' },
  { key: 'freeCashFlow' as const, name: 'Free Cash Flow', shortName: 'FCF', fill: 'rgba(139,92,246,0.8)', stroke: '#8b5cf6' },
  { key: 'dividendPS' as const, name: 'Dividende je Aktie', shortName: 'Dividende', fill: 'rgba(34,211,238,0.8)', stroke: '#22d3ee' },
  { key: 'sharesOutstanding' as const, name: 'Aktien im Umlauf', shortName: 'Aktien', fill: 'rgba(234,179,8,0.8)', stroke: '#eab308' },
  { key: 'netIncome' as const, name: 'Nettogewinn', shortName: 'Nettogewinn', fill: 'rgba(239,179,0,0.8)', stroke: '#efb300' },
  { key: 'returnOnEquity' as const, name: 'Eigenkapitalrendite', shortName: 'EKR', fill: 'rgba(244,114,182,0.8)', stroke: '#f472b6' },
  { key: 'capEx' as const, name: 'Investitionsausgaben', shortName: 'CapEx', fill: 'rgba(6,182,212,0.8)', stroke: '#06b6d4' },
  { key: 'researchAndDevelopment' as const, name: 'F&E Ausgaben', shortName: 'F&E', fill: 'rgba(132,204,22,0.8)', stroke: '#84cc16' },
  { key: 'operatingIncome' as const, name: 'Betriebsergebnis', shortName: 'Betriebsergebnis', fill: 'rgba(249,115,22,0.8)', stroke: '#f97316' },
]

export default function FinancialChartModal({ 
  isOpen, 
  onClose, 
  ticker, 
  metricKey, 
  period 
}: FinancialChartModalProps) {
  const [years, setYears] = useState(10)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const { currency, formatCurrency, formatAxisValue } = useCurrency()

  // Load data when modal opens or settings change
  useEffect(() => {
    if (!isOpen || !metricKey || !ticker) return

    async function loadData() {
      setLoading(true)
      try {
        const result = await fetchFinancialData(ticker, years, period)
        setData(result)
      } catch (error) {
        console.error('Failed to load data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, metricKey, ticker, years, period])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !metricKey) return null

  const metric = METRICS.find(m => m.key === metricKey)
  const metricName = metric?.name || metricKey

  // Calculate CAGR
  const cagr1Y = calculateCAGR(data, metricKey, 2)
  const cagr3Y = calculateCAGR(data, metricKey, 4)
  const cagr5Y = calculateCAGR(data, metricKey, 6)

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-theme-card/95 backdrop-blur-xl w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-theme shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Konsistentes Theme */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-theme bg-theme-card/80">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-theme-primary">
              {metricName} · {ticker} · {currency}
            </h1>
            
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="px-3 py-2 bg-theme-secondary text-theme-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all duration-200"
              style={{ 
                minWidth: '120px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <option value={20}>Alle Jahre</option>
              <option value={10}>10 Jahre</option>
              <option value={5}>5 Jahre</option>
              <option value={3}>3 Jahre</option>
            </select>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 border border-red-500/30"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Chart Area - Konsistentes Theme */}
        <div className="flex-1 bg-theme-primary p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  const tooltipStyles = {
                    contentStyle: { 
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      padding: '12px 16px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    },
                    labelStyle: { 
                      color: 'var(--text-primary)', 
                      fontSize: '15px', 
                      fontWeight: '600',
                      marginBottom: '6px',
                      borderBottom: '1px solid var(--border-color)',
                      paddingBottom: '4px'
                    }
                  }

                  if (metricKey === 'cashDebt') {
                    return (
                      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <XAxis 
                          dataKey="label" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValue}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                          width={80}
                        />
                        <RechartsTooltip 
                          formatter={(v: any, n: string) => [formatCurrency(v as number), n]}
                          {...tooltipStyles}
                        />
                        <Bar dataKey="cash" name="Liquidität" fill="rgba(34, 197, 94, 0.8)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="debt" name="Schulden" fill="rgba(239, 68, 68, 0.8)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )
                  } else if (metricKey === 'pe') {
                    const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
                    return (
                      <LineChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                        <XAxis 
                          dataKey="label" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                          width={60}
                        />
                        <ReferenceLine
                          y={avg}
                          stroke="var(--text-muted)"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          opacity={0.6}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="pe" 
                          name="KGV TTM" 
                          stroke="#F97316" 
                          strokeWidth={3}
                          dot={{ fill: '#F97316', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8, fill: '#F97316', stroke: '#FFF', strokeWidth: 2 }}
                        />
                        <RechartsTooltip 
                          formatter={(v: number) => [v.toFixed(1) + 'x', 'KGV TTM']}
                          {...tooltipStyles}
                        />
                      </LineChart>
                    )
                  } else {
                    return (
                      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <XAxis 
                          dataKey="label" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tickFormatter={(v: number) => {
                            if (metricKey === 'returnOnEquity') {
                              return `${(v * 100).toFixed(0)}%`
                            } else if (metricKey === 'eps' || metricKey === 'dividendPS') {
                              return `${v.toFixed(1)} ${currency}`
                            } else if (metricKey === 'sharesOutstanding') {
                              return `${(v / 1e9).toFixed(1)}B`
                            }
                            return formatAxisValue(v)
                          }}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                          width={80}
                        />
                        <RechartsTooltip 
                          formatter={(v: any, n: string) => {
                            if (metricKey === 'returnOnEquity') {
                              return [`${((v as number) * 100).toFixed(1)}%`, n]
                            } else if (metricKey === 'eps' || metricKey === 'dividendPS') {
                              return [formatCurrency(v as number, 'currency'), n]
                            } else if (metricKey === 'sharesOutstanding') {
                              return [`${((v as number) / 1e9).toFixed(2)}B Aktien`, n]
                            }
                            return [formatCurrency(v as number), n]
                          }}
                          {...tooltipStyles}
                        />
                        <Bar
                          dataKey={metricKey}
                          name={metricName}
                          fill={metric?.fill || 'rgba(59, 130, 246, 0.8)'}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )
                  }
                })()}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Footer with CAGR - Konsistentes Theme */}
        <div className="border-t border-theme px-6 py-5 bg-theme-card/80">
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-12 max-w-lg">
              <div className="text-center">
                <div className="text-theme-muted text-xs font-medium mb-2 uppercase tracking-wider">1J CAGR</div>
                <div className={`text-xl font-bold ${cagr1Y && cagr1Y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {cagr1Y !== null ? `${cagr1Y >= 0 ? '+' : ''}${cagr1Y.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-theme-muted text-xs font-medium mb-2 uppercase tracking-wider">3J CAGR</div>
                <div className={`text-xl font-bold ${cagr3Y && cagr3Y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {cagr3Y !== null ? `${cagr3Y >= 0 ? '+' : ''}${cagr3Y.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-theme-muted text-xs font-medium mb-2 uppercase tracking-wider">5J CAGR</div>
                <div className={`text-xl font-bold ${cagr5Y && cagr5Y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {cagr5Y !== null ? `${cagr5Y >= 0 ? '+' : ''}${cagr5Y.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}