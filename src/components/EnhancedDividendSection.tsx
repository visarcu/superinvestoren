// src/components/EnhancedDividendSection.tsx
// PROFESSIONELLE DIVIDENDEN-ANALYSE - MIT DEUTSCHER FORMATIERUNG

'use client'

import React, { useState, useEffect } from 'react'
import { 
  BanknotesIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BugAntIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, ComposedChart, Area, AreaChart, CartesianGrid } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'

interface DividendData {
  year: number
  dividendPerShare: number
  growth: number
}

interface QuarterlyDividend {
  date: string
  amount: number
  quarter: string
  year: number
  adjAmount: number
  exDividendDate?: string
  recordDate?: string
  payableDate?: string
}

interface PayoutRatioHistory {
  year: number
  payoutRatio: number
  ttmEPS: number
  ttmDividend: number
}

interface DividendCAGR {
  period: string
  years: number
  cagr: number
  startValue: number
  endValue: number
  totalReturn: number
}

interface FinancialHealthMetrics {
  freeCashFlowCoverage: number
  debtToEquity: number
  interestCoverage: number
  currentRatio: number
  quickRatio: number
  roe: number
  roa: number
}

interface StockSplit {
  symbol: string
  date: string
  numerator: number
  denominator: number
  ratio: string
  type: string
  description: string
}

interface PayoutSafetyData {
  text: string
  color: 'green' | 'yellow' | 'red' | 'gray'
  level: 'very_safe' | 'safe' | 'moderate' | 'risky' | 'critical' | 'unsustainable' | 'no_data'
  payout: number
}

interface EnhancedDividendSectionProps {
  ticker: string
  isPremium?: boolean
}

export default function EnhancedDividendSection({ 
  ticker, 
  isPremium = false 
}: EnhancedDividendSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dividendData, setDividendData] = useState<DividendData[]>([])
  const [currentInfo, setCurrentInfo] = useState<any>(null)
  const [quarterlyHistory, setQuarterlyHistory] = useState<QuarterlyDividend[]>([])
  const [payoutRatioHistory, setPayoutRatioHistory] = useState<PayoutRatioHistory[]>([])
  const [cagrAnalysis, setCagrAnalysis] = useState<DividendCAGR[]>([])
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthMetrics | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'quarterly' | 'health'>('overview')
  const [historyTab, setHistoryTab] = useState<'yearly' | 'quarterly'>('yearly')

  const { formatStockPrice, formatPercentage, currency } = useCurrency()

  useEffect(() => {
    async function loadEnhancedDividendData() {
      setLoading(true)
      setError(null)

      try {
        console.log(`🔍 Loading enhanced dividend data for ${ticker}...`)
        
        const response = await fetch(`/api/dividends/${ticker}`)
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const data = await response.json()
        
        const historical = data.historical || {}
        const processedData: DividendData[] = Object.entries(historical)
          .map(([year, amount]) => ({
            year: parseInt(year),
            dividendPerShare: amount as number,
            growth: 0
          }))
          .sort((a, b) => a.year - b.year)

        processedData.forEach((entry, index) => {
          if (index > 0) {
            const prevAmount = processedData[index - 1].dividendPerShare
            if (prevAmount > 0) {
              entry.growth = ((entry.dividendPerShare - prevAmount) / prevAmount) * 100
            }
          }
        })

        setDividendData(processedData)
        setCurrentInfo(data.currentInfo)
        setQuarterlyHistory(data.quarterlyHistory || [])
        setPayoutRatioHistory(data.payoutRatioHistory || [])
        setCagrAnalysis(data.cagrAnalysis || [])
        setFinancialHealth(data.financialHealth)
        
        console.log(`✅ Enhanced data loaded: ${processedData.length} years, ${data.quarterlyHistory?.length || 0} quarters, Health: ${data.financialHealth ? 'Yes' : 'No'}`)
        
      } catch (error) {
        console.error('❌ Error loading enhanced dividend data:', error)
        setError('Fehler beim Laden der Dividendendaten')
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      loadEnhancedDividendData()
    }
  }, [ticker])

  const formatCurrencyDE = (value: number): string => {
    if (!value && value !== 0) return '–'
    return formatStockPrice(value, true)
  }

  const formatCurrencySimple = (value: number): string => {
    if (!value && value !== 0) return '–'
    return formatStockPrice(value, false)
  }

  const formatPercentDE = (value: number, showSign: boolean = false): string => {
    if (!value && value !== 0) return '–'
    return formatPercentage(value, showSign)
  }

  const formatRatioDE = (value: number, suffix: string = 'x'): string => {
    if (!value && value !== 0) return '–'
    return `${value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}${suffix}`
  }

  const getMetricColor = (value: number, thresholds: { good: number, ok: number }) => {
    if (value >= thresholds.good) return 'text-green-400'
    if (value >= thresholds.ok) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'Dividende' || name === 'dividendPerShare') {
      return [formatCurrencyDE(value), 'Dividende']
    }
    if (name === 'Wachstum' || name === 'growth') {
      return [formatPercentDE(value, true), 'Wachstum']
    }
    if (name === 'Payout Ratio' || name === 'payoutRatio') {
      return [formatPercentDE(value * 100), 'Payout Ratio']
    }
    return [value, name]
  }

  if (loading) {
    return (
      <div className="professional-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-theme-tertiary rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
            <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="professional-card p-6">
        <div className="flex items-center gap-3 text-red-400">
          <XCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header Card mit Key Metrics */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary">Dividenden-Analyse</h3>
          </div>
        </div>

        {/* Key Metrics in Boxen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-theme-secondary/10 border border-theme/20 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
    <div className="text-3xl font-bold text-green-400 mb-2">
      {currentInfo?.currentYield ? formatPercentDE(currentInfo.currentYield * 100) : 'N/A'}
    </div>
    <div className="text-sm text-theme-secondary font-semibold">Aktuelle Rendite</div>
  </div>

          <div className="bg-theme-tertiary/40 border border-theme/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendPerShareTTM ? formatCurrencyDE(currentInfo.dividendPerShareTTM) : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">TTM Dividende</div>
          </div>

          <div className="bg-theme-tertiary/40 border border-theme/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendGrowthRate ? formatPercentDE(currentInfo.dividendGrowthRate) : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Ø Wachstum (5J)</div>
          </div>

          <div className="bg-theme-tertiary/40 border border-theme/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {dividendData.length}
            </div>
            <div className="text-sm text-theme-secondary">Jahre Historie</div>
          </div>
        </div>

        {/* Main Dividend Chart mit Grid */}
        {dividendData.length > 0 && (
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dividendData.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis
                  dataKey="year"
                  stroke="rgb(148, 163, 184)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                />
                <YAxis
                  stroke="rgb(148, 163, 184)"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrencySimple(value)}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(55, 65, 81)',
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    color: 'rgb(243, 244, 246)'
                  }}
                  labelStyle={{ color: 'rgb(243, 244, 246)', fontWeight: 'bold' }}
                  formatter={formatTooltipValue}
                />
                <Line
                  type="monotone"
                  dataKey="dividendPerShare"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* CAGR Analysis Section in Boxen */}
      {cagrAnalysis.length > 0 && (
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            Dividendenwachstum (CAGR)
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cagrAnalysis.map((cagr) => (
              <div key={cagr.period} className="bg-theme-tertiary/40 border border-theme/10 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  cagr.cagr > 10 ? 'text-green-400' :
                  cagr.cagr > 5 ? 'text-blue-400' :
                  cagr.cagr > 0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentDE(cagr.cagr)}
                </div>
                <div className="text-sm text-theme-secondary font-medium">{cagr.period} CAGR</div>
                <div className="text-xs text-theme-muted mt-2 pt-2 border-t border-theme/10">
                  {formatCurrencyDE(cagr.startValue)} → {formatCurrencyDE(cagr.endValue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout Ratio Chart mit Grid */}
      {payoutRatioHistory.length > 0 && (
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Payout Ratio Entwicklung
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payoutRatioHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis
                  dataKey="year"
                  stroke="rgb(148, 163, 184)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                />
                <YAxis
                  stroke="rgb(148, 163, 184)"
                  fontSize={12}
                  tickFormatter={(value) => formatPercentDE(value * 100)}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(55, 65, 81)',
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    color: 'rgb(243, 244, 246)'
                  }}
                  formatter={formatTooltipValue}
                />
                <Area
                  type="monotone"
                  dataKey="payoutRatio"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Current Payout Ratio */}
          <div className="mt-4 p-4 bg-theme-tertiary/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-theme-secondary">Aktuelle Payout Ratio</span>
              <div className="flex items-center gap-3">
                <span className="text-theme-primary font-semibold">
                  {currentInfo?.payoutRatio ? formatPercentDE(currentInfo.payoutRatio * 100) : 'N/A'}
                </span>
                {currentInfo?.payoutSafety && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      currentInfo.payoutSafety.color === 'green' ? 'bg-green-400' :
                      currentInfo.payoutSafety.color === 'yellow' ? 'bg-yellow-400' :
                      currentInfo.payoutSafety.color === 'red' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      currentInfo.payoutSafety.color === 'green' ? 'text-green-400' :
                      currentInfo.payoutSafety.color === 'yellow' ? 'text-yellow-400' :
                      currentInfo.payoutSafety.color === 'red' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {currentInfo.payoutSafety.text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kernanalyse */}
      <div className="space-y-6">
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4">Kernanalyse</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Growth Trend Chart mit Grid */}
            {dividendData.length > 0 && (
              <div>
                <h5 className="text-lg font-semibold text-theme-primary mb-4">Wachstumstrend (20 Jahre)</h5>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dividendData.slice(-20).filter(d => d.year > dividendData.slice(-20)[0]?.year)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis
                        dataKey="year"
                        stroke="rgb(148, 163, 184)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                      />
                      <YAxis
                        stroke="rgb(148, 163, 184)"
                        fontSize={12}
                        tickFormatter={(value) => formatPercentDE(value)}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(55, 65, 81)',
                          border: '1px solid rgb(75, 85, 99)',
                          borderRadius: '12px',
                          color: 'rgb(243, 244, 246)'
                        }}
                        formatter={formatTooltipValue}
                      />
                      <Bar
                        dataKey="growth"
                        fill="#3B82F6"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Key Stats */}
            <div>
              <h5 className="text-lg font-semibold text-theme-primary mb-4">Kennzahlen</h5>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
                  <span className="text-theme-secondary">Dividenden-Qualität</span>
                  <span className="text-theme-primary font-semibold">
                    {currentInfo?.dividendQuality || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
                  <span className="text-theme-secondary">Jahre Historie</span>
                  <span className="text-theme-primary font-semibold">
                    {dividendData.length} Jahre
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Health */}
        {financialHealth && (
          <div className="professional-card p-6">
            <h4 className="text-lg font-bold text-theme-primary mb-4">Finanzielle Gesundheit</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                <div className="text-sm text-theme-secondary mb-1">FCF Coverage</div>
                <div className={`text-2xl font-bold ${getMetricColor(financialHealth.freeCashFlowCoverage, { good: 2, ok: 1 })}`}>
                  {formatRatioDE(financialHealth.freeCashFlowCoverage)}
                </div>
              </div>

              <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                <div className="text-sm text-theme-secondary mb-1">ROE</div>
                <div className={`text-2xl font-bold ${getMetricColor(financialHealth.roe, { good: 15, ok: 10 })}`}>
                  {formatPercentDE(financialHealth.roe)}
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>

      {/* Tabbed Dividend History */}
      <div className="professional-card p-6">
        {/* Tab Navigation */}
        <div className="border-b border-theme/20 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'yearly', label: 'Jährliche Historie', icon: DocumentTextIcon },
              { id: 'quarterly', label: 'Quartalsweise Historie', icon: CalendarIcon }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors font-medium ${
                    historyTab === tab.id
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {historyTab === 'yearly' ? (
          <div>
            <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" />
              Jährliche Dividenden-Historie
            </h4>
            
            <div className="overflow-hidden rounded-lg border border-theme">
              <table className="w-full">
                <thead className="bg-theme-tertiary/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Jahr</th>
                    <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Dividende/Aktie</th>
                    <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Wachstum</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendData.slice().reverse().map((row, index) => (
                    <tr key={row.year} className={`hover:bg-theme-tertiary/30 transition-colors ${
                      index !== dividendData.length - 1 ? 'border-b border-theme/50' : ''
                    }`}>
                      <td className="py-3 px-4 text-theme-primary font-semibold">{row.year}</td>
                      
                      <td className="py-3 px-4 text-right text-theme-primary font-medium">
                        {formatCurrencyDE(row.dividendPerShare)}
                      </td>
                      
                      <td className={`py-3 px-4 text-right font-semibold ${
                        row.growth > 0 ? 'text-green-400' : 
                        row.growth < 0 ? 'text-red-400' : 'text-theme-muted'
                      }`}>
                        {row.growth !== 0 ? formatPercentDE(row.growth, true) : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          quarterlyHistory.length > 0 ? (
            <div>
              <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Quartalsweise Dividenden-Historie
              </h4>
              
              <div className="overflow-hidden rounded-lg border border-theme">
                <table className="w-full">
                  <thead className="bg-theme-tertiary/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Datum</th>
                      <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Quartal</th>
                      <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Betrag</th>
                      <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Split-Adj.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyHistory.slice(0, 40).map((quarter, index) => (
                      <tr key={`${quarter.date}-${index}`} className="hover:bg-theme-tertiary/30 transition-colors border-b border-theme/50">
                        <td className="py-3 px-4 text-theme-primary font-medium">
                          {new Date(quarter.date).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-3 px-4 text-right text-theme-secondary">
                          {quarter.quarter} {quarter.year}
                        </td>
                        <td className="py-3 px-4 text-right text-theme-primary font-semibold">
                          {formatCurrencyDE(quarter.amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-400 font-medium">
                          {formatCurrencyDE(quarter.adjAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-theme-muted">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Keine quartalsweisen Daten verfügbar</p>
            </div>
          )
        )}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-theme-muted text-center mt-6 p-3 bg-theme-tertiary/30 rounded">
        <p>
          Analyse basiert auf historischen Daten. Dividenden können jederzeit angepasst werden. 
          Diese Darstellung stellt keine Anlageberatung dar.
        </p>
      </div>
    </div>
  )
}
