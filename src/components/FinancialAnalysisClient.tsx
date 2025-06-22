// src/components/FinancialAnalysisClient.tsx - OPTIMIERTE CHART-LAYOUTS & EINHEITLICH SCHWARZ
'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/solid'
import { useCurrency } from '@/lib/CurrencyContext'
import FinancialChartModal from './FinancialChartModal'

// ─── Type Definitions ───────────────────────────────────────────────────────────
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
  | 'capEx'
  | 'researchAndDevelopment'
  | 'operatingIncome' 

interface Props {
  ticker: string
  isPremium?: boolean
  userId?: string
}

// ─── ALLE METRICS MIT DEUTSCHEN NAMEN ─────────────────────────────────────
const METRICS = [
  { 
    key: 'revenue' as const, 
    name: 'Umsatz', 
    shortName: 'Umsatz', 
    color: '#3B82F6',
    gradient: 'from-blue-500 to-blue-600'
  },
  { 
    key: 'ebitda' as const, 
    name: 'EBITDA', 
    shortName: 'EBITDA', 
    color: '#10B981',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  { 
    key: 'eps' as const, 
    name: 'Gewinn je Aktie', 
    shortName: 'EPS', 
    color: '#F59E0B',
    gradient: 'from-amber-500 to-amber-600'
  },
  { 
    key: 'freeCashFlow' as const, 
    name: 'Free Cash Flow', 
    shortName: 'FCF', 
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-violet-600'
  },
  { 
    key: 'netIncome' as const, 
    name: 'Nettogewinn', 
    shortName: 'Nettogewinn', 
    color: '#EF4444',
    gradient: 'from-red-500 to-red-600'
  },
  { 
    key: 'dividendPS' as const, 
    name: 'Dividende je Aktie', 
    shortName: 'Dividende', 
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  { 
    key: 'sharesOutstanding' as const, 
    name: 'Aktien im Umlauf', 
    shortName: 'Aktien', 
    color: '#84CC16',
    gradient: 'from-lime-500 to-lime-600'
  },
  { 
    key: 'returnOnEquity' as const, 
    name: 'Eigenkapitalrendite', 
    shortName: 'EKR', 
    color: '#EC4899',
    gradient: 'from-pink-500 to-pink-600'
  },
  { 
    key: 'capEx' as const, 
    name: 'Investitionsausgaben', 
    shortName: 'CapEx', 
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  { 
    key: 'researchAndDevelopment' as const, 
    name: 'F&E Ausgaben', 
    shortName: 'F&E', 
    color: '#84CC16',
    gradient: 'from-lime-500 to-lime-600'
  },
  { 
    key: 'operatingIncome' as const, 
    name: 'Betriebsergebnis', 
    shortName: 'Betriebsergebnis', 
    color: '#F97316',
    gradient: 'from-orange-500 to-orange-600'
  },
]

const SPECIAL_METRICS = [
  {
    key: 'cashDebt' as const,
    name: 'Liquidität & Schulden',
    shortName: 'Cash & Schulden',
    cashColor: '#22C55E',
    debtColor: '#EF4444'
  },
  {
    key: 'pe' as const,
    name: 'KGV TTM',
    shortName: 'P/E Ratio',
    color: '#F97316'
  }
]

// ✅ All metrics to display
const ALL_METRICS: MetricKey[] = [
  'revenue', 'ebitda', 'eps', 'freeCashFlow', 'cashDebt', 'pe', 
  'dividendPS', 'sharesOutstanding', 'netIncome', 'returnOnEquity', 
  'capEx', 'researchAndDevelopment', 'operatingIncome'
]

// ✅ API Data Fetcher
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
    if (dividendData.historical && Array.isArray(dividendData.historical)) {
      dividendData.historical.forEach((div: any) => {
        const year = new Date(div.date).getFullYear().toString()
        if (!dividendsByYear[year]) {
          dividendsByYear[year] = 0
        }
        dividendsByYear[year] += div.dividend || 0
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
      }
    })

    return combinedData
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return []
  }
}

// ─── CHART COMPONENTS ─────────────────────────────────────
interface ChartCardProps {
  title: string
  data: any[]
  metricKey: MetricKey
  color: string
  gradient?: string
  onExpand: () => void
  isPremium: boolean
}

function ChartCard({ title, data, metricKey, color, gradient, onExpand, isPremium }: ChartCardProps) {
  const { formatCurrency, formatAxisValue } = useCurrency()

  if (!isPremium) {
    return (
      <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-theme-secondary font-medium">Premium</p>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-theme-primary">{title}</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
            </button>
          </div>
          <div className="h-52 bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm hover:bg-theme-card/85 hover:border-border-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">{title}</h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      {/* ✅ GRÖSSERE Chart-Höhe für Desktop-Optimierung */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
          >
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 11, 
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval="preserveStartEnd"
              height={25}
            />
            {/* ✅ FIXED: Verbesserte Y-Achse mit intelligenter Formatierung */}
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: 'var(--text-secondary)' 
              }}
              tickFormatter={(value) => {
                // Spezielle Formatierung für verschiedene Metrics
                if (metricKey === 'eps' || metricKey === 'dividendPS') {
                  return `${value.toFixed(value < 1 ? 2 : 1)}`
                } else if (metricKey === 'returnOnEquity') {
                  return `${(value * 100).toFixed(0)}%`
                } else if (metricKey === 'sharesOutstanding') {
                  return `${(value / 1e9).toFixed(1)}B`
                } else {
                  return formatAxisValue(value)
                }
              }}
              width={35}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const value = payload[0].value as number
                
                let formattedValue = ''
                if (metricKey === 'returnOnEquity') {
                  formattedValue = `${(value * 100).toFixed(1)}%`
                } else if (metricKey === 'eps' || metricKey === 'dividendPS') {
                  formattedValue = formatCurrency(value, 'currency')
                } else if (metricKey === 'sharesOutstanding') {
                  formattedValue = `${(value / 1e9).toFixed(2)}B Aktien`
                } else {
                  formattedValue = formatCurrency(value)
                }

                return (
                  <div className="bg-theme-card border border-theme rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    <p className="text-theme-primary text-sm font-medium">{formattedValue}</p>
                  </div>
                )
              }}
            />
            <Bar 
              dataKey={metricKey} 
              fill={color}
              radius={[2, 2, 0, 0]}
              className="drop-shadow-sm"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CashDebtChart({ data, onExpand, isPremium }: { data: any[], onExpand: () => void, isPremium: boolean }) {
  const { formatCurrency, formatAxisValue } = useCurrency()

  if (!isPremium) {
    return (
      <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-theme-secondary font-medium">Premium</p>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-theme-primary">Cash & Schulden</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-4 h-4 text-theme-secondary" />
            </button>
          </div>
          <div className="h-52 bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm hover:bg-theme-card/85 hover:border-border-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">Cash & Schulden</h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      {/* ✅ GRÖSSERE Chart-Höhe für Desktop-Optimierung */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, bottom: 25, left: 50 }}
          >
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 11, 
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval="preserveStartEnd"
              height={25}
            />
            {/* ✅ FIXED: Verbesserte Y-Achse */}
            <YAxis 
              tickFormatter={formatAxisValue}
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: 'var(--text-secondary)' 
              }}
              width={50}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload) return null
                
                return (
                  <div className="bg-theme-card border border-theme rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-theme-primary text-sm font-medium">
                        <span style={{ color: entry.color }}>{entry.name}:</span> {formatCurrency(entry.value as number)}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Bar dataKey="cash" name="Liquidität" fill="#22C55E" radius={[2, 2, 0, 0]} />
            <Bar dataKey="debt" name="Schulden" fill="#EF4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PERatioChart({ data, onExpand, isPremium }: { data: any[], onExpand: () => void, isPremium: boolean }) {
  if (!isPremium) {
    return (
      <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-theme-secondary font-medium">Premium</p>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-theme-primary">KGV TTM</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
            </button>
          </div>
          <div className="h-52 bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm hover:bg-theme-card/85 hover:border-border-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">KGV TTM</h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      {/* ✅ GRÖSSERE Chart-Höhe für Desktop-Optimierung */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
          >
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 11, 
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval="preserveStartEnd"
              height={25}
            />
            {/* ✅ FIXED: Y-Achse mit besserer Formatierung */}
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: 'var(--text-secondary)' 
              }}
              tickFormatter={(value) => `${value.toFixed(1)}x`}
              width={35}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const value = payload[0].value as number
                
                return (
                  <div className="bg-theme-card border border-theme rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    <p className="text-theme-primary text-sm font-medium">{value.toFixed(1)}x</p>
                  </div>
                )
              }}
            />
            <Line 
              type="monotone" 
              dataKey="pe" 
              stroke="#F97316" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#F97316' }}
              activeDot={{ r: 5, fill: '#F97316', stroke: '#FFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────────
export default function FinancialAnalysisClient({ 
  ticker, 
  isPremium = false, 
  userId 
}: Props) {
  
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [data, setData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState<boolean>(true)
  const [fullscreen, setFullscreen] = useState<MetricKey | null>(null)
  const [visibleCharts, setVisibleCharts] = useState<MetricKey[]>(ALL_METRICS)
  
  const { currency } = useCurrency()

  const overviewYears = 10

  useEffect(() => {
    async function loadRealData() {
      setLoadingData(true)
      
      try {
        const realData = await fetchFinancialData(ticker, overviewYears, period)
        setData(realData)
      } catch (error) {
        console.error('Failed to load financial data:', error)
        setData([])
      } finally {
        setLoadingData(false)
      }
    }

    if (ticker) {
      loadRealData()
    }
  }, [ticker, period])

  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const handlePremiumAction = (action: () => void) => {
    if (!isPremium) {
      window.location.href = '/pricing'
    } else {
      action()
    }
  }

  // Toggle chart visibility
  const toggleChartVisibility = (chartKey: MetricKey) => {
    setVisibleCharts(prev =>
      prev.includes(chartKey) 
        ? prev.filter(x => x !== chartKey)
        : [...prev, chartKey]
    )
  }

  // Get chart name helper function
  function getChartName(key: MetricKey): string {
    if (key === 'cashDebt') return 'Liquidität & Schulden'
    if (key === 'pe') return 'KGV TTM'
    if (key === 'capEx') return 'CapEx'
    if (key === 'researchAndDevelopment') return 'F&E'
    if (key === 'operatingIncome') return 'Betriebsergebnis'
    
    const metric = METRICS.find(m => m.key === key)
    return metric?.shortName || key
  }

  return (
    <div className="space-y-6">
      {/* DEUTSCHE Controls mit einheitlichem SCHWARZEN Design */}
      <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm hover:bg-theme-card/85 hover:border-border-hover transition-all duration-300">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          
          {/* Period Controls */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme-primary font-medium">Periode:</span>
              {(['annual', 'quarterly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePremiumAction(() => setPeriod(p))}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    period === p 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-secondary border border-theme'
                  }`}
                >
                  {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Info */}
          <div className="text-xs text-theme-muted">
            Übersicht: 10 Jahre • Zeitraum pro Chart individuell auswählbar • {currency}
          </div>
        </div>
        
        {/* Chart Selection Checkboxes */}
        <div className="mt-4 pt-4 border-t border-theme">
          <div className="mb-3">
            <span className="text-sm text-theme-primary font-medium">Kennzahlen auswählen:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {ALL_METRICS.map((chartKey) => (
              <label key={chartKey} className="inline-flex items-center space-x-2 text-theme-primary">
                <input
                  type="checkbox"
                  checked={visibleCharts.includes(chartKey)}
                  onChange={() => handlePremiumAction(() => toggleChartVisibility(chartKey))}
                  className="form-checkbox h-3 w-3 text-blue-500 bg-theme-tertiary border-theme rounded focus:ring-blue-500"
                />
                <span className="text-xs">
                  {getChartName(chartKey)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid - BREITERES LAYOUT mit maximal 4 Charts pro Reihe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {/* Regular Metrics */}
        {METRICS.filter(metric => visibleCharts.includes(metric.key)).map((metric) => (
          <ChartCard
            key={metric.key}
            title={metric.shortName}
            data={data}
            metricKey={metric.key}
            color={metric.color}
            gradient={metric.gradient}
            onExpand={() => setFullscreen(metric.key)}
            isPremium={isPremium}
          />
        ))}
        
        {/* Special Charts */}
        {visibleCharts.includes('cashDebt') && (
          <CashDebtChart 
            data={data} 
            onExpand={() => setFullscreen('cashDebt')}
            isPremium={isPremium}
          />
        )}
        
        {visibleCharts.includes('pe') && (
          <PERatioChart 
            data={data} 
            onExpand={() => setFullscreen('pe')}
            isPremium={isPremium}
          />
        )}
      </div>

      {/* Modal */}
      <FinancialChartModal
        isOpen={!!fullscreen}
        onClose={() => setFullscreen(null)}
        ticker={ticker}
        metricKey={fullscreen}
        period={period}
      />
    </div>
  )
}