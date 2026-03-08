// src/components/EnhancedDividendSection.tsx
// DIVIDENDEN-ANALYSE - FEY/QUARTR CLEAN STYLE

'use client'

import React, { useState, useEffect } from 'react'
import {
  BanknotesIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
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
  roe: number
}

interface EnhancedDividendSectionProps {
  ticker: string
  stockName?: string
  isPremium?: boolean
}

export default function EnhancedDividendSection({
  ticker,
  stockName,
  isPremium = false
}: EnhancedDividendSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dividendData, setDividendData] = useState<DividendData[]>([])
  const [currentInfo, setCurrentInfo] = useState<any>(null)
  const [quarterlyHistory, setQuarterlyHistory] = useState<QuarterlyDividend[]>([])
  const [cagrAnalysis, setCagrAnalysis] = useState<DividendCAGR[]>([])
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthMetrics | null>(null)
  const [historyTab, setHistoryTab] = useState<'yearly' | 'quarterly'>('yearly')

  const { formatStockPrice, formatPercentage } = useCurrency()

  useEffect(() => {
    async function loadEnhancedDividendData() {
      setLoading(true)
      setError(null)

      try {
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
        setCagrAnalysis(data.cagrAnalysis || [])
        setFinancialHealth(data.financialHealth)

      } catch (error) {
        console.error('Error loading dividend data:', error)
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

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'Dividende' || name === 'dividendPerShare') {
      return [formatCurrencyDE(value), 'Dividende']
    }
    if (name === 'Wachstum' || name === 'growth') {
      return [formatPercentDE(value, true), 'Wachstum']
    }
    return [value, name]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-theme-card rounded-xl border border-theme-light p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-theme-secondary/50 rounded w-48"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-20 bg-theme-secondary/30 rounded-lg"></div>
              ))}
            </div>
            <div className="h-48 bg-theme-secondary/20 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-theme-card rounded-xl border border-theme-light p-6">
        <div className="flex items-center gap-3 text-red-400">
          <XCircleIcon className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header Card - Key Metrics */}
      <div className="bg-theme-card rounded-xl border border-theme-light">
        <div className="p-5 border-b border-theme-light">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-theme-primary">Dividenden-Analyse</h3>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-emerald-500 mb-1">
                {currentInfo?.currentYield ? formatPercentDE(currentInfo.currentYield * 100) : '–'}
              </div>
              <div className="text-xs text-theme-muted">Aktuelle Rendite</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-semibold text-theme-primary mb-1">
                {currentInfo?.dividendPerShareTTM ? formatCurrencyDE(currentInfo.dividendPerShareTTM) : '–'}
              </div>
              <div className="text-xs text-theme-muted">TTM Dividende</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-semibold text-theme-primary mb-1">
                {currentInfo?.dividendGrowthRate ? formatPercentDE(currentInfo.dividendGrowthRate) : '–'}
              </div>
              <div className="text-xs text-theme-muted">Ø Wachstum (5J)</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-semibold text-theme-primary mb-1">
                {dividendData.length}
              </div>
              <div className="text-xs text-theme-muted">Jahre Historie</div>
            </div>
          </div>

          {/* Main Dividend Chart */}
          {dividendData.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dividendData.slice(-20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="year"
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickFormatter={(value) => formatCurrencySimple(value)}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={formatTooltipValue}
                  />
                  <Line
                    type="monotone"
                    dataKey="dividendPerShare"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3B82F6' }}
                    activeDot={{ r: 5, fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* CAGR Analysis */}
      {cagrAnalysis.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme-light">
          <div className="p-5 border-b border-theme-light">
            <div className="flex items-center gap-3">
              <ArrowTrendingUpIcon className="w-4 h-4 text-theme-muted" />
              <h4 className="text-sm font-semibold text-theme-primary">Dividendenwachstum (CAGR)</h4>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cagrAnalysis.map((cagr) => (
                <div key={cagr.period} className="text-center p-4 bg-theme-secondary/20 rounded-lg">
                  <div className={`text-xl font-semibold mb-1 ${
                    cagr.cagr > 10 ? 'text-emerald-500' :
                    cagr.cagr > 5 ? 'text-blue-400' :
                    cagr.cagr > 0 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {formatPercentDE(cagr.cagr)}
                  </div>
                  <div className="text-xs text-theme-muted font-medium">{cagr.period} CAGR</div>
                  <div className="text-xs text-theme-muted mt-2 pt-2 border-t border-theme-light">
                    {formatCurrencyDE(cagr.startValue)} → {formatCurrencyDE(cagr.endValue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Health */}
      {financialHealth && (
        <div className="bg-theme-card rounded-xl border border-theme-light">
          <div className="p-5 border-b border-theme-light">
            <h4 className="text-sm font-semibold text-theme-primary">Finanzielle Gesundheit</h4>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-theme-muted mb-1">FCF Coverage</div>
                <div className={`text-xl font-semibold ${
                  financialHealth.freeCashFlowCoverage >= 2 ? 'text-emerald-500' :
                  financialHealth.freeCashFlowCoverage >= 1 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {formatRatioDE(financialHealth.freeCashFlowCoverage)}
                </div>
              </div>
              <div>
                <div className="text-xs text-theme-muted mb-1">ROE</div>
                <div className={`text-xl font-semibold ${
                  financialHealth.roe >= 15 ? 'text-emerald-500' :
                  financialHealth.roe >= 10 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {formatPercentDE(financialHealth.roe)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tabs */}
      <div className="bg-theme-card rounded-xl border border-theme-light">
        {/* Tab Navigation */}
        <div className="p-4 border-b border-theme-light">
          <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
            {[
              { id: 'yearly', label: 'Jährliche Historie', icon: DocumentTextIcon },
              { id: 'quarterly', label: 'Quartalsweise Historie', icon: CalendarIcon }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = historyTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-theme-card text-theme-primary shadow-sm'
                      : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {historyTab === 'yearly' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Jahr</th>
                    <th className="text-right py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Dividende/Aktie</th>
                    <th className="text-right py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Wachstum</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendData.slice().reverse().map((row) => (
                    <tr key={row.year} className="border-b border-theme-light last:border-0 hover:bg-theme-secondary/10 transition-colors">
                      <td className="py-3 text-sm text-theme-primary font-medium">{row.year}</td>
                      <td className="py-3 text-right text-sm text-theme-primary">
                        {formatCurrencyDE(row.dividendPerShare)}
                      </td>
                      <td className={`py-3 text-right text-sm font-medium ${
                        row.growth > 0 ? 'text-emerald-500' :
                        row.growth < 0 ? 'text-red-400' : 'text-theme-muted'
                      }`}>
                        {row.growth !== 0 ? formatPercentDE(row.growth, true) : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            quarterlyHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-theme-light">
                      <th className="text-left py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Datum</th>
                      <th className="text-right py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Quartal</th>
                      <th className="text-right py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Betrag</th>
                      <th className="text-right py-3 text-xs font-medium text-theme-muted uppercase tracking-wider">Split-Adj.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyHistory.slice(0, 40).map((quarter, index) => (
                      <tr key={`${quarter.date}-${index}`} className="border-b border-theme-light last:border-0 hover:bg-theme-secondary/10 transition-colors">
                        <td className="py-3 text-sm text-theme-primary">
                          {new Date(quarter.date).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-3 text-right text-sm text-theme-muted">
                          {quarter.quarter} {quarter.year}
                        </td>
                        <td className="py-3 text-right text-sm text-theme-primary">
                          {formatCurrencyDE(quarter.amount)}
                        </td>
                        <td className="py-3 text-right text-sm text-emerald-500 font-medium">
                          {formatCurrencyDE(quarter.adjAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-theme-muted opacity-50" />
                <p className="text-sm text-theme-muted">Keine quartalsweisen Daten verfügbar</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Häufig gestellte Fragen */}
      {(() => {
        const name = stockName || ticker
        const currentYear = new Date().getFullYear()
        const lastYear = currentYear - 1
        const yearBefore = currentYear - 2

        const lastYearData = dividendData.find(d => d.year === lastYear)
        const yearBeforeData = dividendData.find(d => d.year === yearBefore)
        const lastQuarterly = quarterlyHistory.length > 0 ? quarterlyHistory[0] : null

        // Determine frequency from quarterly data
        const quartersPerYear = quarterlyHistory.filter(q => q.year === lastYear).length
        const frequencyText = quartersPerYear === 4 ? 'quartalsweise' :
          quartersPerYear === 12 ? 'monatlich' :
          quartersPerYear === 2 ? 'halbjährlich' :
          quartersPerYear === 1 ? 'jährlich' : 'regelmäßig'

        const cagr5y = cagrAnalysis.find(c => c.period === '5Y')

        const faqs: { question: string; answer: string }[] = []

        // 1. Frequency
        if (quartersPerYear > 0) {
          faqs.push({
            question: `Wie oft zahlt ${name} Dividenden?`,
            answer: `${name} schüttet die Dividenden ${frequencyText} aus.`
          })
        }

        // 2. Current yield
        if (currentInfo?.currentYield) {
          faqs.push({
            question: `Wie hoch ist die Dividendenrendite von ${name}?`,
            answer: `Die aktuelle Dividendenrendite liegt bei ${formatPercentDE(currentInfo.currentYield * 100)}.`
          })
        }

        // 3. TTM dividend
        if (currentInfo?.dividendPerShareTTM) {
          faqs.push({
            question: `Wie viel Dividende zahlt ${name} pro Aktie?`,
            answer: `Die jährliche Dividende (TTM) beträgt ${formatCurrencyDE(currentInfo.dividendPerShareTTM)} pro Aktie.`
          })
        }

        // 4. Last year dividend
        if (lastYearData) {
          faqs.push({
            question: `Wie hoch war die Dividende von ${name} in ${lastYear}?`,
            answer: `Im Jahr ${lastYear} wurden ${formatCurrencyDE(lastYearData.dividendPerShare)} pro Aktie als Dividende ausgeschüttet.`
          })
        }

        // 5. Year before dividend
        if (yearBeforeData) {
          faqs.push({
            question: `Wie hoch war die Dividende von ${name} in ${yearBefore}?`,
            answer: `Im Jahr ${yearBefore} wurden ${formatCurrencyDE(yearBeforeData.dividendPerShare)} pro Aktie als Dividende ausgeschüttet.`
          })
        }

        // 6. Last payment date
        if (lastQuarterly) {
          const lastDate = new Date(lastQuarterly.date).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          })
          faqs.push({
            question: `Wann wurde die letzte Dividende von ${name} gezahlt?`,
            answer: `Die letzte Dividendenzahlung erfolgte am ${lastDate} in Höhe von ${formatCurrencyDE(lastQuarterly.amount)}.`
          })
        }

        // 7. History length
        if (dividendData.length > 0) {
          faqs.push({
            question: `Wie lange zahlt ${name} schon Dividenden?`,
            answer: `${name} hat eine Dividendenhistorie von ${dividendData.length} Jahren${dividendData.length > 0 ? ` (seit ${dividendData[0].year})` : ''}.`
          })
        }

        // 8. Growth
        if (cagr5y) {
          faqs.push({
            question: `Wie stark wächst die Dividende von ${name}?`,
            answer: `Die Dividende ist in den letzten 5 Jahren um durchschnittlich ${formatPercentDE(cagr5y.cagr)} pro Jahr gewachsen (CAGR).`
          })
        }

        // 9. FCF Coverage / Safety
        if (financialHealth?.freeCashFlowCoverage) {
          const coverage = financialHealth.freeCashFlowCoverage
          const safetyText = coverage >= 2 ? 'gut abgesichert' :
            coverage >= 1.5 ? 'solide gedeckt' :
            coverage >= 1 ? 'knapp gedeckt' : 'nicht vollständig gedeckt'
          faqs.push({
            question: `Ist die Dividende von ${name} sicher?`,
            answer: `Mit einer FCF-Coverage von ${formatRatioDE(coverage)} ist die Dividende ${safetyText} durch den freien Cashflow.`
          })
        }

        if (faqs.length === 0) return null

        return (
          <div>
            <h3 className="text-base font-semibold text-theme-primary mb-4">
              Häufig gestellte Fragen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-theme-card rounded-xl border border-theme-light p-5 hover:border-emerald-500/30 transition-colors"
                >
                  <h4 className="text-sm font-semibold text-theme-primary mb-2 leading-snug">
                    {faq.question}
                  </h4>
                  <p className="text-sm text-theme-muted leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Disclaimer */}
      <p className="text-xs text-theme-muted text-center">
        Analyse basiert auf historischen Daten. Dividenden können jederzeit angepasst werden.
        Diese Darstellung stellt keine Anlageberatung dar.
      </p>
    </div>
  )
}
