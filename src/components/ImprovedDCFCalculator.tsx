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
  sbcImpact: number
}

type CalculatorMode = 'earnings' | 'cashflow'

// Helper: Parse DE-Format input (Komma → Punkt) für parseFloat
const parseDE = (val: string) => parseFloat(val.replace(',', '.'))

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
  const [targetFcfYield, setTargetFcfYield] = useState<string>('')
  const [desiredReturnCashFlow, setDesiredReturnCashFlow] = useState<string>('10')

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

      const growth = mode === 'earnings' ? epsGrowthRate : fcfGrowthRate
      const multiple = mode === 'earnings' ? targetPE : targetFcfYield

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
            projectionYears: projectionYears
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
    ? stocks.filter(s =>
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8)
    : []

  // Load stock data from API
  const loadStockData = async (ticker: string) => {
    setLoading(true)
    try {
      // Fetch key metrics, quote and growth data
      const [quoteRes, metricsRes, growthRes] = await Promise.all([
        fetch(`/api/fmp/quote?symbol=${ticker}`),
        fetch(`/api/fmp/key-metrics-ttm?symbol=${ticker}`),
        fetch(`/api/fmp/financial-growth?symbol=${ticker}&limit=5`)
      ])

      const quoteData = await quoteRes.json()
      const metricsData = await metricsRes.json()
      const growthData = await growthRes.json()

      const quote = Array.isArray(quoteData) ? quoteData[0] : quoteData
      const metrics = Array.isArray(metricsData) ? metricsData[0] : metricsData
      const growthArray = Array.isArray(growthData) ? growthData : []

      const price = quote?.price || 0
      const epsTTM = metrics?.netIncomePerShareTTM || quote?.eps || 0
      const peTTM = metrics?.peRatioTTM || quote?.pe || (price / epsTTM) || 0
      const fcfPerShare = metrics?.freeCashFlowPerShareTTM || 0
      const fcfYield = metrics?.freeCashFlowYieldTTM ? metrics.freeCashFlowYieldTTM * 100 : (fcfPerShare / price * 100) || 0

      // Calculate 5-year average growth rates
      const epsGrowthValues = growthArray.map((g: { epsgrowth?: number }) => g.epsgrowth).filter((v: number | undefined): v is number => v !== undefined && v !== null && !isNaN(v))
      const epsGrowth5Y = epsGrowthValues.length > 0
        ? (epsGrowthValues.reduce((a: number, b: number) => a + b, 0) / epsGrowthValues.length) * 100
        : 0

      const fcfGrowthValues = growthArray.map((g: { freeCashFlowGrowth?: number }) => g.freeCashFlowGrowth).filter((v: number | undefined): v is number => v !== undefined && v !== null && !isNaN(v))
      const fcfGrowth5Y = fcfGrowthValues.length > 0
        ? (fcfGrowthValues.reduce((a: number, b: number) => a + b, 0) / fcfGrowthValues.length) * 100
        : 0

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
        sbcImpact
      }

      setStockData(data)
      setSelectedTicker(ticker)

      // ✅ Fetch AI qualitative insights in the background
      loadAiInsights(ticker)

      // Pre-fill inputs with actual data
      setEpsInput(epsTTM.toFixed(2).replace('.', ','))
      setFcfInput(fcfPerShare.toFixed(2).replace('.', ','))

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
    } else {
      // Setze den echten 5Y FCF-Durchschnitt
      const growth = stockData.fcfGrowth5Y
      setFcfGrowthRate(growth.toFixed(1))
      // Suggest FCF yield based on current yield (leicht höher = konservativer)
      const currentYield = stockData.fcfYield
      const suggestedYield = currentYield > 0
        ? Math.max(2, Math.min(8, Math.round(currentYield * 1.1 * 10) / 10)) // 10% Aufschlag
        : 4
      setTargetFcfYield(suggestedYield.toFixed(1))
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
    let growth = parseDE(epsGrowthRate) / 100
    const pe = parseDE(targetPE)
    const desiredReturn = parseDE(desiredReturnEarnings) / 100
    const currentPrice = stockData.price

    if (isNaN(eps) || isNaN(growth) || isNaN(pe) || isNaN(desiredReturn)) {
      return null
    }

    // Project EPS for N years with decay
    const projections = []
    let projectedEps = eps
    const currentYear = new Date().getFullYear()

    for (let year = 0; year <= years; year++) {
      const yearLabel = `${currentYear + year}`
      const futurePrice = projectedEps * pe

      projections.push({
        year: yearLabel,
        eps: projectedEps,
        price: futurePrice
      })

      // Apply growth with decay
      projectedEps = projectedEps * (1 + growth)
      growth = Math.max(terminalGrowth, growth * (1 - decay))
    }

    // Final values
    const futureEps = projections[years].eps
    const futurePrice = projections[years].price

    // CAGR from today's price
    const cagr = Math.pow(futurePrice / currentPrice, 1 / years) - 1

    // Entry price for desired return
    const entryPriceRaw = futurePrice / Math.pow(1 + desiredReturn, years)

    // Apply Margin of Safety
    const entryPrice = entryPriceRaw * (1 - marginOfSafety / 100)

    // Upside/downside
    const upside = ((entryPrice - currentPrice) / currentPrice) * 100

    return {
      projections,
      futureEps,
      futurePrice,
      cagr: cagr * 100,
      entryPrice,
      entryPriceRaw,
      upside,
      fairValue: entryPrice
    }
  }, [stockData, epsInput, epsGrowthRate, targetPE, desiredReturnEarnings, years, decay, terminalGrowth, marginOfSafety])

  // Calculate Cash Flow-based projections
  const cashFlowCalculation = useMemo(() => {
    if (!stockData || !fcfInput || !fcfGrowthRate || !targetFcfYield || !desiredReturnCashFlow) {
      return null
    }

    const fcf = parseDE(fcfInput)
    let growth = parseDE(fcfGrowthRate) / 100
    const targetYield = parseDE(targetFcfYield) / 100
    const desiredReturn = parseDE(desiredReturnCashFlow) / 100
    const currentPrice = stockData.price

    if (isNaN(fcf) || isNaN(growth) || isNaN(targetYield) || isNaN(desiredReturn) || targetYield === 0) {
      return null
    }

    // Project FCF for N years with decay
    const projections = []
    let projectedFcf = fcf
    const currentYear = new Date().getFullYear()

    for (let year = 0; year <= years; year++) {
      const yearLabel = `${currentYear + year}`
      const fairPrice = projectedFcf / targetYield

      projections.push({
        year: yearLabel,
        fcf: projectedFcf,
        price: fairPrice
      })

      // Apply growth with decay
      projectedFcf = projectedFcf * (1 + growth)
      growth = Math.max(terminalGrowth, growth * (1 - decay))
    }

    // Final values
    const futureFcf = projections[years].fcf
    const futurePrice = projections[years].price

    // CAGR from today's price
    const cagr = Math.pow(futurePrice / currentPrice, 1 / years) - 1

    // Entry price for desired return
    const entryPriceRaw = futurePrice / Math.pow(1 + desiredReturn, years)

    // Apply Margin of Safety
    const entryPrice = entryPriceRaw * (1 - marginOfSafety / 100)

    // Upside/downside
    const upside = ((entryPrice - currentPrice) / currentPrice) * 100

    return {
      projections,
      futureFcf,
      futurePrice,
      cagr: cagr * 100,
      entryPrice,
      entryPriceRaw,
      upside,
      fairValue: entryPrice
    }
  }, [stockData, fcfInput, fcfGrowthRate, targetFcfYield, desiredReturnCashFlow, years, decay, terminalGrowth, marginOfSafety])

  // Get current calculation based on mode
  const currentCalculation = mode === 'earnings' ? earningsCalculation : cashFlowCalculation
  const chartData = currentCalculation?.projections || []

  // Check if inputs are valid (show green checkmark)
  const isEpsGrowthValid = epsGrowthRate !== '' && !isNaN(parseDE(epsGrowthRate))
  const isTargetPEValid = targetPE !== '' && !isNaN(parseDE(targetPE))
  const isDesiredReturnEarningsValid = desiredReturnEarnings !== '' && !isNaN(parseDE(desiredReturnEarnings))

  const isFcfGrowthValid = fcfGrowthRate !== '' && !isNaN(parseDE(fcfGrowthRate))
  const isTargetYieldValid = targetFcfYield !== '' && !isNaN(parseDE(targetFcfYield))
  const isDesiredReturnCashFlowValid = desiredReturnCashFlow !== '' && !isNaN(parseDE(desiredReturnCashFlow))

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-theme-primary mb-2">DCF Calculator</h1>
      <p className="text-theme-muted mb-8">Berechne den fairen Wert einer Aktie basierend auf Earnings oder Cash Flow</p>

      {/* Stock Search */}
      <div className="max-w-md mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Ticker eingeben (z.B. AAPL, MSFT, GOOGL)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-theme-card border border-white/[0.04] rounded-lg px-4 py-3 text-theme-primary placeholder-theme-muted focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
          />
          <button
            onClick={() => searchQuery && handleSelectStock(searchQuery.toUpperCase())}
            className="absolute right-2 top-2 px-4 py-1.5 bg-theme-secondary hover:bg-theme-hover text-theme-secondary rounded-md text-sm font-medium transition-colors"
          >
            Suchen
          </button>

          {isSearchOpen && filteredStocks.length > 0 && (
            <>
              <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card border border-white/[0.04] rounded-lg shadow-xl z-50 overflow-hidden">
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
          <div className="inline-flex bg-theme-card border border-white/[0.06] rounded-lg p-1">
            <button
              onClick={() => setMode('earnings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'earnings'
                ? 'bg-theme-secondary text-theme-primary shadow-sm'
                : 'text-theme-muted hover:text-theme-primary'
                }`}
            >
              Earnings
            </button>
            <button
              onClick={() => setMode('cashflow')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'cashflow'
                ? 'bg-theme-secondary text-theme-primary shadow-sm'
                : 'text-theme-muted hover:text-theme-primary'
                }`}
            >
              Cash Flow
            </button>
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

              {mode === 'earnings' ? (
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
              ) : (
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

                  {/* FCF Yield */}
                  <div className="mb-5">
                    <label className="block text-sm text-theme-secondary mb-2">Ziel FCF-Rendite</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={targetFcfYield}
                        onChange={(e) => setTargetFcfYield(e.target.value)}
                        placeholder="4"
                        className="flex-1 border border-theme rounded-l-lg px-4 py-2.5 text-theme-primary bg-theme-input placeholder-theme-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-theme-secondary border border-l-0 border-theme rounded-r-lg text-theme-muted">
                        {isTargetYieldValid && <CheckIcon className="w-5 h-5 text-brand mr-1" />}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-1.5">Die FCF Rendite, die du für fair erachtest (typisch: 3-6%).</p>
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
                  : 'Die Cash Flow-Methode berechnet den fairen Wert basierend auf projiziertem Free Cash Flow und einer Ziel-FCF-Yield. Diese Methode ist besonders nützlich für Unternehmen mit stabilem Cash Flow.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
