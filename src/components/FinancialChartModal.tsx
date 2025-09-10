// src/components/FinancialChartModal.tsx - VOLLSTÄNDIG MIT SEGMENT-CHARTS + 0-WERTE FILTER
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
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid'
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
  | 'profitMargin'           // ✅ NEU hinzufügen
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

// ✅ HELPER: Microsoft Fiscal Year Label-Formatierung für alle Charts
const formatChartLabel = (date: string, period: 'annual' | 'quarterly'): string => {
  if (period === 'annual') {
    return date.substring(0, 4) || '—'
  }
  
  // Microsoft Fiscal Year Quartalslabels für korrekte UX
  if (date) {
    const dateObj = new Date(date)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    
    // Microsoft Fiscal Year: Juli 2024 - Juni 2025 = FY2025
    let fiscalYear = year
    let quarter = 'Q4'
    
    if (month <= 3) {
      quarter = 'Q3'  // Jan-Mar = Q3 FY
    } else if (month <= 6) {
      quarter = 'Q4'  // Apr-Jun = Q4 FY
    } else if (month <= 9) {
      quarter = 'Q1'  // Jul-Sep = Q1 FY
      fiscalYear = year + 1  // FY beginnt im Juli
    } else {
      quarter = 'Q2'  // Oct-Dez = Q2 FY
      fiscalYear = year + 1  // FY beginnt im Juli
    }
    
    return `${quarter} FY${fiscalYear}`
  }
  
  return date.substring(0, 4) || '—'
}

// API Data Fetcher - SECURE VERSION
async function fetchFinancialData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  try {
    // Use secure API route instead of direct FMP calls
    const response = await fetch(`/api/financial-data/${ticker}?years=${years}&period=${period}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch financial data from secure API')
    }
    
    const financialData = await response.json()
    
    // Extract data from secure API response
    const incomeData = financialData.incomeStatements
    const balanceData = financialData.balanceSheets
    const cashFlowData = financialData.cashFlows
    const keyMetricsData = financialData.keyMetrics
    const dividendData = { historical: financialData.dividends }

    const cutoffYear = 2005
    const currentYear = new Date().getFullYear()
    // ✅ FIX: Für Quartalsdaten auch aktuelles Jahr einschließen, für jährliche nur bis Vorjahr
    const maxYear = period === 'quarterly' ? currentYear : currentYear - 1
    
    const filteredIncomeData = incomeData.filter((item: any) => {
      const year = item.calendarYear || parseInt(item.date?.slice(0, 4) || '0')
      return year >= cutoffYear && year <= maxYear
    })

    const dividendsByYear: Record<string, number> = {}
    if (dividendData && dividendData.historical && Array.isArray(dividendData.historical)) {
      dividendData.historical.forEach((div: any) => {
        try {
          const year = new Date(div.date).getFullYear().toString()
          const yearNum = parseInt(year)
          
          if (yearNum >= cutoffYear && yearNum <= maxYear) {
            if (!dividendsByYear[year]) {
              dividendsByYear[year] = 0
            }
            dividendsByYear[year] += div.adjDividend || div.dividend || 0
          }
        } catch (e) {
          console.warn('Error parsing dividend date:', div.date, e)
        }
      })
    }

    const combinedData = filteredIncomeData.slice(0, years).reverse().map((income: any, index: number) => {
      const balance = balanceData[balanceData.length - 1 - index] || {}
      const cashFlow = cashFlowData[cashFlowData.length - 1 - index] || {}
      const metrics = keyMetricsData[keyMetricsData.length - 1 - index] || {}
      const year = income.calendarYear || income.date?.slice(0, 4) || '—'
      const label = formatChartLabel(income.date || year, period)

      return {
        label: label,
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
        stockAward: income.stockBasedCompensation || 0,
      
 // ✅ PROFIT MARGIN BERECHNUNG AUCH IM MODAL
 profitMargin: (income.revenue && income.revenue > 0) 
 ? (income.netIncome || 0) / income.revenue 
 : 0,

// ✅ BEWERTUNGSKENNZAHLEN
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

// ✅ SEGMENT DATA FETCHER FUNCTIONS - SECURE VERSION
async function fetchProductSegmentData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  try {
    const res = await fetch(
      `/api/revenue-segmentation/${ticker}?type=product&period=annual&structure=flat`
    )
    
    if (!res.ok) return []
    
    const response = await res.json()
    const data = response.success ? response.data : []
    
    if (!Array.isArray(data) || data.length === 0) return []
    
    const transformed = data.map((yearData: any) => {
      const dateKey = Object.keys(yearData)[0]
      const segments = yearData[dateKey]
      
      if (!dateKey || !segments) return null
      
      const year = dateKey.substring(0, 4)
      const result: any = { label: formatChartLabel(dateKey, 'annual') }
      
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
    .slice(-years)
    
    // ✅ ENTFERNE JAHRE WO ALLE SEGMENTE 0 SIND
    const filteredData = transformed.filter(yearData => {
      const segmentKeys = Object.keys(yearData).filter(key => key !== 'label')
      return segmentKeys.some(key => (yearData[key] || 0) > 0)
    })
    
    return filteredData
  } catch (error) {
    console.error('Error fetching product segment data:', error)
    return []
  }
}

async function fetchGeographicSegmentData(ticker: string, years: number, period: 'annual' | 'quarterly') {
  try {
    const res = await fetch(
      `/api/revenue-segmentation/${ticker}?type=geographic&period=annual&structure=flat`
    )
    
    if (!res.ok) return []
    
    const response = await res.json()
    const data = response.success ? response.data : []
    
    if (!Array.isArray(data) || data.length === 0) return []
    
    const transformed = data.map((yearData: any) => {
      let year = ''
      let segments: any = {}
      
      const firstKey = Object.keys(yearData)[0]
      
      if (firstKey && firstKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
        year = firstKey.substring(0, 4)
        segments = yearData[firstKey]
      } else if (yearData.date) {
        year = yearData.date.substring(0, 4)
        segments = { ...yearData }
        delete segments.date
        delete segments.symbol
      }
      
      if (!year || Object.keys(segments).length === 0) return null
      
      const result: any = { label: formatChartLabel(year || '2024', 'annual') }
      
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
    .slice(-years)
    
    // ✅ ENTFERNE JAHRE WO ALLE SEGMENTE 0 SIND
    const filteredData = transformed.filter(yearData => {
      const segmentKeys = Object.keys(yearData).filter(key => key !== 'label')
      return segmentKeys.some(key => (yearData[key] || 0) > 0)
    })
    
    return filteredData
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
  { key: 'profitMargin' as const, name: 'Gewinnmarge', shortName: 'Gewinnmarge', fill: 'rgba(249,115,22,0.8)', stroke: '#f97316' }, // ✅ NEU
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

  // Load data when modal opens or settings change
  useEffect(() => {
    if (!isOpen || !metricKey || !ticker) return

    async function loadData() {
      setLoading(true)
      try {
        // Load segment data if needed
        if (metricKey === 'revenueSegments') {
          const result = await fetchProductSegmentData(ticker, years, period)
          setSegmentData(result)
        } else if (metricKey === 'geographicSegments') {
          const result = await fetchGeographicSegmentData(ticker, years, period)
          setSegmentData(result)
        } else {
          // Load regular financial data
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
  }, [isOpen, onClose])

  if (!isOpen || !metricKey) return null

  const metric = METRICS.find(m => m.key === metricKey)
  const metricName = metric?.name || metricKey

  // Calculate CAGR (only for non-segment charts)
  const isSegmentChart = metricKey === 'revenueSegments' || metricKey === 'geographicSegments'
  const cagr1Y = !isSegmentChart ? calculateCAGR(data, metricKey, 2) : null
  const cagr3Y = !isSegmentChart ? calculateCAGR(data, metricKey, 4) : null
  const cagr5Y = !isSegmentChart ? calculateCAGR(data, metricKey, 6) : null

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
        className="bg-theme-secondary border border-theme w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-theme bg-theme-secondary">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-theme-primary">
              {metricName} · {ticker} · {currency}
            </h1>
            
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="px-3 py-2 bg-theme-tertiary text-theme-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all duration-200"
              style={{ 
                minWidth: '120px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <option value={20}>20 Jahre</option>
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

        {/* CHART AREA */}
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

                  // ✅ REVENUE SEGMENTS CHART - MIT 0-WERTE FILTER
                  if (metricKey === 'revenueSegments') {
                    // ✅ UNION ALLER SEGMENTE MIT POSITIVEN WERTEN
                    const allSegmentKeys = new Set<string>()
                    segmentData.forEach(yearData => {
                      Object.keys(yearData).forEach(key => {
                        if (key !== 'label') {
                          const hasPositiveValue = segmentData.some(year => (year[key] || 0) > 0)
                          if (hasPositiveValue) {
                            allSegmentKeys.add(key)
                          }
                        }
                      })
                    })
                    
                    const segmentKeys = Array.from(allSegmentKeys)
                    
                    return (
                      <BarChart data={segmentData} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValueDE}
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          width={80}
                        />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null
                            
                            // ✅ FILTERE 0-WERTE AUS DER TOOLTIP
                            const nonZeroPayload = payload.filter(entry => (entry.value as number) > 0)
                            const total = nonZeroPayload.reduce((sum, entry) => sum + (entry.value as number), 0)
                            
                            return (
                              <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme/20">
                                <p className="text-theme-primary font-semibold text-sm mb-2">{label}</p>
                                {nonZeroPayload.slice(0, 10).map((entry, index) => (
                                  <div key={index} className="flex justify-between gap-4 text-xs">
                                    <span style={{ color: entry.color }}>{entry.name}:</span>
                                    <span className="text-theme-primary font-medium">
                                      {formatCurrency(entry.value as number)}
                                    </span>
                                  </div>
                                ))}
                                {nonZeroPayload.length > 10 && (
                                  <div className="text-xs text-theme-secondary mt-1">+{nonZeroPayload.length - 10} weitere...</div>
                                )}
                                <div className="border-t border-theme/20 mt-2 pt-2">
                                  <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-theme-secondary">Gesamt:</span>
                                    <span className="text-theme-primary font-bold">
                                      {formatCurrency(total)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        
                        {/* ✅ NUR BARS FÜR SEGMENTE MIT WERTEN */}
                        {segmentKeys.map((segment, index) => {
                          const hasAnyValue = segmentData.some(year => (year[segment] || 0) > 0)
                          if (!hasAnyValue) return null
                          
                          return (
                            <Bar 
                              key={segment}
                              dataKey={segment}
                              stackId="a"
                              fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                              radius={index === segmentKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
                          )
                        }).filter(Boolean)}
                      </BarChart>
                    )
                  } 
                  // ✅ GEOGRAPHIC SEGMENTS CHART - MIT 0-WERTE FILTER
                  else if (metricKey === 'geographicSegments') {
                    // ✅ UNION ALLER SEGMENTE MIT POSITIVEN WERTEN
                    const allSegmentKeys = new Set<string>()
                    segmentData.forEach(yearData => {
                      Object.keys(yearData).forEach(key => {
                        if (key !== 'label') {
                          const hasPositiveValue = segmentData.some(year => (year[key] || 0) > 0)
                          if (hasPositiveValue) {
                            allSegmentKeys.add(key)
                          }
                        }
                      })
                    })
                    
                    const segmentKeys = Array.from(allSegmentKeys)
                    
                    return (
                      <BarChart data={segmentData} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValueDE}
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          width={80}
                        />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null
                            
                            // ✅ FILTERE 0-WERTE AUS DER TOOLTIP
                            const nonZeroPayload = payload.filter(entry => (entry.value as number) > 0)
                            const total = nonZeroPayload.reduce((sum, entry) => sum + (entry.value as number), 0)
                            
                            return (
                              <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme/20">
                                <p className="text-theme-primary font-semibold text-sm mb-2">{label}</p>
                                {nonZeroPayload.slice(0, 10).map((entry, index) => (
                                  <div key={index} className="flex justify-between gap-4 text-xs">
                                    <span style={{ color: entry.color }}>{entry.name}:</span>
                                    <span className="text-theme-primary font-medium">
                                      {formatCurrency(entry.value as number)}
                                    </span>
                                  </div>
                                ))}
                                {nonZeroPayload.length > 10 && (
                                  <div className="text-xs text-theme-secondary mt-1">+{nonZeroPayload.length - 10} weitere...</div>
                                )}
                                <div className="border-t border-theme/20 mt-2 pt-2">
                                  <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-theme-secondary">Gesamt:</span>
                                    <span className="text-theme-primary font-bold">
                                      {formatCurrency(total)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        
                        {/* ✅ NUR BARS FÜR SEGMENTE MIT WERTEN */}
                        {segmentKeys.map((segment, index) => {
                          const hasAnyValue = segmentData.some(year => (year[segment] || 0) > 0)
                          if (!hasAnyValue) return null
                          
                          return (
                            <Bar 
                              key={segment}
                              dataKey={segment}
                              stackId="a"
                              fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                              radius={index === segmentKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
                          )
                        }).filter(Boolean)}
                      </BarChart>
                    )
                  
                  }


                  else if (metricKey === 'profitMargin') {
                    const validData = data.filter(d => d.profitMargin !== undefined && d.profitMargin !== null)
                    
                    return (
                      <BarChart data={validData} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                          width={80}
                          domain={['dataMin', 'dataMax']}
                        />
                        <RechartsTooltip 
                          formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Gewinnmarge']}
                          {...tooltipStyles}
                        />
                        <Bar
                          dataKey="profitMargin"
                          name="Gewinnmarge"
                          fill="rgba(249, 115, 22, 0.8)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )
                  }



                  else if (metricKey === 'valuationMetrics') {
                    return (
                      <LineChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          tickFormatter={(value) => `${value.toFixed(1)}x`}
                          width={80}
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
                                    <span className="text-theme-primary font-medium">
                                      {(entry.value as number).toFixed(1)}x
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )
                          }}
                        />
                        <Line type="monotone" dataKey="pe" name="KGV" stroke="#F97316" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="pb" name="KBV" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="ps" name="KUV" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    )
                  }



                  // CASH DEBT CHART
                  else if (metricKey === 'cashDebt') {
                    return (
                      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tickFormatter={formatAxisValueDE}
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
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
                  } 
                  // PE RATIO LINE CHART
                  else if (metricKey === 'pe') {
                    const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
                    return (
                      <LineChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
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
                          activeDot={{ r: 8, fill: '#F97316', stroke: 'var(--bg-primary)', strokeWidth: 2 }}
                        />
                        <RechartsTooltip 
                          formatter={(v: number) => [v.toFixed(1) + 'x', 'KGV TTM']}
                          {...tooltipStyles}
                        />
                      </LineChart>
                    )
                  } 
                  // STANDARD BAR CHART
                  else {
                    return (
                      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                        <CartesianGrid 
                          strokeDasharray="1 3" 
                          stroke="#64748b" 
                          strokeWidth={1}
                          opacity={1}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tickFormatter={(v: number) => {
                            if (metricKey === 'returnOnEquity') {
                              return `${(v * 100).toFixed(0)}%`
                            } else if (metricKey === 'eps' || metricKey === 'dividendPS') {
                              return `${v.toFixed(v < 1 ? 2 : 1)} ${currency === 'USD' ? '$' : '€'}`
                            } else if (metricKey === 'sharesOutstanding') {
                              return `${(v / 1e9).toFixed(1)} Mrd.`
                            }
                            return formatAxisValueDE(v)
                          }}
                          axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                          tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                          width={80}
                        />
                        <RechartsTooltip 
                          formatter={(v: any, n: string) => {
                            if (metricKey === 'returnOnEquity') {
                              return [`${((v as number) * 100).toFixed(1)}%`, n]
                            } else if (metricKey === 'eps' || metricKey === 'dividendPS') {
                              return [formatStockPrice(v as number), n]
                            } else if (metricKey === 'sharesOutstanding') {
                              return [`${((v as number) / 1e9).toFixed(2)} Mrd. Aktien`, n]
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

        {/* FOOTER WITH CAGR - nur für nicht-Segment Charts */}
        {!isSegmentChart && (
          <div className="border-t border-theme px-6 py-5 bg-theme-secondary">
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
        )}
      </div>
    </div>
  )
}