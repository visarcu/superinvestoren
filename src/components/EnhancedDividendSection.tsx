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
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext' // ✅ CURRENCY CONTEXT HINZUGEFÜGT

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

  // ✅ CURRENCY CONTEXT FÜR DEUTSCHE FORMATIERUNG
  const { formatStockPrice, formatPercentage, currency } = useCurrency()

  // ✅ Load enhanced dividend data
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
        
        // Parse historical data
        const historical = data.historical || {}
        const processedData: DividendData[] = Object.entries(historical)
          .map(([year, amount]) => ({
            year: parseInt(year),
            dividendPerShare: amount as number,
            growth: 0
          }))
          .sort((a, b) => a.year - b.year)

        // Calculate growth rates
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

  // ✅ DEUTSCHE FORMATIERUNG - Helper functions
  const formatCurrencyDE = (value: number): string => {
    if (!value && value !== 0) return '–'
    return formatStockPrice(value, true) // Mit Währungssymbol
  }

  const formatCurrencySimple = (value: number): string => {
    if (!value && value !== 0) return '–'
    return formatStockPrice(value, false) // Ohne Währungssymbol
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

  // ✅ DEUTSCHE TOOLTIP-FORMATIERUNG für Charts
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
      
      {/* ✅ CLEAN HEADER - No API details */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary">Dividenden-Analyse</h3>
          </div>
        </div>

        {/* ✅ DEUTSCHE FORMATIERUNG - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.currentYield ? formatPercentDE(currentInfo.currentYield * 100) : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Aktuelle Rendite</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendPerShareTTM ? formatCurrencyDE(currentInfo.dividendPerShareTTM) : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">TTM Dividende</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendGrowthRate ? formatPercentDE(currentInfo.dividendGrowthRate) : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Ø Wachstum (5 Jahre)</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {dividendData.length}
            </div>
            <div className="text-sm text-theme-secondary">Jahre Historie</div>
          </div>
        </div>

        {/* ✅ Main Dividend Chart - DEUTSCHE FORMATIERUNG */}
        {dividendData.length > 0 && (
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dividendData.slice(-10)}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickFormatter={(value) => formatCurrencySimple(value)}
                  className="text-theme-muted"
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

      {/* ✅ CAGR Analysis Section - DEUTSCHE FORMATIERUNG */}
      {cagrAnalysis.length > 0 && (
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            Dividendenwachstum (CAGR)
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {cagrAnalysis.map((cagr) => (
              <div key={cagr.period} className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  cagr.cagr > 10 ? 'text-green-400' :
                  cagr.cagr > 5 ? 'text-blue-400' :
                  cagr.cagr > 0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentDE(cagr.cagr)}
                </div>
                <div className="text-sm text-theme-secondary">{cagr.period} CAGR</div>
                <div className="text-xs text-theme-muted mt-1">
                  {formatCurrencyDE(cagr.startValue)} → {formatCurrencyDE(cagr.endValue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Payout Ratio Chart - DEUTSCHE FORMATIERUNG */}
      {payoutRatioHistory.length > 0 && (
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Payout Ratio Entwicklung
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payoutRatioHistory}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickFormatter={(value) => formatPercentDE(value * 100)}
                  className="text-theme-muted"
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
          
          {/* Current Payout Ratio with Safety Assessment - DEUTSCHE FORMATIERUNG */}
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

      {/* ✅ Tab Navigation */}
      <div className="professional-card">
        <div className="border-b border-theme/10">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Übersicht', icon: BanknotesIcon },
              { id: 'quarterly', label: 'Quartalsweise', icon: CalendarIcon },
              { id: 'health', label: 'Finanzstärke', icon: BuildingLibraryIcon }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
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

        {/* ✅ Tab Content - DEUTSCHE FORMATIERUNG */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Growth Trend Chart - DEUTSCHE FORMATIERUNG */}
              <div>
                <h5 className="text-lg font-semibold text-theme-primary mb-4">Wachstumstrend (10 Jahre)</h5>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dividendData.slice(-10).filter(d => d.year > dividendData.slice(-10)[0]?.year)}>
                      <XAxis 
                        dataKey="year" 
                        stroke="currentColor" 
                        fontSize={12}
                        className="text-theme-muted"
                      />
                      <YAxis 
                        stroke="currentColor" 
                        fontSize={12}
                        tickFormatter={(value) => formatPercentDE(value)}
                        className="text-theme-muted"
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

              {/* Key Statistics */}
              <div>
                <h5 className="text-lg font-semibold text-theme-primary mb-4">Kernkennzahlen</h5>
                <div className="space-y-4">
                  
                  <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
                    <span className="text-theme-secondary">Dividenden-Qualität</span>
                    <span className="text-theme-primary font-semibold">
                      {currentInfo?.dividendQuality || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
                    <span className="text-theme-secondary">Wachstumstrend</span>
                    <span className="text-theme-primary font-semibold">
                      {currentInfo?.growthTrend || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
                    <span className="text-theme-secondary">Jahre Historie</span>
                    <span className="text-theme-primary font-semibold">
                      {dividendData.length} Jahre
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
                    <span className="text-theme-secondary">Letzte Zahlung</span>
                    <span className="text-theme-primary font-semibold">
                      {currentInfo?.lastDividendDate ? 
                        new Date(currentInfo.lastDividendDate).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'short'
                        }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quarterly' && (
            <div>
              <h5 className="text-lg font-semibold text-theme-primary mb-4">Quartalsweise Dividendenhistorie</h5>
              
              {quarterlyHistory.length > 0 ? (
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
                      {quarterlyHistory.slice(0, 20).map((quarter, index) => (
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
              ) : (
                <div className="text-center py-8 text-theme-muted">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Keine quartalsweisen Daten verfügbar</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'health' && (
            <div>
              <h5 className="text-lg font-semibold text-theme-primary mb-4">Finanzielle Gesundheit</h5>
              
              {financialHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                    <div className="text-sm text-theme-secondary mb-1">FCF Coverage</div>
                    <div className={`text-2xl font-bold ${getMetricColor(financialHealth.freeCashFlowCoverage, { good: 2, ok: 1 })}`}>
                      {formatRatioDE(financialHealth.freeCashFlowCoverage)}
                    </div>
                  </div>

                  <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                    <div className="text-sm text-theme-secondary mb-1">Debt/Equity</div>
                    <div className={`text-2xl font-bold ${getMetricColor(1 / (financialHealth.debtToEquity + 0.001), { good: 0.5, ok: 0.3 })}`}>
                      {formatRatioDE(financialHealth.debtToEquity, '')}
                    </div>
                  </div>

                  <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                    <div className="text-sm text-theme-secondary mb-1">Interest Coverage</div>
                    <div className={`text-2xl font-bold ${getMetricColor(financialHealth.interestCoverage, { good: 10, ok: 3 })}`}>
                      {formatRatioDE(financialHealth.interestCoverage)}
                    </div>
                  </div>

                  <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                    <div className="text-sm text-theme-secondary mb-1">Current Ratio</div>
                    <div className={`text-2xl font-bold ${getMetricColor(financialHealth.currentRatio, { good: 2, ok: 1.2 })}`}>
                      {formatRatioDE(financialHealth.currentRatio, '')}
                    </div>
                  </div>

                  <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                    <div className="text-sm text-theme-secondary mb-1">ROE</div>
                    <div className={`text-2xl font-bold ${getMetricColor(financialHealth.roe, { good: 15, ok: 10 })}`}>
                      {formatPercentDE(financialHealth.roe)}
                    </div>
                  </div>

                  <div className="p-4 bg-theme-tertiary/30 rounded-lg">
                    <div className="text-sm text-theme-secondary mb-1">ROA</div>
                    <div className={`text-2xl font-bold ${getMetricColor(financialHealth.roa, { good: 10, ok: 5 })}`}>
                      {formatPercentDE(financialHealth.roa)}
                    </div>
                  </div>
                  
                </div>
              ) : (
                <div className="text-center py-8 text-theme-muted">
                  <BuildingLibraryIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Finanzielle Gesundheitsdaten nicht verfügbar</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Complete Historical Table - DEUTSCHE FORMATIERUNG */}
      <div className="professional-card p-6">
        <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          Vollständige Dividenden-Historie
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

      {/* ✅ COMPACT Disclaimer */}
      <div className="text-xs text-theme-muted text-center mt-6 p-3 bg-theme-tertiary/30 rounded">
        <p>
          Analyse basiert auf historischen Daten. Dividenden können jederzeit angepasst werden. 
          Diese Darstellung stellt keine Anlageberatung dar.
        </p>
      </div>
    </div>
  )
}