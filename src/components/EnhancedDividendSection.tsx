// src/components/EnhancedDividendSection.tsx
// DIVIDENDEN-ANALYSE - CLEAN INSIGHTS STYLE

'use client'

import React, { useState, useEffect } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'
import Link from 'next/link'

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

  if (loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-6 bg-neutral-800 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
                <div className="h-8 bg-neutral-800 rounded w-32"></div>
              </div>
            ))}
          </div>
          <div className="h-48 bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full px-6 lg:px-8 py-8 text-center">
        <p className="text-neutral-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  const name = stockName || ticker
  const currentYear = new Date().getFullYear()
  const lastYear = currentYear - 1
  const yearBefore = currentYear - 2
  const lastYearData = dividendData.find(d => d.year === lastYear)
  const yearBeforeData = dividendData.find(d => d.year === yearBefore)
  const lastQuarterly = quarterlyHistory.length > 0 ? quarterlyHistory[0] : null
  const quartersPerYear = quarterlyHistory.filter(q => q.year === lastYear).length
  const frequencyText = quartersPerYear === 4 ? 'quartalsweise' :
    quartersPerYear === 12 ? 'monatlich' :
    quartersPerYear === 2 ? 'halbjährlich' :
    quartersPerYear === 1 ? 'jährlich' : 'regelmäßig'
  const cagr5y = cagrAnalysis.find(c => c.period === '5Y')

  return (
    <div className="w-full px-6 lg:px-8 py-8">

      {/* ===== HEADER ===== */}
      <div className="mb-8 pb-6 border-b border-neutral-800">
        <h1 className="text-xl font-medium text-white mb-1">Dividenden-Analyse</h1>
        <p className="text-sm text-neutral-500">
          Dividendenhistorie, CAGR und Ausschüttungsmetriken für {ticker}
        </p>
      </div>

      {/* ===== KEY METRICS - FLAT GRID ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-neutral-800">
        <div>
          <p className="text-sm text-neutral-500 mb-1">Aktuelle Rendite</p>
          <p className="text-2xl font-bold text-emerald-400">
            {currentInfo?.currentYield ? formatPercentDE(currentInfo.currentYield * 100) : '–'}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-500 mb-1">TTM Dividende</p>
          <p className="text-2xl font-bold text-white">
            {currentInfo?.dividendPerShareTTM ? formatCurrencyDE(currentInfo.dividendPerShareTTM) : '–'}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-500 mb-1">Ø Wachstum (5J)</p>
          <p className={`text-2xl font-bold ${
            currentInfo?.dividendGrowthRate > 0 ? 'text-emerald-400' :
            currentInfo?.dividendGrowthRate < 0 ? 'text-red-400' : 'text-white'
          }`}>
            {currentInfo?.dividendGrowthRate ? formatPercentDE(currentInfo.dividendGrowthRate) : '–'}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-500 mb-1">Jahre Historie</p>
          <p className="text-2xl font-bold text-white">{dividendData.length || '–'}</p>
        </div>
      </div>

      {/* ===== DIVIDEND CHART ===== */}
      {dividendData.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Dividende pro Aktie
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dividendData.slice(-20)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" strokeOpacity={0.8} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v) => formatCurrencySimple(v)}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#a3a3a3' }}
                  formatter={(value: number) => [formatCurrencyDE(value), 'Dividende/Aktie']}
                />
                <Line
                  type="monotone"
                  dataKey="dividendPerShare"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ===== CAGR ANALYSIS ===== */}
      {cagrAnalysis.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Dividendenwachstum (CAGR)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {cagrAnalysis.map((cagr) => (
              <div key={cagr.period}>
                <p className="text-sm text-neutral-500 mb-1">{cagr.period}</p>
                <p className={`text-2xl font-bold ${
                  cagr.cagr > 10 ? 'text-emerald-400' :
                  cagr.cagr > 5 ? 'text-emerald-400' :
                  cagr.cagr > 0 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {formatPercentDE(cagr.cagr)}
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  {formatCurrencyDE(cagr.startValue)} → {formatCurrencyDE(cagr.endValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== FINANCIAL HEALTH ===== */}
      {financialHealth && (
        <div className="mb-12">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Finanzielle Gesundheit
          </h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-neutral-500 mb-1">FCF Coverage</p>
              <p className={`text-2xl font-bold ${
                financialHealth.freeCashFlowCoverage >= 2 ? 'text-emerald-400' :
                financialHealth.freeCashFlowCoverage >= 1 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {formatRatioDE(financialHealth.freeCashFlowCoverage)}
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                {financialHealth.freeCashFlowCoverage >= 2 ? 'Gut abgesichert' :
                 financialHealth.freeCashFlowCoverage >= 1 ? 'Solide gedeckt' : 'Knapp gedeckt'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">ROE</p>
              <p className={`text-2xl font-bold ${
                financialHealth.roe >= 15 ? 'text-emerald-400' :
                financialHealth.roe >= 10 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {formatPercentDE(financialHealth.roe)}
              </p>
              <p className="text-xs text-neutral-600 mt-1">Return on Equity</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== HISTORY TABLE ===== */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            {historyTab === 'yearly' ? 'Jährliche Historie' : 'Quartalsweise Historie'}
          </h2>
          <div className="flex items-center gap-1 p-0.5 bg-neutral-800/60 rounded-lg">
            {[
              { id: 'yearly', label: 'Jährlich' },
              { id: 'quarterly', label: 'Quartalsweise' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHistoryTab(tab.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  historyTab === tab.id
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {historyTab === 'yearly' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-3 text-sm font-medium text-neutral-500">Jahr</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Dividende/Aktie</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Wachstum</th>
                </tr>
              </thead>
              <tbody>
                {dividendData.slice().reverse().map((row) => (
                  <tr key={row.year} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white font-medium">{row.year}</td>
                    <td className="py-3 text-right text-sm text-white font-mono">
                      {formatCurrencyDE(row.dividendPerShare)}
                    </td>
                    <td className={`py-3 text-right text-sm font-mono font-medium ${
                      row.growth > 0 ? 'text-emerald-400' :
                      row.growth < 0 ? 'text-red-400' : 'text-neutral-500'
                    }`}>
                      {row.growth !== 0 ? formatPercentDE(row.growth, true) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : quarterlyHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-3 text-sm font-medium text-neutral-500">Datum</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Quartal</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Betrag</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Split-Adj.</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyHistory.slice(0, 40).map((quarter, index) => (
                  <tr key={`${quarter.date}-${index}`} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">
                      {new Date(quarter.date).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 text-right text-sm text-neutral-400">
                      {quarter.quarter} {quarter.year}
                    </td>
                    <td className="py-3 text-right text-sm text-white font-mono">
                      {formatCurrencyDE(quarter.amount)}
                    </td>
                    <td className="py-3 text-right text-sm text-emerald-400 font-mono font-medium">
                      {formatCurrencyDE(quarter.adjAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">Keine quartalsweisen Daten verfügbar</p>
          </div>
        )}
      </div>

      {/* ===== UPGRADE BANNER FOR FREE USERS ===== */}
      {!isPremium && (
        <Link
          href="/pricing"
          className="flex items-center justify-between gap-4 px-4 py-3 mb-12 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <LockClosedIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-300">Vollständige Dividendenanalyse freischalten</p>
              <p className="text-xs text-amber-400/70">Mit Premium siehst du erweiterte CAGR-Vergleiche, FCF-Coverage und mehr</p>
            </div>
          </div>
          <span className="text-xs font-medium text-amber-400 whitespace-nowrap">Premium freischalten →</span>
        </Link>
      )}

      {/* ===== FAQ ===== */}
      {(() => {
        const faqs: { question: string; answer: string }[] = []

        if (quartersPerYear > 0) {
          faqs.push({
            question: `Wie oft zahlt ${name} Dividenden?`,
            answer: `${name} schüttet die Dividenden ${frequencyText} aus.`
          })
        }
        if (currentInfo?.currentYield) {
          faqs.push({
            question: `Wie hoch ist die Dividendenrendite von ${name}?`,
            answer: `Die aktuelle Dividendenrendite liegt bei ${formatPercentDE(currentInfo.currentYield * 100)}.`
          })
        }
        if (currentInfo?.dividendPerShareTTM) {
          faqs.push({
            question: `Wie viel Dividende zahlt ${name} pro Aktie?`,
            answer: `Die jährliche Dividende (TTM) beträgt ${formatCurrencyDE(currentInfo.dividendPerShareTTM)} pro Aktie.`
          })
        }
        if (lastYearData) {
          faqs.push({
            question: `Wie hoch war die Dividende von ${name} in ${lastYear}?`,
            answer: `Im Jahr ${lastYear} wurden ${formatCurrencyDE(lastYearData.dividendPerShare)} pro Aktie als Dividende ausgeschüttet.`
          })
        }
        if (yearBeforeData) {
          faqs.push({
            question: `Wie hoch war die Dividende von ${name} in ${yearBefore}?`,
            answer: `Im Jahr ${yearBefore} wurden ${formatCurrencyDE(yearBeforeData.dividendPerShare)} pro Aktie als Dividende ausgeschüttet.`
          })
        }
        if (lastQuarterly) {
          const lastDate = new Date(lastQuarterly.date).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          })
          faqs.push({
            question: `Wann wurde die letzte Dividende von ${name} gezahlt?`,
            answer: `Die letzte Dividendenzahlung erfolgte am ${lastDate} in Höhe von ${formatCurrencyDE(lastQuarterly.amount)}.`
          })
        }
        if (dividendData.length > 0) {
          faqs.push({
            question: `Wie lange zahlt ${name} schon Dividenden?`,
            answer: `${name} hat eine Dividendenhistorie von ${dividendData.length} Jahren (seit ${dividendData[0].year}).`
          })
        }
        if (cagr5y) {
          faqs.push({
            question: `Wie stark wächst die Dividende von ${name}?`,
            answer: `Die Dividende ist in den letzten 5 Jahren um durchschnittlich ${formatPercentDE(cagr5y.cagr)} pro Jahr gewachsen (CAGR).`
          })
        }
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
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
              Häufig gestellte Fragen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-neutral-800 rounded-lg p-5 hover:border-neutral-700 transition-colors"
                >
                  <h4 className="text-sm font-medium text-white mb-2 leading-snug">
                    {faq.question}
                  </h4>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ===== FOOTER ===== */}
      <div className="pt-6 border-t border-neutral-800">
        <p className="text-xs text-neutral-600 text-center">
          Analyse basiert auf historischen Daten. Dividenden können jederzeit angepasst werden.
          Diese Darstellung stellt keine Anlageberatung dar.
        </p>
      </div>
    </div>
  )
}
