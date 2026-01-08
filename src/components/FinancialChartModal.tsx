// src/components/FinancialChartModal.tsx - QUALTRIM STYLE: Jahre × 4 Quartale
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
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useCurrency } from '@/lib/CurrencyContext'

type MetricKey =
  | 'revenue'
  | 'revenueSegments'
  | 'ebitda'
  | 'eps'
  | 'freeCashFlow'
  | 'dividendPS'
  | 'sharesOutstanding'
  | 'netIncome'
  | 'cashDebt'
  | 'pe'
  | 'profitMargin'
  | 'valuationMetrics' 
  | 'returnOnEquity'
  | 'stockAward'
  | 'capEx'
  | 'researchAndDevelopment'
  | 'operatingIncome' 
  | 'geographicSegments' 

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

// ✅ HELPER: Quartalslabel-Formatierung
const formatQuarterLabel = (date: string): string => {
  if (!date) return '—'
  
  const dateObj = new Date(date)
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  
  // Kalenderjahr-Quartale (einfacher und universeller)
  let quarter = 'Q1'
  if (month >= 4 && month <= 6) quarter = 'Q2'
  else if (month >= 7 && month <= 9) quarter = 'Q3'
  else if (month >= 10) quarter = 'Q4'
  
  // Kurzes Format für viele Quartale: Q1'24
  const shortYear = year.toString().slice(-2)
  return `${quarter}'${shortYear}`
}

// ✅ API Data Fetcher - QUALTRIM STYLE: Jahre = Datenpunkte (bei Quarterly: Jahre × 4)
async function fetchFinancialData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  try {
    // ✅ QUALTRIM LOGIK: Bei Quarterly laden wir Jahre × 4 Quartale
    const dataPoints = period === 'quarterly' ? years * 4 : years
    
    const response = await fetch(`/api/financial-data/${ticker}?years=${years}&period=${period}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch financial data from secure API')
    }
    
    const financialData = await response.json()
    
    const incomeData = financialData.incomeStatements
    const balanceData = financialData.balanceSheets
    const cashFlowData = financialData.cashFlows
    const keyMetricsData = financialData.keyMetrics
    const dividendData = { historical: financialData.dividends }

    const cutoffYear = 2005
    const currentYear = new Date().getFullYear()
    
    // ✅ Filtere moderne Daten
    const filteredIncomeData = incomeData.filter((item: any) => {
      const year = item.calendarYear || parseInt(item.date?.slice(0, 4) || '0')
      return year >= cutoffYear && year <= currentYear
    })

    // Dividends aggregation
    const dividendsByPeriod: Record<string, number> = {}
    if (dividendData?.historical && Array.isArray(dividendData.historical)) {
      dividendData.historical.forEach((div: any) => {
        try {
          const date = new Date(div.date)
          const year = date.getFullYear()
          const quarter = Math.ceil((date.getMonth() + 1) / 3)
          
          // Key basierend auf Period
          const key = period === 'quarterly' 
            ? `${year}-Q${quarter}` 
            : year.toString()
          
          if (!dividendsByPeriod[key]) {
            dividendsByPeriod[key] = 0
          }
          dividendsByPeriod[key] += div.adjDividend || div.dividend || 0
        } catch (e) {
          console.warn('Error parsing dividend date:', div.date, e)
        }
      })
    }

    // ✅ QUALTRIM: Nehme die richtigen Datenpunkte
    const slicedData = filteredIncomeData.slice(0, dataPoints)
    
    const combinedData = slicedData.reverse().map((income: any, index: number) => {
      const balance = balanceData[balanceData.length - 1 - index] || {}
      const cashFlow = cashFlowData[cashFlowData.length - 1 - index] || {}
      const metrics = keyMetricsData[keyMetricsData.length - 1 - index] || {}
      
      // Label basierend auf Period
      let label = ''
      if (period === 'quarterly') {
        label = formatQuarterLabel(income.date)
      } else {
        label = income.calendarYear || income.date?.slice(0, 4) || '—'
      }
      
      // Dividend key für lookup
      const year = income.calendarYear || income.date?.slice(0, 4) || ''
      const divKey = period === 'quarterly' && income.date
        ? `${new Date(income.date).getFullYear()}-Q${Math.ceil((new Date(income.date).getMonth() + 1) / 3)}`
        : year

      return {
        label,
        revenue: income.revenue || 0,
        netIncome: income.netIncome || 0,
        operatingIncome: income.operatingIncome || 0,
        ebitda: income.ebitda || 0,
        eps: income.eps || 0,
        dividendPS: dividendsByPeriod[divKey] || metrics.dividendPerShare || 0,
        cash: balance.cashAndCashEquivalents || balance.cashAndShortTermInvestments || 0,
        debt: balance.totalDebt || 0,
        sharesOutstanding: balance.commonStockSharesOutstanding || income.weightedAverageShsOut || 0,
        freeCashFlow: cashFlow.freeCashFlow || 0,
        capEx: Math.abs(cashFlow.capitalExpenditure) || 0,
        pe: metrics.peRatio || 0,
        returnOnEquity: metrics.roe || 0,
        researchAndDevelopment: income.researchAndDevelopmentExpenses || 0,
        stockAward: income.stockBasedCompensation || 0,
        profitMargin: (income.revenue && income.revenue > 0) 
          ? (income.netIncome || 0) / income.revenue 
          : 0,
        pb: metrics.pbRatio || 0,
        ps: metrics.psRatio || metrics.priceToSalesRatio || 0
      }
    })

    return combinedData
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return []
  }
}

// ✅ SEGMENT DATA FETCHER - AUCH MIT QUALTRIM LOGIK
async function fetchProductSegmentData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  try {
    const res = await fetch(
      `/api/revenue-segmentation/${ticker}?type=product&period=${period}&structure=flat`
    )
    
    if (!res.ok) return []
    
    const response = await res.json()
    const data = response.success ? response.data : []
    
    if (!Array.isArray(data) || data.length === 0) return []
    
    // ✅ QUALTRIM: Bei Quarterly mehr Datenpunkte
    const dataPoints = period === 'quarterly' ? years * 4 : years
    
    const transformed = data.map((yearData: any) => {
      const dateKey = Object.keys(yearData)[0]
      const segments = yearData[dateKey]
      
      if (!dateKey || !segments) return null
      
      const label = period === 'quarterly' 
        ? formatQuarterLabel(dateKey)
        : dateKey.substring(0, 4)
      
      const result: any = { label }
      
      Object.entries(segments).forEach(([segmentName, value]) => {
        if (typeof value === 'number' && value > 0) {
          const shortName = segmentName.length > 25 
            ? segmentName.substring(0, 22) + '...' 
            : segmentName
          result[shortName] = value
        }
      })
      
      return result
    })
    .filter(Boolean)
    .reverse()
    .slice(-dataPoints)
    
    // Entferne Jahre wo alle Segmente 0 sind
    return transformed.filter((yearData: any) => {
      const segmentKeys = Object.keys(yearData).filter(key => key !== 'label')
      return segmentKeys.some(key => (yearData[key] || 0) > 0)
    })
  } catch (error) {
    console.error('Error fetching product segment data:', error)
    return []
  }
}

async function fetchGeographicSegmentData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  try {
    const res = await fetch(
      `/api/revenue-segmentation/${ticker}?type=geographic&period=${period}&structure=flat`
    )
    
    if (!res.ok) return []
    
    const response = await res.json()
    const data = response.success ? response.data : []
    
    if (!Array.isArray(data) || data.length === 0) return []
    
    // ✅ QUALTRIM: Bei Quarterly mehr Datenpunkte
    const dataPoints = period === 'quarterly' ? years * 4 : years
    
    const transformed = data.map((yearData: any) => {
      let dateKey = ''
      let segments: any = {}
      
      const firstKey = Object.keys(yearData)[0]
      
      if (firstKey && firstKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateKey = firstKey
        segments = yearData[firstKey]
      } else if (yearData.date) {
        dateKey = yearData.date
        segments = { ...yearData }
        delete segments.date
        delete segments.symbol
      }
      
      if (!dateKey || Object.keys(segments).length === 0) return null
      
      const label = period === 'quarterly' 
        ? formatQuarterLabel(dateKey)
        : dateKey.substring(0, 4)
      
      const result: any = { label }
      
      Object.entries(segments).forEach(([segmentName, value]) => {
        if (typeof value === 'number' && value > 0) {
          const shortName = segmentName.length > 25 
            ? segmentName.substring(0, 22) + '...' 
            : segmentName
          result[shortName] = value
        }
      })
      
      return result
    })
    .filter(Boolean)
    .reverse()
    .slice(-dataPoints)
    
    return transformed.filter((yearData: any) => {
      const segmentKeys = Object.keys(yearData).filter(key => key !== 'label')
      return segmentKeys.some(key => (yearData[key] || 0) > 0)
    })
  } catch (error) {
    console.error('Error fetching geographic segment data:', error)
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
  { key: 'profitMargin' as const, name: 'Gewinnmarge', shortName: 'Gewinnmarge', fill: 'rgba(249,115,22,0.8)', stroke: '#f97316' },
  { key: 'revenueSegments' as const, name: 'Produkt-Segmente', shortName: 'Produkt-Segmente', fill: 'rgba(59,130,246,0.8)', stroke: '#3b82f6' },
  { key: 'geographicSegments' as const, name: 'Geo-Segmente', shortName: 'Geo-Segmente', fill: 'rgba(16,185,129,0.8)', stroke: '#10b981' },
]

const SEGMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#EC4899', '#F97316', '#14B8A6']

export default function FinancialChartModal({ 
  isOpen, 
  onClose, 
  ticker, 
  metricKey, 
  period 
}: FinancialChartModalProps) {
  const [years, setYears] = useState(10)
  const [data, setData] = useState<any[]>([])
  const [segmentData, setSegmentData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const { currency, formatCurrency, formatAxisValueDE, formatStockPrice } = useCurrency()

  // ✅ Berechne erwartete Datenpunkte für Info-Anzeige
  const expectedDataPoints = period === 'quarterly' ? years * 4 : years

  // Load data when modal opens or settings change
  useEffect(() => {
    if (!isOpen || !metricKey || !ticker) return

    async function loadData() {
      setLoading(true)
      try {
        if (metricKey === 'revenueSegments') {
          const result = await fetchProductSegmentData(ticker, years, period)
          setSegmentData(result)
        } else if (metricKey === 'geographicSegments') {
          const result = await fetchGeographicSegmentData(ticker, years, period)
          setSegmentData(result)
        } else {
          const result = await fetchFinancialData(ticker, years, period)
          setData(result)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setData([])
        setSegmentData([])
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
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !metricKey) return null

  const metric = METRICS.find(m => m.key === metricKey)
  const metricName = metric?.name || metricKey

  const isSegmentChart = metricKey === 'revenueSegments' || metricKey === 'geographicSegments'
  const cagr1Y = !isSegmentChart ? calculateCAGR(data, metricKey, period === 'quarterly' ? 4 : 2) : null
  const cagr3Y = !isSegmentChart ? calculateCAGR(data, metricKey, period === 'quarterly' ? 12 : 4) : null
  const cagr5Y = !isSegmentChart ? calculateCAGR(data, metricKey, period === 'quarterly' ? 20 : 6) : null

  // ✅ Dynamische X-Achsen Konfiguration basierend auf Datenmenge
  const getXAxisConfig = (dataLength: number) => {
    if (dataLength > 30) {
      return { angle: -45, fontSize: 9, interval: 3 }
    } else if (dataLength > 20) {
      return { angle: -45, fontSize: 10, interval: 2 }
    } else if (dataLength > 10) {
      return { angle: -45, fontSize: 11, interval: 1 }
    }
    return { angle: 0, fontSize: 12, interval: 0 }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="bg-theme-secondary border border-theme w-full max-w-7xl h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER - QUALTRIM STYLE */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-theme-secondary">
          <div className="flex items-center gap-4">
            {/* Ticker Logo Placeholder */}
            <div className="w-10 h-10 bg-theme-tertiary rounded-lg flex items-center justify-center">
              <span className="text-theme-primary font-bold text-sm">{ticker.slice(0, 2)}</span>
            </div>
            
            <div>
              <h1 className="text-lg font-bold text-theme-primary">
                {metricName} - {ticker}
              </h1>
              <p className="text-xs text-theme-muted">
                {period === 'quarterly' ? 'Quartalsweise' : 'Jährlich'} • {currency}
                {period === 'quarterly' && (
                  <span className="ml-2 text-brand-light">
                    ({years} Jahre = {expectedDataPoints} Quartale)
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Years Selector - QUALTRIM STYLE DROPDOWN */}
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="px-4 py-2 bg-theme-tertiary text-theme-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-green-500/50 transition-all text-sm font-medium cursor-pointer hover:bg-theme-hover"
            >
              <option value={3}>3 Jahre</option>
              <option value={5}>5 Jahre</option>
              <option value={10}>10 Jahre</option>
              <option value={20}>20 Jahre</option>
            </select>
            
            <button
              onClick={onClose}
              className="w-10 h-10 bg-theme-tertiary hover:bg-red-500/20 text-theme-muted hover:text-red-400 rounded-lg flex items-center justify-center transition-all duration-200 border border-theme hover:border-red-500/30"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CHART AREA */}
        <div className="flex-1 bg-theme-primary p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-theme-muted text-sm">
                  Lade {expectedDataPoints} Datenpunkte...
                </p>
              </div>
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
                      fontSize: '13px',
                      fontWeight: '500',
                      padding: '10px 14px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                    },
                    labelStyle: { 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      marginBottom: '4px'
                    }
                  }

                  // Dynamische X-Achsen Einstellungen
                  const currentData = isSegmentChart ? segmentData : data
                  const xAxisConfig = getXAxisConfig(currentData.length)

                  // ✅ REVENUE SEGMENTS CHART
                  if (metricKey === 'revenueSegments') {
                    const allSegmentKeys = new Set<string>()
                    segmentData.forEach(yearData => {
                      Object.keys(yearData).forEach(key => {
                        if (key !== 'label' && segmentData.some(year => (year[key] || 0) > 0)) {
                          allSegmentKeys.add(key)
                        }
                      })
                    })
                    const segmentKeys = Array.from(allSegmentKeys)
                    
                    return (
                      <BarChart data={segmentData} margin={{ top: 20, right: 30, bottom: 80, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={false}
                          tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                          angle={xAxisConfig.angle}
                          textAnchor={xAxisConfig.angle ? "end" : "middle"}
                          height={70}
                          interval={xAxisConfig.interval}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValueDE}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                          width={70}
                        />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null
                            const nonZeroPayload = payload.filter(entry => (entry.value as number) > 0)
                            const total = nonZeroPayload.reduce((sum, entry) => sum + (entry.value as number), 0)
                            
                            return (
                              <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme/20 shadow-xl">
                                <p className="text-theme-primary font-semibold text-sm mb-2">{label}</p>
                                {nonZeroPayload.slice(0, 8).map((entry, index) => (
                                  <div key={index} className="flex justify-between gap-4 text-xs">
                                    <span style={{ color: entry.color }}>{entry.name}:</span>
                                    <span className="text-theme-primary font-medium">{formatCurrency(entry.value as number)}</span>
                                  </div>
                                ))}
                                {nonZeroPayload.length > 8 && (
                                  <div className="text-xs text-theme-muted mt-1">+{nonZeroPayload.length - 8} weitere...</div>
                                )}
                                <div className="border-t border-theme/20 mt-2 pt-2">
                                  <div className="flex justify-between gap-4 text-xs font-bold">
                                    <span className="text-theme-secondary">Gesamt:</span>
                                    <span className="text-theme-primary">{formatCurrency(total)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        {segmentKeys.map((segment, index) => (
                          <Bar 
                            key={segment}
                            dataKey={segment}
                            stackId="a"
                            fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                            radius={index === segmentKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    )
                  }
                  
                  // ✅ GEOGRAPHIC SEGMENTS CHART
                  if (metricKey === 'geographicSegments') {
                    const allSegmentKeys = new Set<string>()
                    segmentData.forEach(yearData => {
                      Object.keys(yearData).forEach(key => {
                        if (key !== 'label' && segmentData.some(year => (year[key] || 0) > 0)) {
                          allSegmentKeys.add(key)
                        }
                      })
                    })
                    const segmentKeys = Array.from(allSegmentKeys)
                    
                    return (
                      <BarChart data={segmentData} margin={{ top: 20, right: 30, bottom: 80, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={false}
                          tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                          angle={xAxisConfig.angle}
                          textAnchor={xAxisConfig.angle ? "end" : "middle"}
                          height={70}
                          interval={xAxisConfig.interval}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValueDE}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                          width={70}
                        />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null
                            const nonZeroPayload = payload.filter(entry => (entry.value as number) > 0)
                            const total = nonZeroPayload.reduce((sum, entry) => sum + (entry.value as number), 0)
                            
                            return (
                              <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme/20 shadow-xl">
                                <p className="text-theme-primary font-semibold text-sm mb-2">{label}</p>
                                {nonZeroPayload.slice(0, 8).map((entry, index) => (
                                  <div key={index} className="flex justify-between gap-4 text-xs">
                                    <span style={{ color: entry.color }}>{entry.name}:</span>
                                    <span className="text-theme-primary font-medium">{formatCurrency(entry.value as number)}</span>
                                  </div>
                                ))}
                                <div className="border-t border-theme/20 mt-2 pt-2">
                                  <div className="flex justify-between gap-4 text-xs font-bold">
                                    <span className="text-theme-secondary">Gesamt:</span>
                                    <span className="text-theme-primary">{formatCurrency(total)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        {segmentKeys.map((segment, index) => (
                          <Bar 
                            key={segment}
                            dataKey={segment}
                            stackId="a"
                            fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                            radius={index === segmentKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    )
                  }

                  // ✅ PROFIT MARGIN CHART
                  if (metricKey === 'profitMargin') {
                    const validData = data.filter(d => d.profitMargin !== undefined && d.profitMargin !== null)
                    
                    return (
                      <BarChart data={validData} margin={{ top: 20, right: 30, bottom: 80, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={false}
                          tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                          angle={xAxisConfig.angle}
                          textAnchor={xAxisConfig.angle ? "end" : "middle"}
                          height={70}
                          interval={xAxisConfig.interval}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          width={60}
                          domain={['dataMin - 0.05', 'dataMax + 0.05']}
                        />
                        <RechartsTooltip 
                          formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Gewinnmarge']}
                          {...tooltipStyles}
                        />
                        <Bar dataKey="profitMargin" name="Gewinnmarge" fill="rgba(249, 115, 22, 0.8)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    )
                  }

                  // ✅ VALUATION METRICS CHART (KGV, KBV, KUV)
                  if (metricKey === 'valuationMetrics') {
                    return (
                      <LineChart data={data} margin={{ top: 20, right: 30, bottom: 80, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={false}
                          tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                          angle={xAxisConfig.angle}
                          textAnchor={xAxisConfig.angle ? "end" : "middle"}
                          height={70}
                          interval={xAxisConfig.interval}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                          tickFormatter={(value) => `${value.toFixed(0)}x`}
                          width={50}
                        />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null
                            return (
                              <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme/20">
                                <p className="text-theme-primary font-semibold text-sm mb-2">{label}</p>
                                {payload.map((entry, index) => (
                                  <div key={index} className="flex justify-between gap-4 text-xs">
                                    <span style={{ color: entry.color }}>{entry.name}:</span>
                                    <span className="text-theme-primary font-medium">{(entry.value as number).toFixed(1)}x</span>
                                  </div>
                                ))}
                              </div>
                            )
                          }}
                        />
                        <Line type="monotone" dataKey="pe" name="KGV" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="pb" name="KBV" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="ps" name="KUV" stroke="#06B6D4" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    )
                  }

                  // ✅ CASH DEBT CHART
                  if (metricKey === 'cashDebt') {
                    return (
                      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 80, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={false}
                          tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                          angle={xAxisConfig.angle}
                          textAnchor={xAxisConfig.angle ? "end" : "middle"}
                          height={70}
                          interval={xAxisConfig.interval}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValueDE}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                          width={70}
                        />
                        <RechartsTooltip 
                          formatter={(v: any, n: string) => [formatCurrency(v as number), n]}
                          {...tooltipStyles}
                        />
                        <Bar dataKey="cash" name="Liquidität" fill="rgba(34, 197, 94, 0.8)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="debt" name="Schulden" fill="rgba(239, 68, 68, 0.8)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    )
                  }
                  
                  // ✅ PE RATIO LINE CHART
                  if (metricKey === 'pe') {
                    const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
                    return (
                      <LineChart data={data} margin={{ top: 20, right: 30, bottom: 80, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={false}
                          tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                          angle={xAxisConfig.angle}
                          textAnchor={xAxisConfig.angle ? "end" : "middle"}
                          height={70}
                          interval={xAxisConfig.interval}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                          width={50}
                        />
                        <ReferenceLine y={avg} stroke="rgba(148, 163, 184, 0.5)" strokeDasharray="5 5" strokeWidth={2} />
                        <Line 
                          type="monotone" 
                          dataKey="pe" 
                          name="KGV TTM" 
                          stroke="#F97316" 
                          strokeWidth={2.5}
                          dot={{ fill: '#F97316', strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6, fill: '#F97316', stroke: 'var(--bg-primary)', strokeWidth: 2 }}
                        />
                        <RechartsTooltip 
                          formatter={(v: number) => [v.toFixed(1) + 'x', 'KGV TTM']}
                          {...tooltipStyles}
                        />
                      </LineChart>
                    )
                  }
                  
                  // ✅ STANDARD BAR CHART
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 30, bottom: 80, left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                        tickLine={false}
                        tick={{ fontSize: xAxisConfig.fontSize, fill: 'var(--color-text-secondary)' }}
                        angle={xAxisConfig.angle}
                        textAnchor={xAxisConfig.angle ? "end" : "middle"}
                        height={70}
                        interval={xAxisConfig.interval}
                      />
                      <YAxis
                        tickFormatter={(v: number) => {
                          if (metricKey === 'returnOnEquity') return `${(v * 100).toFixed(0)}%`
                          if (metricKey === 'eps' || metricKey === 'dividendPS') return `${v.toFixed(v < 1 ? 2 : 1)} ${currency === 'USD' ? '$' : '€'}`
                          if (metricKey === 'sharesOutstanding') return `${(v / 1e9).toFixed(1)}B`
                          return formatAxisValueDE(v)
                        }}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                        width={70}
                      />
                      <RechartsTooltip 
                        formatter={(v: any, n: string) => {
                          if (metricKey === 'returnOnEquity') return [`${((v as number) * 100).toFixed(1)}%`, n]
                          if (metricKey === 'eps' || metricKey === 'dividendPS') return [formatStockPrice(v as number), n]
                          if (metricKey === 'sharesOutstanding') return [`${((v as number) / 1e9).toFixed(2)} Mrd. Aktien`, n]
                          return [formatCurrency(v as number), n]
                        }}
                        {...tooltipStyles}
                      />
                      <Bar
                        dataKey={metricKey}
                        name={metricName}
                        fill={metric?.fill || 'rgba(59, 130, 246, 0.8)'}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  )
                })()}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* FOOTER WITH CAGR - QUALTRIM STYLE */}
        {!isSegmentChart && (
          <div className="border-t border-theme px-6 py-4 bg-theme-secondary">
            <div className="flex justify-center items-center gap-8">
              {[
                { label: '1Y', value: cagr1Y },
                { label: '2Y', value: cagr3Y },
                { label: '5Y', value: cagr5Y }
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-theme-muted text-sm font-medium">{item.label}:</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                    item.value && item.value >= 0 
                      ? 'text-green-400 bg-green-500/10' 
                      : 'text-red-400 bg-red-500/10'
                  }`}>
                    {item.value !== null ? `${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}