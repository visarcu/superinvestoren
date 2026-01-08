// src/components/FinancialAnalysisClient.tsx - ULTRA CLEAN: KEINE BORDERS + PROFESSIONELLE CONTROLS
'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ArrowsPointingOutIcon, InformationCircleIcon } from '@heroicons/react/24/solid'
import { useCurrency } from '@/lib/CurrencyContext'
import FinancialChartModal from './FinancialChartModal'
import { useChartPresets } from '@/hooks/useChartPresets'
import { ChartPreset } from '@/types/chartPresets'

// ✅ GLEICHE Multi-Source Financial Data Service - nur ohne Split-Tracking
class FinancialDataService {
  private fmpKey: string

  constructor() {
    this.fmpKey = '' // Removed for security - use API routes instead
  }

  // ✅ HAUPTMETHODE: FMP Financial Data Service (UPDATED: period-based data points)
  async getFinancialData(ticker: string, period: 'annual' | 'quarterly') {
    // ✅ Automatische Bestimmung der Datenpunkte basierend auf period
    const dataPoints = period === 'quarterly' ? OVERVIEW_QUARTERS : OVERVIEW_YEARS_ANNUAL
    console.log(`🔍 [FinancialDataService] Loading for ${ticker} (${dataPoints} ${period === 'quarterly' ? 'quarters' : 'years'})`)

    // Nur FMP Daten laden
    const fmpFinancials = await this.getFMPFinancialData(ticker, dataPoints, period)

    console.log(`📊 Source: FMP=${fmpFinancials.length} years`)

    // Intelligente Daten-Validierung und Processing
    const validatedData = this.validateAndMergeFinancialData(fmpFinancials, null, ticker)
    
    console.log(`✅ [FinancialDataService] Validated data for ${ticker}: ${validatedData.length} years`)
    return validatedData
  }

  // ✅ FMP Financial Data (Primary Source) - MIT 20 JAHRE MAXIMUM Filter
  private async getFMPFinancialData(ticker: string, years: number, period: 'annual' | 'quarterly') {
    try {
      // ✅ MAXIMUM 20 Jahre, aber respektiere user input
      const requestYears = Math.min(years, 20) // Max 20 Jahre
      // ✅ FIX: Für Quartale mehr Datenpunkte laden (Jahre × 4)
      const requestLimit = period === 'quarterly' ? requestYears * 4 : requestYears
      
      // Use secure API route instead of direct FMP calls
      const response = await fetch(`/api/financial-data/${ticker}?years=${requestYears}&period=${period}`)
      
      if (!response.ok) {
        throw new Error('Financial data API request failed')
      }

      const financialData = await response.json()
      
      // Extract data from secure API response
      const incomeData = financialData.incomeStatements
      const balanceData = financialData.balanceSheets
      const cashFlowData = financialData.cashFlows
      const keyMetricsData = financialData.keyMetrics
      const dividendData = { historical: financialData.dividends }

      // ✅ FILTER: Nur moderne Daten (ab 2005)
      const cutoffYear = 2005
      const currentYear = new Date().getFullYear()
      
      const filteredIncomeData = incomeData.filter((item: any) => {
        const year = item.calendarYear || parseInt(item.date?.slice(0, 4) || '0')
        // ✅ FIX: Für Quartalsdaten auch aktuelles Jahr einschließen, für jährliche nur bis Vorjahr
        const maxYear = period === 'quarterly' ? currentYear : currentYear - 1
        return year >= cutoffYear && year <= maxYear
      })

      console.log(`📊 [${ticker}] Filtered to modern data (2005+): ${incomeData.length} → ${filteredIncomeData.length} periods`)

      // Dividends by year - ✅ NUTZE adjDividend (bereits split-adjusted!)
      const dividendsByYear: Record<string, number> = {}
      if (dividendData.historical && Array.isArray(dividendData.historical)) {
        dividendData.historical.forEach((div: any) => {
          const year = new Date(div.date).getFullYear().toString()
          const yearNum = parseInt(year)
          
          // ✅ FILTER: Nur moderne Dividendendaten
          const maxYear = period === 'quarterly' ? currentYear : currentYear - 1
          if (yearNum >= cutoffYear && yearNum <= maxYear) {
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
        // ✅ IMPROVED: Qualtrim-Style Labels (Q1'24 für Quartale, Jahr für Annual)
        const formatLabel = () => {
          if (period === 'annual') {
            return income.calendarYear || income.date?.slice(0, 4) || '—'
          }

          // ✅ Qualtrim-Style: Q1'24 Format für Quartale
          if (income.date) {
            return formatQuarterLabel(income.date)
          }

          return income.calendarYear || '—'
        }
        
        const year = income.calendarYear || income.date?.slice(0, 4) || '—'
        const label = formatLabel()

        return {
          label: label,
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
          yearsRequested: years,


          profitMargin: (income.revenue && income.revenue > 0) 
          ? (income.netIncome || 0) / income.revenue 
          : 0,

          pb: metrics.pbRatio || 0,
          ps: metrics.psRatio || metrics.priceToSalesRatio || 0,

        }
      })

      return combinedData
    } catch (error) {
      console.error('❌ FMP Financial data failed:', error)
      return []
    }
  }


  // ✅ INTELLIGENTE VALIDIERUNG UND PROCESSING - KEINE SPLIT-ADJUSTMENTS MEHR!
  private validateAndMergeFinancialData(fmpData: any[], _unusedParam: any, ticker: string) {
    if (fmpData.length === 0) {
      console.warn(`⚠️ No FMP data for ${ticker}`)
      return []
    }

    // ✅ SPEZIELLE VALIDIERUNG für problematische Ticker
    const PROBLEMATIC_TICKERS = ['TSM', 'ASML', 'SAP', 'NVO', 'UL', 'NVDA']
    const isProblematic = PROBLEMATIC_TICKERS.includes(ticker.toUpperCase())

    console.log(`🔍 [Validation] ${ticker} - Problematic: ${isProblematic}`)

    return fmpData.map((yearData) => {
      let correctedData = { ...yearData }

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

// ✅ KONSTANTEN FÜR DATENPUNKTE (wie Qualtrim)
const OVERVIEW_YEARS_ANNUAL = 10
const OVERVIEW_QUARTERS = 16

// ✅ Helper für Quartalslabel-Formatierung (Q1'24 Style)
function formatQuarterLabel(date: string): string {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const yearShort = year.toString().slice(-2)

  // Kalenderquartal basierend auf Monat
  let quarter: number
  if (month <= 3) quarter = 1
  else if (month <= 6) quarter = 2
  else if (month <= 9) quarter = 3
  else quarter = 4

  return `Q${quarter}'${yearShort}`
}

// ✅ Dynamisches X-Achsen-Interval basierend auf Datenpunkten
function getXAxisInterval(dataLength: number): number {
  if (dataLength <= 5) return 0
  if (dataLength <= 10) return 1
  if (dataLength <= 16) return 3
  return Math.floor(dataLength / 5)
}

// ─── Type Definitions ───────────────────────────────────────────────────────────
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
  | 'profitMargin'          // ✅ NEU - Ersetzt PE Ratio
  | 'returnOnEquity'
  | 'capEx'
  | 'researchAndDevelopment'
  | 'operatingIncome'
  | 'geographicSegments'      // NEU
  | 'valuationMetrics'      // ✅ NEU - KGV, KUV, KBV Chart

interface Props {
  ticker: string
  isPremium?: boolean
  userId?: string
}

// ─── PRESET SYSTEM ───────────────────────────────────────────────────────────
interface LocalChartPreset {
  name: string
  description: string
  charts: MetricKey[]
  icon?: string
}




// ─── FINANZKENNZAHLEN DEFINITIONEN ─────────────────────────────────────
const METRIC_DEFINITIONS = {
  revenue: {
    description: "Gesamterlöse aus dem Verkauf von Produkten und Dienstleistungen",
    calculation: "Nettoumsatz = Bruttoumsatz - Retouren - Rabatte"
  },
  ebitda: {
    description: "Gewinn vor Zinsen, Steuern und Abschreibungen",
    calculation: "EBITDA = Betriebsergebnis + Abschreibungen"
  },
  eps: {
    description: "Gewinn je Aktie - Jahresüberschuss geteilt durch Aktienanzahl",
    calculation: "EPS = Nettogewinn / Durchschnittliche Aktienanzahl"
  },
  freeCashFlow: {
    description: "Verfügbare Liquidität nach allen Betriebsausgaben und Investitionen",
    calculation: "FCF = Operativer Cash Flow - Investitionen"
  },
  netIncome: {
    description: "Jahresüberschuss nach Abzug aller Kosten und Steuern",
    calculation: "Nettogewinn = Umsatz - alle Aufwendungen - Steuern"
  },
  dividendPS: {
    description: "Ausgeschüttete Dividende pro Aktie an die Aktionäre",
    calculation: "Dividende je Aktie = Gesamtdividende / Aktienanzahl"
  },
  sharesOutstanding: {
    description: "Anzahl der ausgegebenen Aktien im Markt",
    calculation: "Aktien im Umlauf = Emittierte Aktien - Eigene Aktien"
  },
  returnOnEquity: {
    description: "Eigenkapitalrendite - Gewinn im Verhältnis zum Eigenkapital",
    calculation: "ROE = Nettogewinn / Eigenkapital × 100%"
  },
  capEx: {
    description: "Investitionen in Sachanlagen wie Maschinen, Gebäude und Ausrüstung",
    calculation: "CapEx = Käufe von Anlagevermögen - Verkäufe"
  },
  researchAndDevelopment: {
    description: "Ausgaben für Forschung und Entwicklung neuer Produkte",
    calculation: "F&E = Personalkosten + Materialkosten + externe F&E"
  },
  operatingIncome: {
    description: "Gewinn vor Zinsen und Steuern",
    calculation: "EBIT = EBITDA - Abschreibungen"
  },
  profitMargin: {
    description: "Gewinnmarge - Nettogewinn im Verhältnis zum Umsatz",
    calculation: "Gewinnmarge = (Nettogewinn / Umsatz) × 100%"
  },
  cashDebt: {
    description: "Gegenüberstellung von verfügbarer Liquidität und Schulden",
    calculation: "Nettoverschuldung = Gesamtschulden - Liquidität"
  },
  pe: {
    description: "Kurs-Gewinn-Verhältnis - Aktienkurs geteilt durch Gewinn je Aktie",
    calculation: "KGV = Aktienkurs / Gewinn je Aktie"
  },
  valuationMetrics: {
    description: "Bewertungskennzahlen zur Einschätzung der Aktienattraktivität",
    calculation: "KGV, KBV, KUV - verschiedene Preis-zu-Wert Verhältnisse"
  },
  revenueSegments: {
    description: "Aufschlüsselung des Umsatzes nach Produktkategorien",
    calculation: "Segmentumsatz = Umsatz je Geschäftsbereich"
  },
  geographicSegments: {
    description: "Umsatzverteilung nach geografischen Regionen",
    calculation: "Regionaler Umsatz = Umsatz je geografischem Markt"
  }
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
    key: 'operatingIncome' as const, 
    name: 'EBIT', 
    shortName: 'EBIT', 
    color: '#F97316',
    gradient: 'from-orange-500 to-orange-600'
  },
  { 
    key: 'netIncome' as const, 
    name: 'Nettogewinn', 
    shortName: 'Nettogewinn', 
    color: '#EF4444',
    gradient: 'from-red-500 to-red-600'
  },
  { 
    key: 'eps' as const, 
    name: 'Gewinn je Aktie', 
    shortName: 'Gewinn je Aktie', 
    color: '#F59E0B',
    gradient: 'from-amber-500 to-amber-600'
  },
  { 
    key: 'freeCashFlow' as const, 
    name: 'Free Cash Flow', 
    shortName: 'Free Cash Flow', 
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-violet-600'
  },
  { 
    key: 'dividendPS' as const, 
    name: 'Dividende je Aktie', 
    shortName: 'Dividende je Aktie', 
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  { 
    key: 'sharesOutstanding' as const, 
    name: 'Aktien im Umlauf', 
    shortName: 'Aktien im Umlauf', 
    color: '#84CC16',
    gradient: 'from-lime-500 to-lime-600'
  },
  { 
    key: 'returnOnEquity' as const, 
    name: 'Eigenkapitalrendite', 
    shortName: 'Eigenkapitalrendite', 
    color: '#EC4899',
    gradient: 'from-pink-500 to-pink-600'
  },
  { 
    key: 'capEx' as const, 
    name: 'Investitionsausgaben', 
    shortName: 'CapEx (Investitionsausgaben)', 
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  { 
    key: 'researchAndDevelopment' as const, 
    name: 'F&E Ausgaben', 
    shortName: 'Forschung & Entwicklung Ausgaben', 
    color: '#84CC16',
    gradient: 'from-lime-500 to-lime-600'
  },

]

const SPECIAL_METRICS = [
  {
    key: 'revenueSegments' as const,
    name: 'Umsatz nach Produkten',
    shortName: 'Umsatz nach Produkten',
    color: '#3B82F6'
  },
  {
    key: 'cashDebt' as const,
    name: 'Liquidität & Schulden',
    shortName: 'Liquidität & Schulden',
    cashColor: '#22C55E',
    debtColor: '#EF4444'
  },
  {
    key: 'valuationMetrics' as const,    // ✅ NEU - Kombiniert KGV, KUV, KBV
    name: 'Bewertungskennzahlen',
    shortName: 'Bewertung',
    peColor: '#F97316',      // KGV
    pbColor: '#8B5CF6',      // KBV  
    psColor: '#06B6D4'       // KUV
  },

  { 
    key: 'profitMargin' as const, 
    name: 'Gewinnmarge', 
    shortName: 'Gewinnmarge',
    color: '#F97316',
    gradient: 'from-orange-500 to-orange-600'
  },


  {
    key: 'geographicSegments' as const,
    name: 'Umsatz nach Regionen',
    shortName: 'Umsatz nach Regionen',
    color: '#10B981'
  }
]

// ✅ All metrics to display
const ALL_METRICS: MetricKey[] = [
  'revenue',
  'revenueSegments',
  'ebitda',
  'eps',
  'freeCashFlow',
  'cashDebt',
  'profitMargin',        // ✅ NEU statt PE
  'dividendPS',
  'sharesOutstanding',
  'netIncome',
  'returnOnEquity', 
  'capEx',
  'researchAndDevelopment',
  'operatingIncome', 
  'geographicSegments',
  'valuationMetrics',
]

const CHART_PRESETS: Record<string, LocalChartPreset> = {
  'essentials': {
    name: 'Basis-Analyse',
    description: 'Die wichtigsten Kennzahlen',
    charts: ['revenue', 'netIncome', 'eps', 'freeCashFlow', 'profitMargin'],
    icon: '📊'
  },
  'profitability': {
    name: 'Profitabilität',
    description: 'Margen & Rentabilität',
    charts: ['profitMargin', 'returnOnEquity', 'ebitda', 'operatingIncome', 'netIncome'],
    icon: '💰'
  },
  'growth': {
    name: 'Wachstum',
    description: 'Wachstums-Indikatoren',
    charts: ['revenue', 'revenueSegments', 'geographicSegments', 'eps', 'freeCashFlow'],
    icon: '📈'
  },
  'valuation': {
    name: 'Bewertung',
    description: 'Bewertungskennzahlen',
    charts: ['valuationMetrics', 'pe', 'eps', 'dividendPS', 'sharesOutstanding'],
    icon: '💎'
  },
  'segments': {
    name: 'Segmentierung',
    description: 'Produkt- & Geo-Segmente',
    charts: ['revenue', 'revenueSegments', 'geographicSegments', 'ebitda', 'netIncome'],
    icon: '🗂️'
  },
  'tech': {
    name: 'Tech/Innovation',
    description: 'Für Technologie-Unternehmen',
    charts: ['revenue', 'revenueSegments', 'researchAndDevelopment', 'freeCashFlow', 'profitMargin', 'returnOnEquity'],
    icon: '🚀'
  },
  'dividend': {
    name: 'Dividenden',
    description: 'Für Dividenden-Strategie',
    charts: ['dividendPS', 'freeCashFlow', 'netIncome', 'cashDebt', 'returnOnEquity'],
    icon: '💵'
  },
  'financial_health': {
    name: 'Finanzielle Gesundheit',
    description: 'Bilanz & Cashflow Fokus',
    charts: ['cashDebt', 'freeCashFlow', 'operatingIncome', 'capEx', 'returnOnEquity'],
    icon: '🏥'
  },
  'complete': {
    name: 'Vollständig',
    description: 'Alle verfügbaren Charts',
    charts: ALL_METRICS,
    icon: '🔍'
  }
}

// ─── INFO TOOLTIP KOMPONENTE ─────────────────────────────────────
function MetricTooltip({ metricKey, className = "" }: { metricKey: MetricKey, className?: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [position, setPosition] = useState<'center' | 'right'>('center')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const definition = METRIC_DEFINITIONS[metricKey as keyof typeof METRIC_DEFINITIONS]
  
  if (!definition) return null

  const handleMouseEnter = () => {
    setShowTooltip(true)
    
    // Überprüfe die Position des Buttons im Viewport
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      
      // Wenn das Element im linken Drittel des Bildschirms ist, zeige Tooltip rechts
      if (rect.left < viewportWidth / 3) {
        setPosition('right')
      } else {
        setPosition('center')
      }
    }
  }
  
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-0.5 hover:bg-theme-tertiary rounded transition-colors ${className}`}
      >
        <InformationCircleIcon className="w-3.5 h-3.5 text-theme-muted hover:text-theme-secondary" />
      </button>
      
      {showTooltip && (
        <div className={`absolute bottom-full mb-2 z-50 ${
          position === 'right' 
            ? 'left-0' 
            : 'left-1/2 transform -translate-x-1/2'
        }`}>
          <div className="bg-theme-card border border-theme/20 rounded-lg shadow-xl p-3 min-w-[280px] max-w-[320px]">
            <div className="text-xs text-theme-primary font-medium mb-1">
              {definition.description}
            </div>
            <div className="text-xs text-theme-muted font-mono">
              {definition.calculation}
            </div>
            {/* Kleiner Pfeil nach unten - Position anpassen je nach Tooltip-Position */}
            <div className={`absolute top-full w-2 h-2 bg-theme-card border-r border-b border-theme/20 rotate-45 -mt-1 ${
              position === 'right' 
                ? 'left-4' 
                : 'left-1/2 transform -translate-x-1/2'
            }`}></div>
          </div>
        </div>
      )}
    </div>
  )
}

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
            <div className="w-8 h-8 mx-auto mb-2 bg-brand/20 rounded-lg flex items-center justify-center">
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

  // ✅ DATEN VALIDIERUNG - Prüfe ob Daten für diese Metrik verfügbar sind
  const validData = data.filter(d => {
    const value = d[metricKey]
    return value !== undefined && value !== null && value !== 0
  })
  
  if (validData.length === 0) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-theme-primary">{title}</h3>
            <MetricTooltip metricKey={metricKey} />
          </div>
          <button 
            onClick={onExpand}
            className="p-1 hover:bg-theme-tertiary rounded transition-colors"
          >
            <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
          </button>
        </div>
        <div className="aspect-square flex items-center justify-center">
          <p className="text-theme-secondary text-xs">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">{title}</h3>
          <MetricTooltip metricKey={metricKey} />
        </div>
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
            data={validData} 
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{
                fontSize: 11,
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval={getXAxisInterval(validData.length)}
              height={25}
            />
            <YAxis
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{
                fontSize: 10,
                fill: 'var(--text-secondary)'
              }}
              tickFormatter={(value) => {
                if (metricKey === 'eps' || metricKey === 'dividendPS') {
                  return `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: value < 1 ? 2 : 1,
                    maximumFractionDigits: value < 1 ? 2 : 1
                  }).format(value)} $`
                } else if (metricKey === 'returnOnEquity') {
                  return `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value * 100)}%`
                } else if (metricKey === 'sharesOutstanding') {
                  return `${new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  }).format(value / 1e9)} Mrd.`
                } else {
                  return formatAxisValueDE(value)
                }
              }}
              width={35}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip 
              cursor={false}
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
function PremiumLockedChart({ title, onExpand }: { title: string, onExpand: () => void }) {
  return (
    <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 bg-brand/20 rounded-lg flex items-center justify-center">
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
          <button 
            onClick={onExpand}
            className="p-1 hover:bg-theme-tertiary rounded transition-colors"
          >
            <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
          </button>
        </div>
        <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    </div>
  )
}

function ProfitMarginChart({ data, onExpand, isPremium }: { data: any[], onExpand: () => void, isPremium: boolean }) {
  if (!isPremium) {
    return <PremiumLockedChart title="Gewinnmarge" onExpand={onExpand} />
  }

  // ✅ DATEN VALIDIERUNG
  const validData = data.filter(d => d.profitMargin !== undefined && d.profitMargin !== null)
  
  if (validData.length === 0) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-theme-primary">Gewinnmarge</h3>
            <MetricTooltip metricKey="profitMargin" />
          </div>
        </div>
        <div className="aspect-square flex items-center justify-center">
          <p className="text-theme-secondary text-xs">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">Gewinnmarge</h3>
          <MetricTooltip metricKey="profitMargin" />
        </div>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      <div className="aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={validData} margin={{ top: 10, right: 10, bottom: 25, left: 40 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
              interval={getXAxisInterval(validData.length)}
            />
            <YAxis
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 500 }}
              tickFormatter={(value) => `${(value * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              width={35}
              domain={['dataMin', 'dataMax']}
            />
            <RechartsTooltip 
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const value = payload[0].value as number
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    <p className="text-theme-primary text-sm font-medium">
                      {(value * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </p>
                  </div>
                )
              }}
            />
            <Bar 
              dataKey="profitMargin" 
              fill="#F97316" 
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
// KORRIGIERTE RevenueSegmentsChart Funktion für FinancialAnalysisClient.tsx
function RevenueSegmentsChart({ 
  ticker, 
  onExpand, 
  isPremium 
}: { 
  ticker: string, 
  onExpand: () => void, 
  isPremium: boolean 
}) {
  const { formatCurrency, formatAxisValueDE } = useCurrency()
  const [segmentData, setSegmentData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSegments() {
      if (!ticker || !isPremium) {
        setLoading(false)
        return
      }

      try {
        const url = `/api/revenue-segmentation/${ticker}?type=product&period=annual&structure=flat`
        
        console.log('🔍 [RevenueSegments] API URL:', url)
        
        const res = await fetch(url)
        console.log('🔍 [RevenueSegments] Response Status:', res.status)
        
        if (!res.ok) {
          console.error('❌ [RevenueSegments] API request failed:', res.statusText)
          setSegmentData([])
          return
        }
        
        const response = await res.json()
        console.log('📊 [RevenueSegments] Raw API Response:', JSON.stringify(response, null, 2))
        
        const data = response.success ? response.data : []
        if (!Array.isArray(data) || data.length === 0) {
          console.warn('⚠️ [RevenueSegments] No data or invalid format')
          setSegmentData([])
          return
        }

        // Transform the data
        const transformed = data
          .map((yearData: any, index: number) => {
            console.log(`📅 [RevenueSegments] Processing year ${index}:`, yearData)
            
            // Get the date key (first key in the object)
            const dateKey = Object.keys(yearData)[0]
            console.log(`📅 [RevenueSegments] Date key:`, dateKey)
            
            if (!dateKey) {
              console.warn(`⚠️ [RevenueSegments] No date key for index ${index}`)
              return null
            }
            
            const segments = yearData[dateKey]
            console.log(`📅 [RevenueSegments] Segments for ${dateKey}:`, segments)
            
            if (!segments || typeof segments !== 'object') {
              console.warn(`⚠️ [RevenueSegments] No segments for ${dateKey}`)
              return null
            }
            
            const segmentKeys = Object.keys(segments)
            console.log(`📅 [RevenueSegments] Segment keys for ${dateKey}:`, segmentKeys)
            
            if (segmentKeys.length === 0) {
              console.warn(`⚠️ [RevenueSegments] Empty segments for ${dateKey}`)
              return null
            }

            // Extract year from date
            const year = dateKey.substring(0, 4)
            const result: any = { label: year }
            
            // Add all segments
            Object.entries(segments).forEach(([segmentName, value]) => {
        
              
              if (typeof value === 'number' && value > 0) {
                // Shorten long segment names
                const shortName = segmentName.length > 25 
                  ? segmentName.substring(0, 22) + '...' 
                  : segmentName
                result[shortName] = value
              }
            })
            
  
            return result
          })
          .filter(Boolean) // Remove null values
          .reverse() // Sort chronologically (oldest first)
   
        
        setSegmentData(transformed)
        
      } catch (error) {
   
        setSegmentData([])
      } finally {
        setLoading(false)
      }
    }

    loadSegments()
  }, [ticker, isPremium])

  // Premium Check
  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-brand/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-theme-secondary font-medium">Premium</p>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-theme-primary">Umsatz nach Produkten</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
            </button>
          </div>
          <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Umsatz nach Produkten</h3>
        </div>
        <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  // No Data State
  if (segmentData.length === 0) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Umsatz nach Produkten</h3>
        </div>
        <div className="aspect-square flex items-center justify-center">
          <p className="text-theme-secondary text-xs">Keine Segment-Daten verfügbar</p>
        </div>
      </div>
    )
  }

  // ✅ CHART RENDERING - UNION ALLER SEGMENTE MIT POSITIVEN WERTEN (wie im Modal)
  const allSegmentKeys = new Set<string>()
  segmentData.forEach(yearData => {
    Object.keys(yearData).forEach(key => {
      if (key !== 'label') {
        // ✅ NUR KEYS MIT WERTEN > 0 IN MINDESTENS EINEM JAHR
        const hasPositiveValue = segmentData.some(year => (year[key] || 0) > 0)
        if (hasPositiveValue) {
          allSegmentKeys.add(key)
        }
      }
    })
  })
  
  const segmentKeys = Array.from(allSegmentKeys)
  const SEGMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#EC4899']

  console.log('🎨 [RevenueSegments] Rendering chart with:', { 
    dataLength: segmentData.length, 
    segmentKeys,
    allSegments: segmentKeys.length,
    firstDataPoint: segmentData[0] 
  })

  // ✅ NORMALISIERTE DATEN ERSTELLEN (fehlende Segmente = 0, aber Jahre ohne Segmente entfernen)
  const normalizedData = segmentData.map(yearData => {
    const normalized = { ...yearData }
    segmentKeys.forEach(key => {
      if (!(key in normalized)) {
        normalized[key] = 0
      }
    })
    return normalized
  }).filter(yearData => {
    // ✅ ENTFERNE JAHRE WO ALLE SEGMENTE 0 SIND
    const hasAnyValue = segmentKeys.some(key => (yearData[key] || 0) > 0)
    return hasAnyValue
  })

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">
          Umsatz nach Produkten
            {segmentData.length > 0 && (
              <span className="text-xs text-theme-muted ml-2">
                ({segmentData[0]?.label} - {segmentData[segmentData.length - 1]?.label})
              </span>
            )}
          </h3>
          <MetricTooltip metricKey="revenueSegments" />
        </div>
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
            data={normalizedData}  // ✅ Verwende normalisierte Daten
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
              interval={getXAxisInterval(normalizedData.length)}
            />
            <YAxis
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 500 }}
              tickFormatter={(value) => formatAxisValueDE(value)}
              width={35}
            />
            <RechartsTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload) return null

                // ✅ FILTERE 0-WERTE AUS DER TOOLTIP
                const nonZeroPayload = payload.filter(entry => (entry.value as number) > 0)
                const total = nonZeroPayload.reduce((sum, entry) => sum + (entry.value as number), 0)
                
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    {nonZeroPayload.map((entry, index) => (
                      <div key={index} className="flex justify-between gap-3 text-xs">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="text-theme-primary font-medium">
                          {formatCurrency(entry.value as number)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-theme/20 mt-1 pt-1">
                      <div className="flex justify-between gap-3 text-xs">
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
            
            {/* ✅ NUR BARS FÜR SEGMENTE MIT WERTEN RENDERN */}
            {segmentKeys.map((segment, index) => {
              const hasAnyValue = normalizedData.some(year => (year[segment] || 0) > 0)
              if (!hasAnyValue) return null
              
              return (
                <Bar 
                  key={segment}
                  dataKey={segment}
                  stackId="a"
                  fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                  radius={index === segmentKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                />
              )
            }).filter(Boolean)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ✅ VALUATION METRICS CHART COMPONENT (KGV, KUV, KBV)
function ValuationMetricsChart({ data, onExpand, isPremium }: { data: any[], onExpand: () => void, isPremium: boolean }) {
  if (!isPremium) {
    return <PremiumLockedChart title="Bewertung" onExpand={onExpand} />
  }

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">Bewertung</h3>
          <MetricTooltip metricKey="valuationMetrics" />
        </div>
        <button onClick={onExpand} className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100">
          <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
        </button>
      </div>
      
      <div className="aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 25, left: 40 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis dataKey="label" axisLine={false} tickLine={false}
                   tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                   interval={getXAxisInterval(data.length)} />
            <YAxis axisLine={false} tickLine={false}
                   tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 500 }}
                   tickFormatter={(value) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`} />
            <RechartsTooltip 
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload) return null
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                        {entry.name}: {(entry.value as number).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Line type="monotone" dataKey="pe" name="KGV" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="pb" name="KBV" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="ps" name="KUV" stroke="#06B6D4" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


// VOLLSTÄNDIGE GeographicSegmentsChart Komponente

function GeographicSegmentsChart({ 
  ticker, 
  onExpand, 
  isPremium 
}: { 
  ticker: string, 
  onExpand: () => void, 
  isPremium: boolean 
}) {
  const { formatCurrency, formatAxisValueDE } = useCurrency()
  const [segmentData, setSegmentData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSegments() {
      try {
        const res = await fetch(
          `/api/revenue-segmentation/${ticker}?type=geographic&period=annual&structure=flat`
        )
        
        if (res.ok) {
          const response = await res.json()
          console.log('📊 Raw geographic data:', response)
          const data = response.success ? response.data : []
          
          if (Array.isArray(data) && data.length > 0) {
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
              
              const result: any = { label: year }
              
              Object.entries(segments).forEach(([segmentName, value]) => {
                if (typeof value === 'number' && value > 0) {
                  const shortName = segmentName.length > 20 
                    ? segmentName.substring(0, 17) + '...' 
                    : segmentName
                  result[shortName] = value
                }
              })
              
              return result
            })
            .filter(Boolean)
            .reverse()
            .slice(-10)
            
            console.log('✅ Transformed geographic segments:', transformed)
            setSegmentData(transformed)
          }
        }
      } catch (error) {
        console.error('Failed to load geographic segment data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (ticker && isPremium) {
      loadSegments()
    } else {
      setLoading(false)
    }
  }, [ticker, isPremium])

  // Premium Check
  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-brand/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-theme-secondary font-medium">Premium</p>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-theme-primary">Umsatz nach Regionen</h3>
            <button className="p-1 hover:bg-theme-tertiary rounded transition-colors">
              <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary" />
            </button>
          </div>
          <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Umsatz nach Regionen</h3>
        </div>
        <div className="aspect-square bg-theme-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  // No Data State
  if (segmentData.length === 0) {
    return (
      <div className="bg-theme-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Umsatz nach Regionen</h3>
        </div>
        <div className="aspect-square flex items-center justify-center">
          <p className="text-theme-secondary text-xs">Keine geografischen Daten verfügbar</p>
        </div>
      </div>
    )
  }

  // Chart Rendering
  const segmentKeys = Object.keys(segmentData[0] || {}).filter(key => key !== 'label')
  const GEO_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16']

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">
        Umsatz nach Regionen
          {segmentData.length > 0 && (
            <span className="text-xs text-theme-muted ml-2">
              ({segmentData[0]?.label} - {segmentData[segmentData.length - 1]?.label})
            </span>
          )}
        </h3>
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
            data={segmentData} 
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 12, fill: 'var(--color-text-primary)', fontWeight: 500 }}
              interval={getXAxisInterval(segmentData.length)}
            />
            <YAxis
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 500 }}
              tickFormatter={(value) => formatAxisValueDE(value)}
              width={35}
            />
            <RechartsTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload) return null
                const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    {payload.slice(0, 5).map((entry, index) => (
                      <div key={index} className="flex justify-between gap-3 text-xs">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="text-theme-primary font-medium">
                          {formatCurrency(entry.value as number)}
                        </span>
                      </div>
                    ))}
                    {payload.length > 5 && (
                      <div className="text-xs text-theme-secondary">+{payload.length - 5} weitere...</div>
                    )}
                    <div className="border-t border-theme/20 mt-1 pt-1">
                      <div className="flex justify-between gap-3 text-xs">
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
            
            {/* Stacked Bar Chart für Geo-Segmente */}
            {segmentKeys.map((segment, index) => (
              <Bar 
                key={segment}
                dataKey={segment}
                stackId="a"
                fill={GEO_COLORS[index % GEO_COLORS.length]}
                radius={index === segmentKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


function CashDebtChart({ data, onExpand, isPremium }: { data: any[], onExpand: () => void, isPremium: boolean }) {
  const { formatAxisValueDE } = useCurrency()

  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-theme-card/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 bg-brand/20 rounded-lg flex items-center justify-center">
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-theme-primary">Cash & Schulden</h3>
          <MetricTooltip metricKey="cashDebt" />
        </div>
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
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{
                fontSize: 11,
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval={getXAxisInterval(data.length)}
              height={25}
            />
            <YAxis
              tickFormatter={formatAxisValueDE}
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{
                fontSize: 10,
                fill: 'var(--text-secondary)'
              }}
              width={50}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip 
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload) return null
                
                return (
                  <div className="bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-theme-secondary text-xs mb-1">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-theme-primary text-sm font-medium">
                        <span style={{ color: entry.color }}>{entry.name}:</span> {formatAxisValueDE(entry.value as number)}
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
            <div className="w-8 h-8 mx-auto mb-2 bg-brand/20 rounded-lg flex items-center justify-center">
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
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{
                fontSize: 11,
                fill: 'var(--text-secondary)',
                textAnchor: 'middle'
              }}
              interval={getXAxisInterval(data.length)}
              height={25}
            />
            <YAxis
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{
                fontSize: 10,
                fill: 'var(--text-secondary)'
              }}
              tickFormatter={(value) => `${new Intl.NumberFormat('de-DE', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              }).format(value)}x`}
              width={35}
              domain={[0, 'dataMax']}
            />
            <RechartsTooltip 
              cursor={false}
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
 
 // ─── Main Component - ULTRA CLEAN: PROFESSIONELLE CONTROLS + BORDERLESS CHARTS ────────────────
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
  
  // ✅ NEUE STATES FÜR PRESET SYSTEM
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  
  // ✅ NEW: Chart Presets Hook mit Supabase + LocalStorage Fallback
  const {
    presets: customPresets,
    loading: presetsLoading,
    error: presetsError,
    createPreset,
    updatePreset,
    deletePreset: deletePresetFromStorage,
    refreshPresets
  } = useChartPresets(userId || null, isPremium)
  
  const { currency } = useCurrency()

  // ✅ APPLY PRESET
  const applyPreset = async (presetKey: string) => {
    if (!isPremium) {
      window.location.href = '/pricing'
      return
    }
 
    setSelectedPreset(presetKey)
    
    // ✅ SIMPLE: Save last selected preset to localStorage
    console.log('💾 [applyPreset] Saving preset to localStorage:', presetKey)
    localStorage.setItem('finclue-last-preset', presetKey)
    
    // Check if it's a built-in preset
    if (CHART_PRESETS[presetKey]) {
      console.log('📊 [applyPreset] Built-in preset found:', CHART_PRESETS[presetKey].charts)
      setVisibleCharts(CHART_PRESETS[presetKey].charts as MetricKey[])
      // ✅ SIMPLE: Also save the visible charts
      localStorage.setItem('finclue-last-charts', JSON.stringify(CHART_PRESETS[presetKey].charts))
      console.log('✅ [applyPreset] Built-in preset applied and saved')
      return
    }
    
    // Check if it's a custom preset
    const customPreset = customPresets.find(p => p.id === presetKey)
    if (customPreset) {
      console.log('📊 [applyPreset] Custom preset found:', customPreset.charts)
      setVisibleCharts(customPreset.charts as MetricKey[])
      // ✅ SIMPLE: Also save the visible charts
      localStorage.setItem('finclue-last-charts', JSON.stringify(customPreset.charts))
      console.log('✅ [applyPreset] Custom preset applied and saved')
      // Update last used via the hook
      await updatePreset({
        id: presetKey,
        lastUsed: new Date().toISOString()
      })
    }
  }
 
  // ✅ SAVE CURRENT SELECTION AS PRESET
  const saveCurrentAsPreset = async () => {
    console.log('🚀 [saveCurrentAsPreset] Called with:', {
      isPremium,
      newPresetName: newPresetName.trim(),
      visibleCharts
    })
    if (!isPremium) {
      window.location.href = '/pricing'
      return
    }
 
    if (!newPresetName.trim()) return
 
    setSaveStatus('saving')

    const savedPreset = await createPreset({
      name: newPresetName.trim(),
      charts: visibleCharts
    })

    if (savedPreset) {
      setSaveStatus('success')
      setNewPresetName('')
      setSelectedPreset(savedPreset.id)
      
      // ✅ SIMPLE: Save newly created preset to localStorage immediately
      console.log('💾 [saveCurrentAsPreset] Saving new preset to localStorage:', savedPreset.id, visibleCharts)
      localStorage.setItem('finclue-last-preset', savedPreset.id)
      localStorage.setItem('finclue-last-charts', JSON.stringify(visibleCharts))
      console.log('✅ [saveCurrentAsPreset] New preset saved to localStorage')
      
      // Success feedback für 2 Sekunden, dann Dialog schließen
      setTimeout(() => {
        setShowSavePresetDialog(false)
        setSaveStatus('idle')
      }, 2000)
    } else {
      setSaveStatus('error')
      // Error zurücksetzen nach 3 Sekunden
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }
 
  // ✅ DELETE CUSTOM PRESET
  const deleteCustomPreset = async (presetId: string) => {
    const success = await deletePresetFromStorage(presetId)
    if (success && selectedPreset === presetId) {
      setSelectedPreset('')
    }
  }
 
  useEffect(() => {
    async function loadRealData() {
      setLoadingData(true)
      setDataQuality('loading')
      
      try {
        const realData = await financialDataService.getFinancialData(ticker, period)
        setData(realData)
        
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

  // ✅ SIMPLE AUTO-LOAD LAST PRESET FROM LOCALSTORAGE
  useEffect(() => {
    console.log('🔍 [FinancialAnalysisClient] useEffect running, isPremium:', isPremium, 'userId:', userId)
    
    // Wait for user/premium state to be loaded
    if (!userId) {
      console.log('⏳ [FinancialAnalysisClient] Waiting for userId to be set')
      return
    }
    
    if (!isPremium) {
      console.log('❌ [FinancialAnalysisClient] Not premium, skipping preset restore')
      return
    }
    
    try {
      const lastPreset = localStorage.getItem('finclue-last-preset')
      const lastCharts = localStorage.getItem('finclue-last-charts')
      
      console.log('📦 [FinancialAnalysisClient] localStorage items:', { lastPreset, lastCharts })
      
      if (lastPreset && lastCharts) {
        console.log('🔄 [FinancialAnalysisClient] Restoring last preset:', lastPreset)
        setSelectedPreset(lastPreset)
        setVisibleCharts(JSON.parse(lastCharts))
      } else {
        console.log('❌ [FinancialAnalysisClient] No preset to restore')
      }
    } catch (error) {
      console.warn('❌ [FinancialAnalysisClient] Failed to restore last preset:', error)
    }
  }, [isPremium, userId])
 
  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>

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
    // Clear selected preset when manually changing charts
    setSelectedPreset('')
  }
 
  function getChartName(key: MetricKey): string {
    if (key === 'cashDebt') return 'Liquidität & Schulden'
    if (key === 'pe') return 'KGV TTM'
    if (key === 'capEx') return 'CapEx'
    if (key === 'researchAndDevelopment') return 'Forschung & Entwicklung'
    if (key === 'operatingIncome') return 'EBIT'
    if (key === 'revenueSegments') return 'Umsatz nach Produkten'
    if (key === 'geographicSegments') return 'Umsatz nach Regionen' 
    if (key === 'profitMargin') return 'Gewinnmarge'
    if (key === 'valuationMetrics') return 'Bewertung'
    
    const metric = METRICS.find(m => m.key === key)
    return metric?.shortName || key
  }
 
  // Ref für ALL_METRICS hinzufügen falls noch nicht vorhanden
  if (!ALL_METRICS.includes('valuationMetrics' as MetricKey)) {
    ALL_METRICS.push('valuationMetrics' as MetricKey)
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
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-theme-secondary hover:text-brand hover:bg-brand/10'
                    }`}
                  >
                    {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* STATUS INDIKATOREN */}
    
        </div>
        
        {/* ✅ NEUE PRESET CONTROLS */}
        <div className="mb-6 pb-6 border-b border-theme/10">
          <div className="flex flex-wrap items-center gap-4">
            {/* Preset Quick Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme-primary font-semibold">Presets:</span>
              <div className="flex gap-2">
                {Object.entries(CHART_PRESETS).slice(0, 5).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      selectedPreset === key
                        ? 'bg-brand text-white'
                        : 'bg-theme-tertiary text-theme-secondary hover:bg-brand/10 hover:text-brand'
                    }`}
                    title={(preset as LocalChartPreset).description}
                  >
                    <span className="mr-1">{(preset as LocalChartPreset).icon}</span>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
 
            {/* More Presets Dropdown */}
            <select
              value={selectedPreset}
              onChange={(e) => applyPreset(e.target.value)}
              className="px-3 py-1.5 text-xs bg-theme-tertiary text-theme-secondary rounded-lg hover:bg-theme-hover transition-colors"
            >
              <option value="">Weitere Presets...</option>
              <optgroup label="Standard Presets">
                {Object.entries(CHART_PRESETS).slice(5).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {(preset as LocalChartPreset).icon} {preset.name}
                  </option>
                ))}
              </optgroup>
              {customPresets.length > 0 && (
                <optgroup label="Meine Presets">
                  {customPresets.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      ⭐ {preset.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
 
            {/* Save Current Button */}
            <button
              onClick={() => handlePremiumAction(() => setShowSavePresetDialog(true))}
              className="px-3 py-1.5 text-xs bg-theme-tertiary text-theme-secondary rounded-lg hover:bg-brand/10 hover:text-brand-light transition-colors"
            >
              💾 Aktuelle Auswahl speichern
            </button>
 
            {/* Delete Custom Preset Button (if custom preset selected) */}
            {customPresets.some(preset => preset.id === selectedPreset) && (
              <button
                onClick={() => deleteCustomPreset(selectedPreset)}
                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                🗑️ Löschen
              </button>
            )}
          </div>
 
       {/* Save Preset Dialog - ALS MODAL */}
{showSavePresetDialog && (
  <>
    {/* Backdrop */}
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      onClick={() => {
        setShowSavePresetDialog(false)
        setNewPresetName('')
      }}
    />
    
    {/* Modal */}
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
      <div className="bg-theme-card rounded-xl shadow-2xl border border-theme/20 p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-theme-primary">
            Preset speichern
          </h3>
          <p className="text-sm text-theme-secondary mt-1">
            Speichere deine aktuelle Chart-Auswahl als wiederverwendbares Preset
          </p>
        </div>
        
        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-primary mb-2">
            Preset Name
          </label>
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="z.B. Meine Analyse, Q4 Report, Tech-Fokus..."
            className="w-full px-4 py-2.5 bg-theme-tertiary text-theme-primary rounded-lg 
                     border border-theme/20 focus:outline-none focus:ring-2 focus:ring-brand 
                     focus:border-transparent transition-all"
            style={{ color: 'var(--color-text-primary)' }}
            onKeyDown={(e) => e.key === 'Enter' && newPresetName.trim() && saveCurrentAsPreset()}
            autoFocus
          />
        </div>
        
        {/* Info */}
        <div className="mb-6 p-3 bg-theme-tertiary/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-brand-light">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{visibleCharts.length} Charts ausgewählt</span>
            </div>
            <span className="text-theme-muted">•</span>
            <span className="text-theme-muted">
              {visibleCharts.length === 0 ? 'Keine Charts' : 
               visibleCharts.length === ALL_METRICS.length ? 'Alle Charts' : 
               'Individuelle Auswahl'}
            </span>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowSavePresetDialog(false)
              setNewPresetName('')
            }}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-theme-tertiary text-theme-secondary 
                     rounded-lg hover:bg-theme-hover transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              console.log('🔘 [Button] Click detected, newPresetName:', newPresetName.trim())
              saveCurrentAsPreset()
            }}
            disabled={!newPresetName.trim() || saveStatus === 'saving'}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all transform disabled:cursor-not-allowed ${
              saveStatus === 'success' 
                ? 'bg-brand text-white' 
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-brand text-white hover:bg-brand hover:scale-[1.02]'
            } ${(!newPresetName.trim() || saveStatus === 'saving') ? 'opacity-50 hover:scale-100' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              {saveStatus === 'saving' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : saveStatus === 'success' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : saveStatus === 'error' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {saveStatus === 'saving' ? 'Speichert...' : 
               saveStatus === 'success' ? 'Gespeichert!' : 
               saveStatus === 'error' ? 'Fehler!' : 'Speichern'}
            </div>
          </button>
        </div>
      </div>
    </div>
  </>
)}
        </div>
        
        {/* KENNZAHLEN AUSWAHL - PROFESSIONELL */}
     {/* KENNZAHLEN AUSWAHL - CLEAN & MINIMAL */}
     <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-theme-secondary">Kennzahlen</h4>
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => handlePremiumAction(() => {
                  setVisibleCharts(ALL_METRICS)
                  setSelectedPreset('')
                })}
                className="text-theme-muted hover:text-theme-primary transition-colors"
              >
                Alle
              </button>
              <span className="text-theme-muted">|</span>
              <button
                onClick={() => handlePremiumAction(() => {
                  setVisibleCharts([])
                  setSelectedPreset('')
                })}
                className="text-theme-muted hover:text-theme-primary transition-colors"
              >
                Keine
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {ALL_METRICS.map((chartKey) => (
              <button
                key={chartKey}
                onClick={() => handlePremiumAction(() => toggleChartVisibility(chartKey))}
                className="flex items-center gap-2 py-1 text-sm transition-colors group"
              >
                {/* Checkbox Style Indicator */}
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  visibleCharts.includes(chartKey) 
                    ? 'bg-brand border-brand' 
                    : 'border-theme-muted group-hover:border-theme-secondary'
                }`}>
                  {visibleCharts.includes(chartKey) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`transition-colors ${
                  visibleCharts.includes(chartKey) 
                    ? 'text-theme-primary' 
                    : 'text-theme-muted group-hover:text-theme-secondary'
                }`}>
                  {getChartName(chartKey)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
 
      {/* ✅ ULTRA CLEAN GRID: 5 SPALTEN + KOMPLETT OHNE BORDERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {/* Render charts in the exact order of ALL_METRICS */}
        {ALL_METRICS.filter(key => visibleCharts.includes(key)).map((metricKey) => {
          // Find if it's a regular metric
          const metric = METRICS.find(m => m.key === metricKey)
          
          // Render based on metric type
          if (metric) {
            return (
              <ChartCard
                key={metricKey}
                title={metric.shortName}
                data={data}
                metricKey={metricKey}
                color={metric.color}
                gradient={metric.gradient}
                onExpand={() => setFullscreen(metricKey)}
                isPremium={isPremium}
              />
            )
          }
          
          // Special charts
          switch(metricKey) {
            case 'revenueSegments':
              return (
                <RevenueSegmentsChart 
                  key={metricKey}
                  ticker={ticker}
                  onExpand={() => setFullscreen('revenueSegments')}
                  isPremium={isPremium}
                />
              )
            case 'cashDebt':
              return (
                <CashDebtChart 
                  key={metricKey}
                  data={data} 
                  onExpand={() => setFullscreen('cashDebt')}
                  isPremium={isPremium}
                />
              )
            case 'pe':
              return (
                <PERatioChart 
                  key={metricKey}
                  data={data} 
                  onExpand={() => setFullscreen('pe')}
                  isPremium={isPremium}
                />
              )
            case 'profitMargin':
              return (
                <ProfitMarginChart 
                  key={metricKey}
                  data={data} 
                  onExpand={() => setFullscreen('profitMargin')}
                  isPremium={isPremium}
                />
              )
            case 'valuationMetrics':
              return (
                <ValuationMetricsChart 
                  key={metricKey}
                  data={data} 
                  onExpand={() => setFullscreen('valuationMetrics')}
                  isPremium={isPremium}
                />
              )
            case 'geographicSegments':
              return (
                <GeographicSegmentsChart 
                  key={metricKey}
                  ticker={ticker}
                  onExpand={() => setFullscreen('geographicSegments')}
                  isPremium={isPremium}
                />
              )
            default:
              return null
          }
        })}
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