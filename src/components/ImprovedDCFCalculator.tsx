'use client'

import React, { useState, useMemo } from 'react'
import {
  CheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import MarginOfSafetyGauge from '@/components/MarginOfSafetyGauge'

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

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [projectionYears, setProjectionYears] = useState<string>('5')
  const [growthDecayRate, setGrowthDecayRate] = useState<string>('0')
  const [terminalGrowthRate, setTerminalGrowthRate] = useState<string>('3')

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

      // Pre-fill inputs with actual data
      setEpsInput(epsTTM.toFixed(2))
      setFcfInput(fcfPerShare.toFixed(2))

    } catch (error) {
      console.error('Error loading stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill growth rates from historical data
  const handleAutoFillGrowth = () => {
    if (!stockData) return
    if (mode === 'earnings') {
      // Cap between 5% and 20% like GuruFocus
      const cappedGrowth = Math.max(5, Math.min(20, stockData.epsGrowth5Y))
      setEpsGrowthRate(cappedGrowth.toFixed(1))
      // Also suggest a reasonable PE based on growth (PEG = 1 rule of thumb)
      const suggestedPE = Math.max(10, Math.min(35, cappedGrowth * 1.5))
      setTargetPE(suggestedPE.toFixed(0))
    } else {
      const cappedGrowth = Math.max(5, Math.min(20, stockData.fcfGrowth5Y))
      setFcfGrowthRate(cappedGrowth.toFixed(1))
      // Suggest FCF yield based on typical ranges (3-8%)
      setTargetFcfYield('4')
    }
  }

  // Get parsed values for calculations
  const years = parseInt(projectionYears) || 5
  const decay = parseFloat(growthDecayRate) / 100 || 0
  const terminalGrowth = parseFloat(terminalGrowthRate) / 100 || 0.03

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

    const eps = parseFloat(epsInput)
    let growth = parseFloat(epsGrowthRate) / 100
    const pe = parseFloat(targetPE)
    const desiredReturn = parseFloat(desiredReturnEarnings) / 100
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
    const entryPrice = futurePrice / Math.pow(1 + desiredReturn, years)

    // Upside/downside
    const upside = ((entryPrice - currentPrice) / currentPrice) * 100

    return {
      projections,
      futureEps,
      futurePrice,
      cagr: cagr * 100,
      entryPrice,
      upside,
      fairValue: entryPrice
    }
  }, [stockData, epsInput, epsGrowthRate, targetPE, desiredReturnEarnings, years, decay, terminalGrowth])

  // Calculate Cash Flow-based projections
  const cashFlowCalculation = useMemo(() => {
    if (!stockData || !fcfInput || !fcfGrowthRate || !targetFcfYield || !desiredReturnCashFlow) {
      return null
    }

    const fcf = parseFloat(fcfInput)
    let growth = parseFloat(fcfGrowthRate) / 100
    const targetYield = parseFloat(targetFcfYield) / 100
    const desiredReturn = parseFloat(desiredReturnCashFlow) / 100
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
    const entryPrice = futurePrice / Math.pow(1 + desiredReturn, years)

    // Upside/downside
    const upside = ((entryPrice - currentPrice) / currentPrice) * 100

    return {
      projections,
      futureFcf,
      futurePrice,
      cagr: cagr * 100,
      entryPrice,
      upside,
      fairValue: entryPrice
    }
  }, [stockData, fcfInput, fcfGrowthRate, targetFcfYield, desiredReturnCashFlow, years, decay, terminalGrowth])

  // Get current calculation based on mode
  const currentCalculation = mode === 'earnings' ? earningsCalculation : cashFlowCalculation
  const chartData = currentCalculation?.projections || []

  // Check if inputs are valid (show green checkmark)
  const isEpsGrowthValid = epsGrowthRate !== '' && !isNaN(parseFloat(epsGrowthRate))
  const isTargetPEValid = targetPE !== '' && !isNaN(parseFloat(targetPE))
  const isDesiredReturnEarningsValid = desiredReturnEarnings !== '' && !isNaN(parseFloat(desiredReturnEarnings))

  const isFcfGrowthValid = fcfGrowthRate !== '' && !isNaN(parseFloat(fcfGrowthRate))
  const isTargetYieldValid = targetFcfYield !== '' && !isNaN(parseFloat(targetFcfYield))
  const isDesiredReturnCashFlowValid = desiredReturnCashFlow !== '' && !isNaN(parseFloat(desiredReturnCashFlow))

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
            className="w-full bg-theme-card border border-theme rounded-lg px-4 py-3 text-theme-primary placeholder-theme-muted focus:border-green-500 focus:ring-1 focus:ring-brand focus:outline-none"
          />
          <button
            onClick={() => searchQuery && handleSelectStock(searchQuery.toUpperCase())}
            className="absolute right-2 top-2 px-4 py-1.5 bg-theme-secondary hover:bg-theme-hover text-theme-secondary rounded-md text-sm font-medium transition-colors"
          >
            Suchen
          </button>

          {isSearchOpen && filteredStocks.length > 0 && (
            <>
              <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card border border-theme rounded-lg shadow-xl z-50 overflow-hidden">
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
            <p className="text-2xl font-bold text-theme-primary">${stockData.price.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      {stockData && !loading && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-theme-secondary border border-theme rounded-lg p-1">
            <button
              onClick={() => setMode('earnings')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === 'earnings'
                  ? 'bg-theme-card text-theme-primary shadow-sm border border-theme'
                  : 'text-theme-muted hover:text-theme-primary'
                }`}
            >
              Earnings
            </button>
            <button
              onClick={() => setMode('cashflow')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === 'cashflow'
                  ? 'bg-theme-card text-theme-primary shadow-sm border border-theme'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left: Assumptions */}
          <div className="bg-theme-card border border-theme rounded-xl p-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-6">Annahmen</h3>

            {mode === 'earnings' ? (
              <>
                {/* Current Earnings Info */}
                <div className="bg-theme-secondary rounded-lg p-4 mb-6">
                  <div className="text-sm text-theme-muted text-center mb-3">Aktuelle Kennzahlen</div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-theme-muted">EPS (TTM)</div>
                      <div className="text-lg font-semibold text-theme-primary">${stockData.epsTTM.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-theme-muted">PE (TTM)</div>
                      <div className="text-lg font-semibold text-theme-primary">{stockData.peTTM.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-theme-muted">EPS Wachstum</div>
                      <div className={`text-lg font-semibold ${stockData.epsGrowth >= 0 ? 'text-brand' : 'text-red-600'}`}>
                        {stockData.epsGrowth.toFixed(1)}%
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
                  <span className="text-xs text-theme-muted">({stockData.epsGrowth5Y.toFixed(1)}%)</span>
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
                      <div className="text-lg font-semibold text-theme-primary">${stockData.fcfPerShare.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-theme-muted">FCF Yield (TTM)</div>
                      <div className="text-lg font-semibold text-theme-primary">{stockData.fcfYield.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-theme-muted">FCF Wachstum (5J)</div>
                      <div className={`text-lg font-semibold ${stockData.fcfGrowth5Y >= 0 ? 'text-brand' : 'text-red-600'}`}>
                        {stockData.fcfGrowth5Y.toFixed(1)}%
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
                  <span className="text-xs text-theme-muted">({stockData.fcfGrowth5Y.toFixed(1)}%)</span>
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
            <div className="border-t border-theme pt-4 mt-4">
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
                  {/* Projection Years */}
                  <div>
                    <label className="block text-sm text-theme-secondary mb-2">Projektionsjahre</label>
                    <input
                      type="text"
                      value={projectionYears}
                      onChange={(e) => setProjectionYears(e.target.value)}
                      className="w-full border border-theme rounded-lg px-4 py-2.5 text-theme-primary bg-theme-input focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                    />
                    <p className="text-xs text-theme-muted mt-1">Anzahl der Jahre für die Projektion (Standard: 5)</p>
                  </div>

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
          </div>

          {/* Right: N-Year Projection */}
          <div className="bg-theme-card border border-theme rounded-xl p-6">
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
                  <div className="text-center p-3 border border-theme rounded-lg">
                    <div className="text-xs text-theme-muted mb-1">Erwartete CAGR</div>
                    <div className={`text-lg font-semibold ${currentCalculation.cagr >= 0 ? 'text-brand' : 'text-red-600'}`}>
                      {currentCalculation.cagr.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 border border-theme rounded-lg">
                    <div className="text-xs text-theme-muted mb-1">Zielkurs ({years}J)</div>
                    <div className="text-lg font-semibold text-theme-primary">
                      ${currentCalculation.futurePrice.toFixed(2)}
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
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Kurs']}
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
                  Fülle die Annahmen auf der linken Seite aus, um eine 5-Jahres Projektion zu erstellen. Der Chart aktualisiert sich automatisch.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      {stockData && !loading && (
        <div className="mt-8 p-4 border border-theme rounded-xl">
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
