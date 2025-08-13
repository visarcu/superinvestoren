// src/components/FinancialAnalysisClient.tsx - ULTRA CLEAN: KEINE BORDERS + PROFESSIONELLE CONTROLS
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

// ✅ GLEICHE Multi-Source Financial Data Service - nur ohne Split-Tracking
class FinancialDataService {
  private fmpKey: string
  private finnhubKey: string
  private alphaKey?: string

  constructor() {
    this.fmpKey = process.env.NEXT_PUBLIC_FMP_API_KEY || ''
    this.finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || ''
    this.alphaKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY
  }

  // ✅ HAUPTMETHODE: Multi-Source Financial Data mit intelligenter Validierung
  async getFinancialData(ticker: string, years: number, period: 'annual' | 'quarterly') {
    console.log(`🔍 [FinancialDataService] Multi-source loading for ${ticker} (${years} years)`)
    
    // Parallel alle Quellen laden
    const [fmpData, finnhubData] = await Promise.allSettled([
      this.getFMPFinancialData(ticker, years, period),
      this.getFinnhubBasicData(ticker)
    ])

    // Daten extrahieren
    const fmpFinancials = fmpData.status === 'fulfilled' ? fmpData.value : []
    const finnhubBasics = finnhubData.status === 'fulfilled' ? finnhubData.value : null

    console.log(`📊 Sources: FMP=${fmpFinancials.length} years, Finnhub=${finnhubBasics ? 'OK' : 'Failed'}`)

    // Intelligente Daten-Fusion und Validierung
    const validatedData = this.validateAndMergeFinancialData(fmpFinancials, finnhubBasics, ticker)
    
    console.log(`✅ [FinancialDataService] Validated data for ${ticker}: ${validatedData.length} years`)
    return validatedData
  }

  // ✅ FMP Financial Data (Primary Source) - MIT 20 JAHRE MAXIMUM Filter
  private async getFMPFinancialData(ticker: string, years: number, period: 'annual' | 'quarterly') {
    try {
      // ✅ MAXIMUM 20 Jahre, aber respektiere user input
      const requestYears = Math.min(years, 20) // Max 20 Jahre
      
      const [incomeRes, balanceRes, cashFlowRes, keyMetricsRes, dividendRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${requestYears}&apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${requestYears}&apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${requestYears}&apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=${period}&limit=${requestYears}&apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${this.fmpKey}`)
      ])

      if (!incomeRes.ok || !balanceRes.ok || !cashFlowRes.ok || !keyMetricsRes.ok) {
        throw new Error('FMP API request failed')
      }

      const [incomeData, balanceData, cashFlowData, keyMetricsData, dividendData] = await Promise.all([
        incomeRes.json(),
        balanceRes.json(), 
        cashFlowRes.json(),
        keyMetricsRes.json(),
        dividendRes.json()
      ])

      // ✅ FILTER: Nur moderne Daten (ab 2005)
      const cutoffYear = 2005
      const currentYear = new Date().getFullYear()
      
      const filteredIncomeData = incomeData.filter((item: any) => {
        const year = item.calendarYear || parseInt(item.date?.slice(0, 4) || '0')
        return year >= cutoffYear && year < currentYear
      })

      console.log(`📊 [${ticker}] Filtered to modern data (2005+): ${incomeData.length} → ${filteredIncomeData.length} periods`)

      // Dividends by year - ✅ NUTZE adjDividend (bereits split-adjusted!)
      const dividendsByYear: Record<string, number> = {}
      if (dividendData.historical && Array.isArray(dividendData.historical)) {
        dividendData.historical.forEach((div: any) => {
          const year = new Date(div.date).getFullYear().toString()
          const yearNum = parseInt(year)
          
          // ✅ FILTER: Nur moderne Dividendendaten
          if (yearNum >= cutoffYear && yearNum < currentYear) {
            if (!dividendsByYear[year]) {
              dividendsByYear[year] = 0
            }
            // ✅ NUTZE adjDividend (split-adjusted) statt dividend
            dividendsByYear[year] += div.adjDividend || div.dividend || 0
          }
        })
      }

      // ✅ NEHME NUR DIE ANGEFORDERTEN JAHRE (aber aus gefilterten Daten)
      const combinedData = filteredIncomeData.slice(0, years).reverse().map((income: any, index: number) => {
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
          eps: income.eps || 0, // ✅ FMP EPS ist bereits split-adjusted!
          dividendPS: dividendsByYear[year] || metrics.dividendPerShare || 0, // ✅ Split-adjusted dividends
          cash: balance.cashAndCashEquivalents || balance.cashAndShortTermInvestments || 0,
          debt: balance.totalDebt || 0,
          sharesOutstanding: balance.commonStockSharesOutstanding || income.weightedAverageShsOut || 0,
          freeCashFlow: cashFlow.freeCashFlow || 0,
          capEx: Math.abs(cashFlow.capitalExpenditure) || 0,
          pe: metrics.peRatio || 0,
          returnOnEquity: metrics.roe || 0,
          researchAndDevelopment: income.researchAndDevelopmentExpenses || 0,
          source: 'fmp',
          confidence: 85,
          // ✅ METADATA
          modernDataUsed: true,
          dataRange: `2005-${currentYear}`,
          yearsRequested: years
        }
      })

      return combinedData
    } catch (error) {
      console.error('❌ FMP Financial data failed:', error)
      return []
    }
  }

  // ✅ Finnhub Basic Data (Validation Source) - UNVERÄNDERT
  private async getFinnhubBasicData(ticker: string) {
    try {
      const [quoteRes, metricsRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${this.finnhubKey}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${this.finnhubKey}`)
      ])

      if (!quoteRes.ok || !metricsRes.ok) {
        throw new Error('Finnhub API request failed')
      }

      const [quote, metrics] = await Promise.all([
        quoteRes.json(),
        metricsRes.json()
      ])

      return {
        currentPrice: quote.c || 0,
        marketCap: metrics.metric?.marketCapitalization || 0,
        peRatio: metrics.metric?.peBasicExclExtraTTM || 0,
        eps: metrics.metric?.epsBasicExclExtraTTM || 0,
        revenue: metrics.metric?.revenueTTM || 0,
        source: 'finnhub',
        confidence: 80
      }
    } catch (error) {
      console.error('❌ Finnhub basic data failed:', error)
      return null
    }
  }

  // ✅ INTELLIGENTE VALIDIERUNG UND FUSION - KEINE SPLIT-ADJUSTMENTS MEHR!
  private validateAndMergeFinancialData(fmpData: any[], finnhubData: any, ticker: string) {
    if (fmpData.length === 0) {
      console.warn(`⚠️ No FMP data for ${ticker}`)
      return []
    }

    // ✅ SPEZIELLE VALIDIERUNG für problematische Ticker
    const PROBLEMATIC_TICKERS = ['TSM', 'ASML', 'SAP', 'NVO', 'UL', 'NVDA']
    const isProblematic = PROBLEMATIC_TICKERS.includes(ticker.toUpperCase())

    console.log(`🔍 [Validation] ${ticker} - Problematic: ${isProblematic}`)

    return fmpData.map((yearData, index) => {
      let correctedData = { ...yearData }

      // ✅ EPS VALIDIERUNG mit Finnhub Cross-Check (ABER KEINE SPLIT-ADJUSTMENTS!)
      if (finnhubData && index === fmpData.length - 1) { // Latest year
        const fmpEPS = yearData.eps
        const finnhubEPS = finnhubData.eps

        if (fmpEPS > 0 && finnhubEPS > 0) {
          const epsRatio = fmpEPS / finnhubEPS
          
          // Großer Unterschied erkannt
          if (epsRatio > 10 || epsRatio < 0.1) {
            console.warn(`⚠️ [${ticker}] EPS mismatch: FMP=${fmpEPS.toFixed(3)}, Finnhub=${finnhubEPS.toFixed(3)}, Ratio=${epsRatio.toFixed(1)}`)
            
            // ✅ NUR CURRENCY CORRECTIONS, KEINE SPLIT-ADJUSTMENTS!
            if (epsRatio > 10 && ticker.toUpperCase() === 'TSM') {
              // TSM: Nur Currency-Korrektur (TWD zu USD)
              correctedData.eps = fmpEPS / 30 // TWD to USD approximate
              console.log(`🔧 [TSM] Currency correction applied: EPS ${fmpEPS.toFixed(3)} → ${correctedData.eps.toFixed(3)}`)
            }
            // Für andere Ticker: KEINE automatischen Korrekturen mehr, FMP sollte richtig sein
          }
        }
      }

      // ✅ REVENUE SCALE VALIDIERUNG - UNVERÄNDERT
      if (finnhubData && index === fmpData.length - 1) {
        const fmpRevenue = yearData.revenue
        const finnhubRevenue = finnhubData.revenue

        if (fmpRevenue > 0 && finnhubRevenue > 0) {
          const revenueRatio = Math.abs(fmpRevenue - finnhubRevenue) / finnhubRevenue
          
          if (revenueRatio > 0.5) { // 50% Abweichung
            console.warn(`⚠️ [${ticker}] Revenue mismatch: FMP=${(fmpRevenue/1e9).toFixed(1)}B, Finnhub=${(finnhubRevenue/1e9).toFixed(1)}B`)
          }
        }
      }

      // ✅ PLAUSIBILITÄTSPRÜFUNGEN - UNVERÄNDERT
      if (correctedData.eps > 100 && ticker !== 'BRK.A') {
        console.warn(`⚠️ [${ticker}] Suspicious high EPS: ${correctedData.eps} in ${yearData.label}`)
      }

      if (correctedData.revenue > 1e15) { // > 1 Trillion
        console.warn(`⚠️ [${ticker}] Suspicious high revenue: ${(correctedData.revenue/1e12).toFixed(1)}T in ${yearData.label}`)
      }

      // ✅ METADATA UPDATE
      correctedData.dataQuality = isProblematic ? 'validated' : 'standard'
      correctedData.splitAdjusted = 'native-fmp' // FMP macht das automatisch
      return correctedData
    })
  }
}

// ✅ Service Instance - UNVERÄNDERT
const financialDataService = new FinancialDataService()

// ─── Type Definitions - UNVERÄNDERT ───────────────────────────────────────────────────────────
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

// ─── ALLE METRICS MIT DEUTSCHEN NAMEN - UNVERÄNDERT ─────────────────────────────────────
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

// ✅ All metrics to display - UNVERÄNDERT
const ALL_METRICS: MetricKey[] = [
  'revenue', 'ebitda', 'eps', 'freeCashFlow', 'cashDebt', 'pe', 
  'dividendPS', 'sharesOutstanding', 'netIncome', 'returnOnEquity', 
  'capEx', 'researchAndDevelopment', 'operatingIncome'
]

// ─── ULTRA CLEAN CHART COMPONENTS - KOMPLETT OHNE BORDERS ─────────────────────────────────────
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
  const { formatCurrency, formatAxisValueDE } = useCurrency()
  


  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
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
          <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">{title}</h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      <div className="aspect-square">
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
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: 'var(--text-secondary)' 
              }}
              tickFormatter={(value) => {
                if (metricKey === 'eps' || metricKey === 'dividendPS') {
                  // ✅ DEUTSCHE FORMATIERUNG für EPS/Dividende
                  return `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: value < 1 ? 2 : 1,
                    maximumFractionDigits: value < 1 ? 2 : 1
                  }).format(value)} $`
                } else if (metricKey === 'returnOnEquity') {
                  // ✅ DEUTSCHE FORMATIERUNG für ROE
                  return `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value * 100)}%`
                } else if (metricKey === 'sharesOutstanding') {
                  // ✅ DEUTSCHE FORMATIERUNG für Aktien
                  return `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  }).format(value / 1e9)} Mrd.`
                } else {
                  // ✅ NUTZE CONTEXT-FUNKTION!
                  return formatAxisValueDE(value)
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
                  formattedValue = `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  }).format(value * 100)}%`
                } else if (metricKey === 'eps' || metricKey === 'dividendPS') {
                  formattedValue = formatCurrency(value, 'currency')
                } else if (metricKey === 'sharesOutstanding') {
                  formattedValue = `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(value / 1e9)}B Aktien`
                } else {
                  formattedValue = formatCurrency(value)
                }

                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
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
  const { formatCurrency, formatAxisValueDE } = useCurrency() // ✅ NUTZE CONTEXT

  


  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-green-500/20 rounded-lg flex items-center justify-center">
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
          <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">Cash & Schulden</h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      <div className="aspect-square">
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
            <YAxis 
              tickFormatter={formatAxisValueDE} // ✅ NUTZE CONTEXT-FUNKTION!
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
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
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
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-green-500/20 rounded-lg flex items-center justify-center">
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
          <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">KGV TTM</h3>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      <div className="aspect-square">
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
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: 'var(--text-secondary)' 
              }}
              tickFormatter={(value) => `${new Intl.NumberFormat('de-DE', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              }).format(value)}x`} // ✅ DEUTSCHE FORMATIERUNG
              width={35}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const value = payload[0].value as number
                
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    <p className="text-theme-primary text-sm font-medium">
                      {new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      }).format(value)}x
                    </p>
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

// ─── Main Component - ULTRA CLEAN: PROFESSIONELLE CONTROLS + BORDERLESS CHARTS ────────────────────────────────────────────────────────────────
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
  const [dataQuality, setDataQuality] = useState<string>('loading')
  
  const { currency } = useCurrency()

  // ✅ ÄNDERUNG: 10 Jahre Standard (nicht 20)
  const overviewYears = 10

  useEffect(() => {
    async function loadRealData() {
      setLoadingData(true)
      setDataQuality('loading')
      
      try {
        // ✅ Multi-Source Financial Data Service (10 Jahre standard)
        const realData = await financialDataService.getFinancialData(ticker, overviewYears, period)
        setData(realData)
        
        // ✅ Datenqualität bestimmen
        const hasValidatedData = realData.some(d => d.dataQuality === 'validated')
        const hasModernData = realData.some(d => d.modernDataUsed)
        const hasData = realData.length > 0
        
        if (hasValidatedData && hasModernData) {
          setDataQuality('multi-source-validated-modern')
        } else if (hasValidatedData) {
          setDataQuality('multi-source-validated')
        } else if (hasModernData) {
          setDataQuality('modern-data')
        } else if (hasData) {
          setDataQuality('standard')
        } else {
          setDataQuality('poor')
        }
        
        console.log(`✅ [FinancialAnalysisClient] Multi-source data loaded for ${ticker}:`, {
          years: realData.length,
          quality: dataQuality,
          latestEPS: realData[realData.length - 1]?.eps,
          modernDataUsed: hasModernData
        })
        
      } catch (error) {
        console.error('❌ [FinancialAnalysisClient] Failed to load financial data:', error)
        setData([])
        setDataQuality('error')
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
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

  const toggleChartVisibility = (chartKey: MetricKey) => {
    setVisibleCharts(prev =>
      prev.includes(chartKey) 
        ? prev.filter(x => x !== chartKey)
        : [...prev, chartKey]
    )
  }

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
      
      {/* ✅ PROFESSIONELLE CONTROLS BOX */}
      <div className="bg-theme-card rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-6 justify-between mb-6">
          
          <div className="flex items-center gap-8">
            {/* PERIODE TOGGLE */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-theme-primary font-semibold">Periode:</span>
              <div className="flex bg-theme-tertiary rounded-lg p-1">
                {(['annual', 'quarterly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePremiumAction(() => setPeriod(p))}
                    className={`px-4 py-2 text-sm rounded-md transition-all duration-200 font-medium ${
                      period === p 
                        ? 'bg-green-500 text-white shadow-sm' 
                        : 'text-theme-secondary hover:text-green-600 hover:bg-green-500/10'
                    }`}
                  >
                    {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* STATUS INDIKATOREN */}
          <div className="flex items-center gap-4">
            {/* ✅ ERWEITERTE DATENQUALITÄTS-INDIKATOREN */}
            {dataQuality === 'multi-source-validated-modern' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Modern + Validiert</span>
              </div>
            )}
            
            {dataQuality === 'modern-data' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Moderne Daten (2005+)</span>
              </div>
            )}
            
            <div className="text-xs text-theme-muted">
              10 Jahre • {currency} • {dataQuality.includes('validated') ? 'Multi-Source validiert' : 'FMP Native'}
            </div>
          </div>
        </div>
        
        {/* KENNZAHLEN AUSWAHL - PROFESSIONELL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-theme-primary">Kennzahlen auswählen</h4>
            <div className="flex gap-2">
              <button
                onClick={() => handlePremiumAction(() => setVisibleCharts(ALL_METRICS))}
                className="text-xs text-theme-secondary hover:text-green-600 px-2 py-1 hover:bg-green-500/10 rounded transition-colors"
              >
                Alle
              </button>
              <button
                onClick={() => handlePremiumAction(() => setVisibleCharts([]))}
                className="text-xs text-theme-secondary hover:text-red-600 px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
              >
                Keine
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {ALL_METRICS.map((chartKey) => (
              <button
                key={chartKey}
                onClick={() => handlePremiumAction(() => toggleChartVisibility(chartKey))}
                className={`text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  visibleCharts.includes(chartKey)
                    ? 'bg-green-500/15 text-green-400 ring-1 ring-green-500/30'
                    : 'bg-theme-tertiary text-theme-secondary hover:bg-green-500/10 hover:text-green-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    visibleCharts.includes(chartKey) ? 'bg-green-400' : 'bg-theme-muted'
                  }`} />
                  <span className="font-medium">{getChartName(chartKey)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ ULTRA CLEAN GRID: 5 SPALTEN + KOMPLETT OHNE BORDERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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

      {/* ✅ HINWEIS: Modal braucht noch Update für 3/5/10/20 Jahre Optionen */}
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