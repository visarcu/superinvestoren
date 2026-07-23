'use client'

import React, { useState, useMemo } from 'react'
import {
  CheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import MarginOfSafetyGauge from '@/components/MarginOfSafetyGauge'
import { fmtPrice, fmtNum } from '@/utils/formatters'

interface StockData {
  ticker: string
  name: string
  price: number
  epsTTM: number
  peTTM: number
  epsGrowth: number
  epsGrowth5Y: number
  fcfPerShare: number
  fcfYield: number
  fcfGrowth5Y: number
  ocfPerShare: number
  ocfYield: number
  ocfGrowth5Y: number
  fcfMultiple5YMedian: MultipleMedian | null   // Median Kurs/Free Cash Flow
  ocfMultiple5YMedian: MultipleMedian | null   // Median Kurs/Operativer Cashflow (KCV)
  sbcImpact: number
}

interface MultipleMedian {
  value: number
  years: number   // Anzahl der Jahre, die tatsächlich in den Median eingeflossen sind
}

type CalculatorMode = 'earnings' | 'cashflow' | 'opcashflow'

// Fallback-Multiples, wenn FMP keine Historie liefert
const FALLBACK_OCF_MULTIPLE = 18
const FALLBACK_FCF_MULTIPLE = 20

// Helper: Parse DE-Format input (Komma → Punkt) für parseFloat
const parseDE = (val: string) => parseFloat(val.replace(',', '.'))

// Helper: 5-Jahres-CAGR aus YoY-Wachstumsraten (geometrisches Mittel)
const cagr5Y = (values: number[]) =>
  values.length > 0
    ? (Math.pow(values.reduce((a, b) => a * (1 + b), 1), 1 / values.length) - 1) * 100
    : 0

// Unter so vielen verwertbaren Jahren ist ein Median nicht aussagekräftig
const MIN_MEDIAN_YEARS = 3

// Helper: Median der historischen Bewertungsmultiples.
// Negative Multiples (negativer Cashflow) sind als Bewertungsmassstab unbrauchbar und fliegen raus;
// bleiben zu wenige Jahre übrig, gibt es keinen Median statt eines irreführenden Werts.
const multipleMedian = (values: (number | undefined)[]): MultipleMedian | null => {
  const valid = values.filter((v): v is number => v != null && !isNaN(v) && isFinite(v) && v > 0)
  if (valid.length < MIN_MEDIAN_YEARS) return null

  const sorted = [...valid].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  return { value, years: valid.length }
}

// Migration: früher wurde die Ziel-Rendite (in %) eingegeben, heute das Multiple.
// Rendite 4 % → Multiple 25. Wird für gespeicherte Altwerte benötigt.
export const yieldPercentToMultiple = (yieldPercent: number): number | null =>
  !isFinite(yieldPercent) || yieldPercent === 0 ? null : 100 / yieldPercent

interface ProjectionInput {
  base: number          // Basiswert pro Aktie (EPS, FCF oder OCF)
  growth: number        // Jährliches Wachstum als Dezimalzahl
  multiple: number      // Kurs = Basiswert × Multiple (KGV bzw. 1 / Ziel-Rendite)
  desiredReturn: number
  currentPrice: number
  years: number
  decay: number
  terminalGrowth: number
  marginOfSafety: number
}

// Gemeinsame Projektionslogik für alle drei Modi
const buildProjection = ({
  base, growth, multiple, desiredReturn, currentPrice, years, decay, terminalGrowth, marginOfSafety
}: ProjectionInput) => {
  const projections: { year: string; value: number; price: number }[] = []
  let projectedValue = base
  let currentGrowth = growth
  const currentYear = new Date().getFullYear()

  for (let year = 0; year <= years; year++) {
    projections.push({
      year: `${currentYear + year}`,
      value: projectedValue,
      price: projectedValue * multiple
    })

    // Wachstum mit Decay anwenden
    projectedValue = projectedValue * (1 + currentGrowth)
    currentGrowth = Math.max(terminalGrowth, currentGrowth * (1 - decay))
  }

  const futureValue = projections[years].value
  const futurePrice = projections[years].price

  // CAGR ausgehend vom heutigen Kurs
  const cagr = Math.pow(futurePrice / currentPrice, 1 / years) - 1

  // Einstiegskurs für die gewünschte Rendite, danach Margin of Safety
  const entryPriceRaw = futurePrice / Math.pow(1 + desiredReturn, years)
  const entryPrice = entryPriceRaw * (1 - marginOfSafety / 100)
  const upside = ((entryPrice - currentPrice) / currentPrice) * 100

  return {
    projections,
    futureValue,
    futurePrice,
    cagr: cagr * 100,
    entryPrice,
    entryPriceRaw,
    upside,
    fairValue: entryPrice
  }
}

export default function ImprovedDCFCalculator() {
  // Stock selection
  const [, setSelectedTicker] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stockData, setStockData] = useState<StockData | null>(null)

  // Calculator mode
  const [mode, setMode] = useState<CalculatorMode>('earnings')

  // Earnings mode inputs
  const [epsInput, setEpsInput] = useState<string>('')
  const [epsGrowthRate, setEpsGrowthRate] = useState<string>('')
  const [targetPE, setTargetPE] = useState<string>('')
  const [desiredReturnEarnings, setDesiredReturnEarnings] = useState<string>('10')

  // Cash Flow mode inputs
  const [fcfInput, setFcfInput] = useState<string>('')
  const [fcfGrowthRate, setFcfGrowthRate] = useState<string>('')
  const [targetFcfMultiple, setTargetFcfMultiple] = useState<string>('')
  const [desiredReturnCashFlow, setDesiredReturnCashFlow] = useState<string>('10')

  // Operating Cash Flow mode inputs
  const [ocfInput, setOcfInput] = useState<string>('')
  const [ocfGrowthRate, setOcfGrowthRate] = useState<string>('')
  const [targetOcfMultiple, setTargetOcfMultiple] = useState<string>('')
  const [desiredReturnOpCashFlow, setDesiredReturnOpCashFlow] = useState<string>('10')

  // Core settings (visible)
  const [projectionYears, setProjectionYears] = useState<number>(10)
  const [marginOfSafety, setMarginOfSafety] = useState<number>(0)

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [growthDecayRate, setGrowthDecayRate] = useState<string>('0')
  const [terminalGrowthRate, setTerminalGrowthRate] = useState<string>('3')

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Validation state
  const [validationResult, setValidationResult] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Load qualitative AI insights
  const loadAiInsights = async (ticker: string) => {
    setIsAiLoading(true)
    setAiError(null)
    setAiInsights(null)
    setValidationResult(null) // Reset validation on stock change

    try {
      // Get auth token from supabase session
      const { supabase } = await import('@/lib/supabaseClient')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: `Analysiere die Wachstumschancen und das angemessene Bewertungsniveau für ${ticker}.`,
          analysisType: 'dcf-context',
          ticker: ticker,
          context: []
        })
      })

      if (!response.ok) {
        if (response.status === 403) throw new Error('Premium subscription required')
        throw new Error('AI analysis failed')
      }
      const data = await response.json()
      setAiInsights(data.response.content)
    } catch (err: any) {
      console.error('Failed to load AI DCF insights:', err)
      setAiError(err.message)
    } finally {
      setIsAiLoading(false)
    }
  }

  // Handle AI Assumption Check (Validation)
  const handleValidationCheck = async () => {
    if (!stockData) return
    setIsValidating(true)
    setValidationResult(null)

    try {
      const { supabase } = await import('@/lib/supabaseClient')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const growth = mode === 'earnings' ? epsGrowthRate : mode === 'cashflow' ? fcfGrowthRate : ocfGrowthRate
      const multiple = mode === 'earnings' ? targetPE : mode === 'cashflow' ? targetFcfMultiple : targetOcfMultiple
      const method = mode === 'earnings'
        ? 'Earnings (EPS × Ziel-KGV)'
        : mode === 'cashflow'
          ? 'Free Cash Flow (FCF × Kurs/Free-Cash-Flow-Multiple)'
          : 'Operativer Cashflow (OCF × KCV, Capex bleibt unberücksichtigt)'

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: "Check my DCF assumptions.",
          analysisType: 'dcf-validation',
          ticker: stockData.ticker,
          context: [],
          assumptions: {
            growthRate: parseDE(growth),
            exitMultiple: parseDE(multiple),
            terminalGrowth: parseDE(terminalGrowthRate),
            projectionYears: projectionYears,
            method
          }
        })
      })

      if (!response.ok) throw new Error('Validation failed')
      const data = await response.json()
      setValidationResult(data.response.content)
    } catch (err) {
      console.error('Validation error:', err)
    } finally {
      setIsValidating(false)
    }
  }

  // Filtered stocks for search
  const filteredStocks = searchQuery
    ? (() => {
        const q = searchQuery.toLowerCase()
        const qUpper = searchQuery.toUpperCase()
        return stocks
          .filter(s =>
            s.ticker.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
          )
          .sort((a, b) => {
            const score = (s: typeof a) =>
              s.ticker === qUpper ? 0
              : s.ticker.startsWith(qUpper) ? 1
              : s.name.toLowerCase().startsWith(q) ? 2
              : 3
            return score(a) - score(b)
          })
          .slice(0, 8)
      })()
    : []

  // Load stock data from API
  const loadStockData = async (ticker: string) => {
    setLoading(true)
    try {
      // Fetch key metrics, quote, growth and 5y multiple history
      const [quoteRes, metricsRes, growthRes, historyRes] = await Promise.all([
        fetch(`/api/fmp/quote?symbol=${ticker}`),
        fetch(`/api/fmp/key-metrics-ttm?symbol=${ticker}`),
        fetch(`/api/fmp/financial-growth?symbol=${ticker}&limit=5`),
        fetch(`/api/fmp/key-metrics?symbol=${ticker}&period=annual&limit=5`)
      ])

      const quoteData = await quoteRes.json()
      const metricsData = await metricsRes.json()
      const growthData = await growthRes.json()
      const historyData = await historyRes.json()

      const quote = Array.isArray(quoteData) ? quoteData[0] : quoteData
      const metrics = Array.isArray(metricsData) ? metricsData[0] : metricsData
      const growthArray = Array.isArray(growthData) ? growthData : []
      const historyArray = Array.isArray(historyData) ? historyData : []

      const price = quote?.price || 0
      const epsTTM = metrics?.netIncomePerShareTTM || quote?.eps || 0
      const peTTM = metrics?.peRatioTTM || quote?.pe || (price / epsTTM) || 0
      const fcfPerShare = metrics?.freeCashFlowPerShareTTM || 0
      const fcfYield = metrics?.freeCashFlowYieldTTM ? metrics.freeCashFlowYieldTTM * 100 : (fcfPerShare / price * 100) || 0
      const ocfPerShare = metrics?.operatingCashFlowPerShareTTM || 0
      const ocfYield = metrics?.pocfratioTTM ? 100 / metrics.pocfratioTTM : (price > 0 ? ocfPerShare / price * 100 : 0)

      // Calculate 5-year CAGR from YoY growth rates (geometric mean = CAGR)
      const isValidGrowth = (v: number | undefined): v is number => v !== undefined && v !== null && !isNaN(v)

      const epsGrowth5Y = cagr5Y(growthArray.map((g: { epsgrowth?: number }) => g.epsgrowth).filter(isValidGrowth))
      const fcfGrowth5Y = cagr5Y(growthArray.map((g: { freeCashFlowGrowth?: number }) => g.freeCashFlowGrowth).filter(isValidGrowth))
      const ocfGrowth5Y = cagr5Y(growthArray.map((g: { operatingCashFlowGrowth?: number }) => g.operatingCashFlowGrowth).filter(isValidGrowth))

      // Median der historischen Bewertungsmultiples (max. 5 Jahre)
      const ocfMultiple5YMedian = multipleMedian(historyArray.map((m: { pocfratio?: number }) => m.pocfratio))
      const fcfMultiple5YMedian = multipleMedian(historyArray.map((m: { pfcfRatio?: number }) => m.pfcfRatio))

      // Calculate SBC impact (Stock Based Compensation as % of FCF)
      const sbcImpact = metrics?.stockBasedCompensationToRevenueTTM ? metrics.stockBasedCompensationToRevenueTTM * -100 : 0

      const data: StockData = {
        ticker,
        name: quote?.name || ticker,
        price,
        epsTTM,
        peTTM,
        epsGrowth: growthArray[0]?.epsgrowth ? growthArray[0].epsgrowth * 100 : 0,
        epsGrowth5Y,
        fcfPerShare,
        fcfYield,
        fcfGrowth5Y,
        ocfPerShare,
        ocfYield,
        ocfGrowth5Y,
        fcfMultiple5YMedian,
        ocfMultiple5YMedian,
        sbcImpact
      }

      setStockData(data)
      setSelectedTicker(ticker)

      // ✅ Fetch AI qualitative insights in the background
      loadAiInsights(ticker)

      // Pre-fill inputs with actual data
      setEpsInput(epsTTM.toFixed(2).replace('.', ','))
      setFcfInput(fcfPerShare.toFixed(2).replace('.', ','))
      setOcfInput(ocfPerShare.toFixed(2).replace('.', ','))

      // Multiples mit dem Median vorbelegen (Fallback, wenn keine belastbare Historie vorliegt)
      setTargetFcfMultiple((fcfMultiple5YMedian?.value ?? FALLBACK_FCF_MULTIPLE).toFixed(1).replace('.', ','))
      setTargetOcfMultiple((ocfMultiple5YMedian?.value ?? FALLBACK_OCF_MULTIPLE).toFixed(1).replace('.', ','))

    } catch (error) {
      console.error('Error loading stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill growth rates from historical data (echte Werte, nicht gekappt)
  const handleAutoFillGrowth = () => {
    if (!stockData) return
    if (mode === 'earnings') {
      // Setze den echten 5Y-Durchschnitt - User kann selbst anpassen
      const growth = stockData.epsGrowth5Y
      setEpsGrowthRate(growth.toFixed(1))
      // Suggest PE: Use current PE (capped range), leicht konservativ
      const currentPE = stockData.peTTM
      const suggestedPE = currentPE > 0
        ? Math.max(10, Math.min(40, Math.round(currentPE * 0.9))) // 10% Abschlag auf aktuelle PE
        : Math.max(10, Math.min(35, growth * 1.5))
      setTargetPE(suggestedPE.toFixed(0))
    } else if (mode === 'cashflow') {
      // Setze den echten 5Y FCF-Durchschnitt
      const growth = stockData.fcfGrowth5Y
      setFcfGrowthRate(growth.toFixed(1))
      // Multiple auf den Median setzen
      setTargetFcfMultiple((stockData.fcfMultiple5YMedian?.value ?? FALLBACK_FCF_MULTIPLE).toFixed(1).replace('.', ','))
    } else {
      // Setze den echten 5Y OCF-Durchschnitt
      const growth = stockData.ocfGrowth5Y
      setOcfGrowthRate(growth.toFixed(1))
      // Multiple auf den Median setzen
      setTargetOcfMultiple((stockData.ocfMultiple5YMedian?.value ?? FALLBACK_OCF_MULTIPLE).toFixed(1).replace('.', ','))
    }
  }

  // Get parsed values for calculations
  const years = projectionYears || 5
  const decay = parseDE(growthDecayRate) / 100 || 0
  const terminalGrowth = parseDE(terminalGrowthRate) / 100 || 0.03

  // Handle stock selection
  const handleSelectStock = (ticker: string) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    loadStockData(ticker)
  }

  // Calculate Earnings-based projections
  const earningsCalculation = useMemo(() => {
    if (!stockData || !epsInput || !epsGrowthRate || !targetPE || !desiredReturnEarnings) {
      return null
    }

    const eps = parseDE(epsInput)
    const growth = parseDE(epsGrowthRate) / 100
    const pe = parseDE(targetPE)
    const desiredReturn = parseDE(desiredReturnEarnings) / 100

    if (isNaN(eps) || isNaN(growth) || isNaN(pe) || isNaN(desiredReturn)) {
      return null
    }

    // Kurs = EPS × Ziel-KGV
    return buildProjection({
      base: eps,
      growth,
      multiple: pe,
      desiredReturn,
      currentPrice: stockData.price,
      years,
      decay,
      terminalGrowth,
      marginOfSafety
    })
  }, [stockData, epsInput, epsGrowthRate, targetPE, desiredReturnEarnings, years, decay, terminalGrowth, marginOfSafety])

  // Calculate Cash Flow-based projections
  const cashFlowCalculation = useMemo(() => {
    if (!stockData || !fcfInput || !fcfGrowthRate || !targetFcfMultiple || !desiredReturnCashFlow) {
      return null
    }

    const fcf = parseDE(fcfInput)
    const growth = parseDE(fcfGrowthRate) / 100
    const multiple = parseDE(targetFcfMultiple)
    const desiredReturn = parseDE(desiredReturnCashFlow) / 100

    if (isNaN(fcf) || isNaN(growth) || isNaN(multiple) || isNaN(desiredReturn) || multiple <= 0) {
      return null
    }

    // Eingabe ist das Multiple, gerechnet wird intern weiter mit der Rendite (Rendite = 1 / Multiple)
    const targetYield = 1 / multiple

    // Kurs = FCF / Ziel-Rendite
    return buildProjection({
      base: fcf,
      growth,
      multiple: 1 / targetYield,
      desiredReturn,
      currentPrice: stockData.price,
      years,
      decay,
      terminalGrowth,
      marginOfSafety
    })
  }, [stockData, fcfInput, fcfGrowthRate, targetFcfMultiple, desiredReturnCashFlow, years, decay, terminalGrowth, marginOfSafety])

  // Calculate Operating Cash Flow-based projections
  const opCashFlowCalculation = useMemo(() => {
    if (!stockData || !ocfInput || !ocfGrowthRate || !targetOcfMultiple || !desiredReturnOpCashFlow) {
      return null
    }

    const ocf = parseDE(ocfInput)
    const growth = parseDE(ocfGrowthRate) / 100
    const multiple = parseDE(targetOcfMultiple)
    const desiredReturn = parseDE(desiredReturnOpCashFlow) / 100

    if (isNaN(ocf) || isNaN(growth) || isNaN(multiple) || isNaN(desiredReturn) || multiple <= 0) {
      return null
    }

    // Eingabe ist das KCV, gerechnet wird intern weiter mit der Rendite (Rendite = 1 / KCV)
    const targetYield = 1 / multiple

    // Kurs = OCF / Ziel-Rendite (entspricht OCF × KCV)
    return buildProjection({
      base: ocf,
      growth,
      multiple: 1 / targetYield,
      desiredReturn,
      currentPrice: stockData.price,
      years,
      decay,
      terminalGrowth,
      marginOfSafety
    })
  }, [stockData, ocfInput, ocfGrowthRate, targetOcfMultiple, desiredReturnOpCashFlow, years, decay, terminalGrowth, marginOfSafety])

  // Get current calculation based on mode
  const currentCalculation = mode === 'earnings'
    ? earningsCalculation
    : mode === 'cashflow'
      ? cashFlowCalculation
      : opCashFlowCalculation
  const chartData = currentCalculation?.projections || []

  // Check if inputs are valid (show green checkmark)
  const isEpsGrowthValid = epsGrowthRate !== '' && !isNaN(parseDE(epsGrowthRate))
  const isTargetPEValid = targetPE !== '' && !isNaN(parseDE(targetPE))
  const isDesiredReturnEarningsValid = desiredReturnEarnings !== '' && !isNaN(parseDE(desiredReturnEarnings))

  const isFcfGrowthValid = fcfGrowthRate !== '' && !isNaN(parseDE(fcfGrowthRate))
  const isTargetFcfMultipleValid = targetFcfMultiple !== '' && !isNaN(parseDE(targetFcfMultiple)) && parseDE(targetFcfMultiple) > 0
  const isDesiredReturnCashFlowValid = desiredReturnCashFlow !== '' && !isNaN(parseDE(desiredReturnCashFlow))

  const isOcfGrowthValid = ocfGrowthRate !== '' && !isNaN(parseDE(ocfGrowthRate))
  const isTargetOcfMultipleValid = targetOcfMultiple !== '' && !isNaN(parseDE(targetOcfMultiple)) && parseDE(targetOcfMultiple) > 0
  const isDesiredReturnOpCashFlowValid = desiredReturnOpCashFlow !== '' && !isNaN(parseDE(desiredReturnOpCashFlow))

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Hero — konsistent zum AI-Tab */}
      {!stockData && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] text-white/60 border border-white/[0.06] rounded-full text-[12px] font-medium mb-4">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
            Manueller Modus
          </div>
          <h2 className="text-2xl font-bold text-theme-primary mb-2">
            Klassische DCF-Analyse
          </h2>
          <p className="text-theme-muted max-w-2xl mx-auto">
            Wähle eine Aktie — wir laden Finanzdaten und du passt die DCF-Annahmen
            (Wachstum, Diskont, Terminal Value) selbst an.
          </p>
        </div>
      )}

      {/* Stock Search — konsistent zum AI-Input */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Ticker eingeben (z.B. AAPL, MSFT, GOOGL)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                handleSelectStock(searchQuery.toUpperCase())
              }
            }}
            className="w-full bg-theme-card border border-theme rounded-xl pl-12 pr-32 py-4 text-theme-primary placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none text-lg"
          />
          <button
            onClick={() => searchQuery && handleSelectStock(searchQuery.toUpperCase())}
            disabled={!searchQuery}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-5 py-2.5 bg-brand hover:bg-brand/90 disabled:bg-theme-secondary disabled:text-theme-muted text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
            </svg>
            Berechnen
          </button>

          {isSearchOpen && filteredStocks.length > 0 && (
            <>
              <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card border border-theme rounded-xl shadow-xl z-50 overflow-hidden">
                {filteredStocks.map(stock => (
                  <button
                    key={stock.ticker}
                    onClick={() => handleSelectStock(stock.ticker)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-theme-hover transition-colors text-left"
                  >
                    <Logo ticker={stock.ticker} className="w-8 h-8" alt="" />
                    <div className="flex-1">
                      <div className="text-theme-primary font-medium">{stock.ticker}</div>
                      <div className="text-theme-muted text-xs">{stock.name}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
            </>
          )}
        </div>
        {!stockData && (
          <p className="text-center text-theme-muted text-sm mt-4">
            Wähle eine Aktie um die DCF-Annahmen anzupassen
          </p>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Selected Stock Header */}
      {stockData && !loading && (
        <div className="flex items-center justify-center gap-4 mb-8">
          <Logo ticker={stockData.ticker} className="w-12 h-12" alt="" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-theme-primary">{stockData.name}</h2>
            <p className="text-2xl font-bold text-theme-primary">{fmtPrice(stockData.price)}</p>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      {stockData && !loading && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex flex-wrap justify-center gap-1 bg-theme-card border border-white/[0.06] rounded-lg p-1">
            {([
              { key: 'earnings', label: 'Earnings' },
              { key: 'cashflow', label: 'Free Cash Flow' },
              { key: 'opcashflow', label: 'Operativer Cashflow' }
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setMode(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === tab.key
                  ? 'bg-theme-secondary text-theme-primary shadow-sm'
                  : 'text-theme-muted hover:text-theme-primary'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {stockData && !loading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Assumptions */}
            <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-theme-primary mb-6">Annahmen</h3>

              {/* Projection Years + Margin of Safety (shared across modes) */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Projection Years */}
                <div>
                  <label className="block text-sm text-theme-secondary mb-2">Projektionsjahre</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProjectionYears(Math.max(1, projectionYears - 1))}
                      className="w-9 h-9 flex items-center justify-center bg-theme-secondary hover:bg-theme-hover border border-theme rounded-lg text-theme-primary transition-colors text-lg font-medium"
                    >
                      −
                    </button>
                    <div className="flex-1 border border-theme rounded-lg px-3 py-2 text-center text-theme-primary bg-theme-input text-lg font-semibold">
                      {projectionYears}
                    </div>
                    <button
                      onClick={() => setProjectionYears(Math.min(30, projectionYears + 1))}
                      className="w-9 h-9 flex items-center justify-center bg-theme-secondary hover:bg-theme-hover border border-theme rounded-lg text-theme-primary transition-colors text-lg font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Margin of Safety */}
                <div>
                  <label className="block text-sm text-theme-secondary mb-2">Margin of Safety</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMarginOfSafety(Math.max(0, marginOfSafety - 5))}
                      className="w-9 h-9 flex items-center justify-center bg-theme-secondary hover:bg-theme-hover border border-theme rounded-lg text-theme-primary transition-colors text-lg font-medium"
                    >
                      −
                    </button>
                    <div className="flex-1 border border-theme rounded-lg px-3 py-2 text-center text-theme-primary bg-theme-input text-lg font-semibold">
                      {marginOfSafety}%
                    </div>
                    <button
                      onClick={() => setMarginOfSafety(Math.min(50, marginOfSafety + 5))}
                      className="w-9 h-9 flex items-center justify-center bg-theme-secondary hover:bg-theme-hover border border-theme rounded-lg text-theme-primary transition-colors text-lg font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {mode === 'earnings' && (
                <>
                  {/* Current Earnings Info */}
                  <div className="bg-theme-secondary rounded-lg p-4 mb-6">
                    <div className="text-sm text-theme-muted text-center mb-3">Aktuelle Kennzahlen</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-theme-muted">EPS (TTM)</div>
                        <div className="text-lg font-semibold text-theme-primary">{fmtPrice(stockData.epsTTM)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-theme-muted">PE (TTM)</div>
                        <div className="text-lg font-semibold text-theme-primary">{fmtNum(stockData.peTTM)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-theme-muted">EPS Wachstum (5J ⌀)</div>
                        <div className={`text-lg font-semibold ${stockData.epsGrowth5Y >= 0 ? 'text-brand' : 'text-red-600'}`}>
                          {fmtNum(stockData.epsGrowth5Y, 1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-fill Button */}
                  <button
                    onClick={handleAutoFillGrowth}
                    className="w-full mb-4 px-4 py-2 bg-theme-secondary hover:bg-theme-hover text-theme-secondary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    5-Jahres Durchschnitt übernehmen
                    <span className="text-xs text-theme-muted">({fmtNum(stockData.epsGrowth5Y, 1)}%)</span>
                  </button>

                  {/* EPS Input */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">EPS (TTM)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-r-0 border-theme rounded-l-lg text-theme-muted">$</span>
                      <input
                        type="text"
                        value={epsInput}
                        onChange={(e) => setEpsInput(e.target.value)}
                        className="flex-1 border border-theme rounded-r-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Der Gewinn pro Aktie der letzten 12 Monate.</p>
                  </div>

                  {/* EPS Growth Rate */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">EPS Wachstumsrate</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={epsGrowthRate}
                        onChange={(e) => setEpsGrowthRate(e.target.value)}
                        placeholder="Wachstumsrate eingeben"
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme text-theme-muted">
                        {isEpsGrowthValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Deine Annahme zur jährlichen EPS-Wachstumsrate in Prozent (z.B. 10 für 10% pro Jahr)</p>
                  </div>

                  {/* Target PE */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Angemessenes KGV</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={targetPE}
                        onChange={(e) => setTargetPE(e.target.value)}
                        placeholder="KGV eingeben"
                        className="flex-1 border border-theme rounded-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      {isTargetPEValid && (
                        <span className="inline-flex items-center px-3">
                          <CheckIcon className="w-5 h-5 text-brand" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Das Kurs-Gewinn-Verhältnis, das du für die Aktie als angemessen erachtest.</p>
                  </div>

                  {/* Desired Return */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Gewünschte Rendite</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={desiredReturnEarnings}
                        onChange={(e) => setDesiredReturnEarnings(e.target.value)}
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">
                        {isDesiredReturnEarningsValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Die jährliche Rendite, die du mit der Aktie erzielen möchtest. Der Rechner ermittelt den Preis, den du zahlen musst, um diese Rendite zu erreichen.</p>
                  </div>
                </>
              )}

              {mode === 'cashflow' && (
                <>
                  {/* Current Cash Flow Info */}
                  <div className="bg-theme-secondary rounded-lg p-4 mb-6">
                    <div className="text-sm text-theme-muted text-center mb-3">Aktuelle Kennzahlen</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-theme-muted">FCF/Share (TTM)</div>
                        <div className="text-lg font-semibold text-theme-primary">{fmtPrice(stockData.fcfPerShare)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-theme-muted">FCF Yield (TTM)</div>
                        <div className="text-lg font-semibold text-theme-primary">{fmtNum(stockData.fcfYield)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-theme-muted">FCF Wachstum (5J)</div>
                        <div className={`text-lg font-semibold ${stockData.fcfGrowth5Y >= 0 ? 'text-brand' : 'text-red-600'}`}>
                          {fmtNum(stockData.fcfGrowth5Y, 1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-fill Button */}
                  <button
                    onClick={handleAutoFillGrowth}
                    className="w-full mb-4 px-4 py-2 bg-theme-secondary hover:bg-theme-hover text-theme-secondary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    5-Jahres Durchschnitt übernehmen
                    <span className="text-xs text-theme-muted">({fmtNum(stockData.fcfGrowth5Y, 1)}%)</span>
                  </button>

                  {/* FCF Input */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">FCF/Share (TTM)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-r-0 border-theme rounded-l-lg text-theme-muted">$</span>
                      <input
                        type="text"
                        value={fcfInput}
                        onChange={(e) => setFcfInput(e.target.value)}
                        className="flex-1 border border-theme rounded-r-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Free Cash Flow pro Aktie der letzten 12 Monate - der Cashflow nach Investitionsausgaben.</p>
                  </div>

                  {/* FCF Growth Rate */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">FCF Wachstumsrate</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={fcfGrowthRate}
                        onChange={(e) => setFcfGrowthRate(e.target.value)}
                        placeholder="10"
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">
                        {isFcfGrowthValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Die erwartete jährliche Wachstumsrate des Free Cash Flow in Prozent.</p>
                  </div>

                  {/* FCF Multiple */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Angemessenes KCV (Kurs/Free Cash Flow)</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={targetFcfMultiple}
                        onChange={(e) => setTargetFcfMultiple(e.target.value)}
                        placeholder={String(FALLBACK_FCF_MULTIPLE)}
                        className="flex-1 border border-theme rounded-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      {isTargetFcfMultipleValid && (
                        <span className="inline-flex items-center px-3">
                          <CheckIcon className="w-5 h-5 text-brand" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">
                      {isTargetFcfMultipleValid
                        ? `Entspricht einer FCF-Rendite von ${fmtNum(100 / parseDE(targetFcfMultiple), 1)} %`
                        : 'Das Kurs/Free-Cash-Flow-Verhältnis, das du für die Aktie als angemessen erachtest.'}
                    </p>
                    {stockData.fcfMultiple5YMedian && (
                      <button
                        onClick={() => setTargetFcfMultiple(stockData.fcfMultiple5YMedian!.value.toFixed(1).replace('.', ','))}
                        className="mt-2 text-xs text-brand hover:underline"
                      >
                        {stockData.fcfMultiple5YMedian.years === 5
                          ? '5-Jahres-Median'
                          : `Median (${stockData.fcfMultiple5YMedian.years} J.)`}: {fmtNum(stockData.fcfMultiple5YMedian.value, 1)} — übernehmen
                      </button>
                    )}
                  </div>

                  {/* Desired Return */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Gewünschte Rendite</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={desiredReturnCashFlow}
                        onChange={(e) => setDesiredReturnCashFlow(e.target.value)}
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">
                        {isDesiredReturnCashFlowValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Die jährliche Rendite, die du mit der Aktie erzielen möchtest. Der Rechner ermittelt den Preis, den du zahlen musst, um diese Rendite zu erreichen.</p>
                  </div>
                </>
              )}

              {mode === 'opcashflow' && (
                <>
                  {/* Current Operating Cash Flow Info */}
                  <div className="bg-theme-secondary rounded-lg p-4 mb-6">
                    <div className="text-sm text-theme-muted text-center mb-3">Aktuelle Kennzahlen</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-theme-muted">OCF/Share (TTM)</div>
                        <div className="text-lg font-semibold text-theme-primary">{fmtPrice(stockData.ocfPerShare)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-theme-muted">OCF Yield (TTM)</div>
                        <div className="text-lg font-semibold text-theme-primary">{fmtNum(stockData.ocfYield)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-theme-muted">OCF Wachstum (5J)</div>
                        <div className={`text-lg font-semibold ${stockData.ocfGrowth5Y >= 0 ? 'text-brand' : 'text-red-600'}`}>
                          {fmtNum(stockData.ocfGrowth5Y, 1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-fill Button */}
                  <button
                    onClick={handleAutoFillGrowth}
                    className="w-full mb-4 px-4 py-2 bg-theme-secondary hover:bg-theme-hover text-theme-secondary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    5-Jahres Durchschnitt übernehmen
                    <span className="text-xs text-theme-muted">({fmtNum(stockData.ocfGrowth5Y, 1)}%)</span>
                  </button>

                  {/* OCF Input */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">OCF/Share (TTM)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-r-0 border-theme rounded-l-lg text-theme-muted">$</span>
                      <input
                        type="text"
                        value={ocfInput}
                        onChange={(e) => setOcfInput(e.target.value)}
                        className="flex-1 border border-theme rounded-r-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Operativer Cashflow pro Aktie der letzten 12 Monate - der Cashflow vor Investitionsausgaben.</p>
                  </div>

                  {/* OCF Growth Rate */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">OCF Wachstumsrate</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={ocfGrowthRate}
                        onChange={(e) => setOcfGrowthRate(e.target.value)}
                        placeholder="10"
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">
                        {isOcfGrowthValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Die erwartete jährliche Wachstumsrate des operativen Cashflows in Prozent.</p>
                  </div>

                  {/* OCF Multiple (KCV) */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Angemessenes KCV (Kurs/Operativer Cashflow)</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={targetOcfMultiple}
                        onChange={(e) => setTargetOcfMultiple(e.target.value)}
                        placeholder={String(FALLBACK_OCF_MULTIPLE)}
                        className="flex-1 border border-theme rounded-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      {isTargetOcfMultipleValid && (
                        <span className="inline-flex items-center px-3">
                          <CheckIcon className="w-5 h-5 text-brand" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">
                      {isTargetOcfMultipleValid
                        ? `Entspricht einer OCF-Rendite von ${fmtNum(100 / parseDE(targetOcfMultiple), 1)} %`
                        : 'Das Kurs/Cashflow-Verhältnis, das du für die Aktie als angemessen erachtest.'}
                    </p>
                    {stockData.ocfMultiple5YMedian && (
                      <button
                        onClick={() => setTargetOcfMultiple(stockData.ocfMultiple5YMedian!.value.toFixed(1).replace('.', ','))}
                        className="mt-2 text-xs text-brand hover:underline"
                      >
                        {stockData.ocfMultiple5YMedian.years === 5
                          ? '5-Jahres-Median'
                          : `Median (${stockData.ocfMultiple5YMedian.years} J.)`}: {fmtNum(stockData.ocfMultiple5YMedian.value, 1)} — übernehmen
                      </button>
                    )}
                  </div>

                  {/* Desired Return */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Gewünschte Rendite</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={desiredReturnOpCashFlow}
                        onChange={(e) => setDesiredReturnOpCashFlow(e.target.value)}
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">
                        {isDesiredReturnOpCashFlowValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Die jährliche Rendite, die du mit der Aktie erzielen möchtest. Der Rechner ermittelt den Preis, den du zahlen musst, um diese Rendite zu erreichen.</p>
                  </div>
                </>
              )}

              {/* Advanced Settings */}
              <div className="border-t border-white/[0.04] pt-4 mt-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-sm text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  <span className="font-medium">Erweiterte Einstellungen</span>
                  {showAdvanced ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    {/* Growth Decay Rate */}
                    <div>
                      <label className="block text-sm text-theme-secondary mb-2">Growth Decay Rate</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={growthDecayRate}
                          onChange={(e) => setGrowthDecayRate(e.target.value)}
                          placeholder="0"
                          className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                        <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">%</span>
                      </div>
                      <p className="text-xs text-theme-muted mt-1">Reduziert das Wachstum jährlich um diesen Prozentsatz (0 = kein Decay)</p>
                    </div>

                    {/* Terminal Growth Rate */}
                    <div>
                      <label className="block text-sm text-theme-secondary mb-2">Terminal Growth Rate</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={terminalGrowthRate}
                          onChange={(e) => setTerminalGrowthRate(e.target.value)}
                          placeholder="3"
                          className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                        <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">%</span>
                      </div>
                      <p className="text-xs text-theme-muted mt-1">Minimales langfristiges Wachstum (typisch: 2-4%)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Assumption Check Button */}
              <div className="mt-8 border-t border-white/[0.04] pt-6">
                <button
                  onClick={handleValidationCheck}
                  disabled={isValidating || !currentCalculation}
                  className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${isValidating
                    ? 'bg-theme-secondary text-theme-muted cursor-not-allowed'
                    : 'bg-brand text-white hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98]'
                    }`}
                >
                  <div className={`absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300`} />
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analyst prüft Zahlen...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      <span>Annahmen durch AI prüfen</span>
                    </>
                  )}
                </button>

                {/* Validation Result Box */}
                {validationResult && (
                  <div className="mt-6 bg-brand/5 border border-brand/20 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-brand/10 flex items-center justify-center">
                        <SparklesIcon className="w-3 h-3 text-brand" />
                      </div>
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wider">AI Sanity Check</span>
                    </div>
                    <div className="prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="text-xs text-theme-secondary leading-relaxed mb-3 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="text-theme-primary font-bold">{children}</strong>,
                          a: ({ children, href }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-green-400 underline decoration-brand/30 transition-colors">
                              {children}
                            </a>
                          ),
                          li: ({ children }) => <li className="text-xs text-theme-secondary mb-1">{children}</li>
                        }}
                      >
                        {validationResult}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-4 pt-3 border-t border-brand/10 flex items-center justify-between text-[9px] text-theme-muted font-medium italic">
                      <span>Basierend auf aktuellen Marktberichten</span>
                      <span className="text-brand/60 uppercase tracking-tighter">Pro Analyst Mode</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: N-Year Projection */}
            <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-theme-primary mb-6">{years}-Jahres Projektion</h3>

              {currentCalculation ? (
                <>
                  {/* Margin of Safety Gauge */}
                  <div className="flex justify-center mb-6">
                    <MarginOfSafetyGauge
                      currentPrice={stockData.price}
                      fairValue={currentCalculation.entryPrice}
                      size="md"
                    />
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 border border-white/[0.04] rounded-lg">
                      <div className="text-xs text-theme-muted mb-1">Erwartete CAGR</div>
                      <div className={`text-lg font-semibold ${currentCalculation.cagr >= 0 ? 'text-brand' : 'text-red-600'}`}>
                        {fmtNum(currentCalculation.cagr, 1)}%
                      </div>
                    </div>
                    <div className="text-center p-3 border border-white/[0.04] rounded-lg">
                      <div className="text-xs text-theme-muted mb-1">Zielkurs ({years}J)</div>
                      <div className="text-lg font-semibold text-theme-primary">
                        {fmtPrice(currentCalculation.futurePrice)}
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                          axisLine={{ stroke: 'var(--color-divider)' }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                          axisLine={{ stroke: 'var(--color-divider)' }}
                          tickFormatter={(value) => `$${fmtNum(value, 0)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number) => [`$${fmtNum(value)}`, 'Kurs']}
                        />
                        {/* Aktueller Kurs als Referenzlinie */}
                        <ReferenceLine
                          y={stockData.price}
                          stroke="var(--color-text-muted)"
                          strokeDasharray="6 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Aktuell: $${fmtNum(stockData.price, 0)}`,
                            position: 'right',
                            fill: 'var(--color-text-muted)',
                            fontSize: 11,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={currentCalculation.cagr >= 0 ? '#22c55e' : '#ef4444'}
                          strokeWidth={2}
                          dot={{ fill: currentCalculation.cagr >= 0 ? '#22c55e' : '#ef4444', strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Powered by */}
                  <div className="flex items-center justify-end gap-2 mt-4 text-sm text-theme-muted">
                    <span>Powered by</span>
                    <span className="font-semibold text-brand flex items-center gap-1">
                      <span className="flex items-end gap-0.5">
                        <div className="w-1 h-2 bg-brand rounded-sm"></div>
                        <div className="w-1 h-2.5 bg-brand rounded-sm"></div>
                        <div className="w-1 h-3 bg-brand rounded-sm"></div>
                      </span>
                      FINCLUE
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-72 text-center">
                  <div className="text-theme-muted mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-theme-secondary mb-2">Keine Daten</h4>
                  <p className="text-sm text-theme-muted max-w-xs">
                    Fülle die Annahmen auf der linken Seite aus, um eine Projektion zu erstellen. Der Chart aktualisiert sich automatisch.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Valuation Insights (QUALITATIVE OVERLAY) */}
          <div className="mt-8 bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="px-6 py-4 border-b border-white/[0.04] bg-brand/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                  <SparklesIcon className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-primary uppercase tracking-tight">AI Valuation Insights</h3>
                  <p className="text-[10px] text-theme-muted uppercase tracking-widest font-medium">Qualitative Context (RAG Augmented)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-theme-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5 uppercase tracking-widest font-bold">Premium</span>
              </div>
            </div>

            <div className="p-6">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                    <LightBulbIcon className="w-5 h-5 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-theme-primary">Analysiere qualitativen Kontext...</p>
                    <p className="text-[11px] text-theme-muted mt-1 uppercase tracking-wider">Earnings Calls & Geschäftsberichte werden abgeglichen</p>
                  </div>
                </div>
              ) : aiInsights ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="text-sm text-theme-secondary leading-relaxed mb-4 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-theme-primary font-bold">{children}</strong>,
                      ul: ({ children }) => <ul className="space-y-2 mb-4 list-none p-0">{children}</ul>,
                      li: ({ children }) => (
                        <li className="flex gap-2 text-sm text-theme-secondary">
                          <div className="w-1.5 h-1.5 bg-brand/30 rounded-full mt-1.5 flex-shrink-0" />
                          <span>{children}</span>
                        </li>
                      )
                    }}
                  >
                    {aiInsights}
                  </ReactMarkdown>
                </div>
              ) : aiError ? (
                <div className="py-8 text-center">
                  {aiError === 'Premium subscription required' ? (
                    <p className="text-sm text-theme-muted">Für AI Valuation Insights wird ein Premium-Abonnement benötigt.</p>
                  ) : (
                    <>
                      <p className="text-sm text-red-400">Analyse konnte nicht geladen werden.</p>
                      <button
                        onClick={() => stockData && loadAiInsights(stockData.ticker)}
                        className="mt-4 px-4 py-2 bg-theme-secondary text-theme-primary rounded-lg text-xs font-bold"
                      >
                        Erneut versuchen
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-theme-muted text-sm italic">
                  Lade Daten für {stockData.ticker} zur Evaluierung...
                </div>
              )}
            </div>

            {aiInsights && (
              <div className="px-6 py-3 border-t border-white/[0.04] bg-theme-secondary/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-theme-muted font-bold opacity-60">
                  <CheckIcon className="w-3 h-3 text-brand" />
                  UNTERSTÜTZT WACHSTUMSRATEN & MULTIPLES
                </div>
                <div className="text-[10px] text-theme-muted opacity-30">
                  Valuation Engine v1.4
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Info Box */}
      {stockData && !loading && (
        <div className="mt-8 p-4 border border-white/[0.04] rounded-xl">
          <div className="flex gap-3">
            <InformationCircleIcon className="w-5 h-5 text-theme-muted flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-theme-secondary font-medium text-sm">Hinweis zur Berechnung</p>
              <p className="text-theme-muted text-sm mt-1">
                {mode === 'earnings'
                  ? 'Die Earnings-Methode berechnet den fairen Wert basierend auf projiziertem EPS und einem Ziel-KGV. Der Fair Value zeigt, welchen Preis du zahlen solltest, um deine gewünschte Rendite zu erzielen.'
                  : mode === 'cashflow'
                    ? 'Die Free Cash Flow-Methode berechnet den fairen Wert basierend auf projiziertem Free Cash Flow und einem Ziel-Multiple (Kurs/Free Cash Flow). Diese Methode ist besonders nützlich für Unternehmen mit stabilem Cash Flow.'
                    : 'Die Methode über den operativen Cashflow rechnet vor Investitionsausgaben (Capex) und eignet sich für Unternehmen, deren FCF durch hohe Investitionen verzerrt ist. Weil Capex hier nicht abgezogen wird, sollte das KCV deutlich niedriger angesetzt werden als das Kurs/Free-Cash-Flow-Multiple.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
