// src/components/DCFCalculator.tsx - VOLLSTÄNDIGE VERSION MIT CUSTOM DCF
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  CalculatorIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface DCFParams {
  revenueGrowthPct: number
  ebitdaPct: number
  operatingCashFlowPct: number
  capitalExpenditurePct: number
  taxRate: number
  longTermGrowthRate: number
  costOfEquity: number
  beta: number
  riskFreeRate: number
}

interface DCFResult {
  year: string
  revenue: number
  ebitda: number
  ebit: number
  ufcf: number
  wacc: number
  terminalValue: number
  enterpriseValue: number
  equityValue: number
  equityValuePerShare: number
  price: number
  sumPvUfcf: number
  netDebt: number
}

export default function DCFCalculator({ ticker }: { ticker: string }) {
  const [dcfResult, setDcfResult] = useState<DCFResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'base' | 'optimistic'>('base')
  
  // Default Parameters (will be updated from API)
  const [params, setParams] = useState<DCFParams>({
    revenueGrowthPct: 0.10,
    ebitdaPct: 0.30,
    operatingCashFlowPct: 0.28,
    capitalExpenditurePct: 0.03,
    taxRate: 0.21,
    longTermGrowthRate: 0.025,
    costOfEquity: 0.095,
    beta: 1.2,
    riskFreeRate: 0.045
  })

  // Scenario Presets
  const scenarios = {
    conservative: {
      revenueGrowthPct: 0.05,
      ebitdaPct: 0.25,
      longTermGrowthRate: 0.02,
      costOfEquity: 0.11
    },
    base: {
      revenueGrowthPct: 0.10,
      ebitdaPct: 0.30,
      longTermGrowthRate: 0.025,
      costOfEquity: 0.095
    },
    optimistic: {
      revenueGrowthPct: 0.15,
      ebitdaPct: 0.35,
      longTermGrowthRate: 0.03,
      costOfEquity: 0.085
    }
  }

  // Calculate DCF with current params
  const calculateDCF = useCallback(async () => {
    setCalculating(true)
    try {
      const queryParams = new URLSearchParams({
        symbol: ticker,
        ...Object.entries(params).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: value.toString()
        }), {})
      })

      const response = await fetch(`/api/fmp/dcf-custom?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to calculate DCF')
      }
      
      const data = await response.json()
      if (data && data.length > 0) {
        setDcfResult(data[0])
      }
    } catch (error) {
      console.error('DCF calculation error:', error)
    } finally {
      setCalculating(false)
    }
  }, [ticker, params])

  // Load initial data
  useEffect(() => {
    calculateDCF()
  }, [])

  // Apply scenario
  const applyScenario = (scenario: keyof typeof scenarios) => {
    setActiveScenario(scenario)
    setParams(prev => ({
      ...prev,
      ...scenarios[scenario]
    }))
  }

  // Update single parameter
  const updateParam = (key: keyof DCFParams, value: number) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Format functions
  const formatBillion = (value: number) => {
    return `$${(value / 1e9).toFixed(1)}B`
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  // Calculate upside/downside
  const upside = dcfResult 
    ? ((dcfResult.equityValuePerShare - dcfResult.price) / dcfResult.price) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Header Section - Clean like Dividends */}
      <div className="bg-[#0a0a0a] rounded-xl border border-gray-800/50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                DCF Calculator
              </h2>
              <p className="text-sm text-gray-400">
                Interaktive Discounted Cash Flow Analyse für {ticker}
              </p>
            </div>
            <button
              onClick={calculateDCF}
              disabled={calculating}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Berechne...' : 'Neu berechnen'}
            </button>
          </div>

          {/* Main Results */}
          {dcfResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fair Value */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ChartBarIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-500">FAIRER WERT</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  ${dcfResult.equityValuePerShare.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  pro Aktie
                </div>
              </div>

              {/* Current Price */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">AKTUELLER KURS</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  ${dcfResult.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Marktpreis
                </div>
              </div>

              {/* Upside/Downside */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {upside > 0 ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-gray-500">POTENZIAL</span>
                </div>
                <div className={`text-2xl font-bold ${upside > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {upside > 0 ? 'Unterbewertet' : 'Überbewertet'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenarios */}
      <div className="bg-[#0a0a0a] rounded-xl border border-gray-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Szenarien</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => applyScenario('conservative')}
            className={`p-4 rounded-lg border transition-all ${
              activeScenario === 'conservative'
                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5 mx-auto mb-2" />
            <div className="text-sm font-medium">Konservativ</div>
            <div className="text-xs opacity-70 mt-1">5% Wachstum</div>
          </button>

          <button
            onClick={() => applyScenario('base')}
            className={`p-4 rounded-lg border transition-all ${
              activeScenario === 'base'
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 mx-auto mb-2" />
            <div className="text-sm font-medium">Basis</div>
            <div className="text-xs opacity-70 mt-1">10% Wachstum</div>
          </button>

          <button
            onClick={() => applyScenario('optimistic')}
            className={`p-4 rounded-lg border transition-all ${
              activeScenario === 'optimistic'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            <RocketLaunchIcon className="w-5 h-5 mx-auto mb-2" />
            <div className="text-sm font-medium">Optimistisch</div>
            <div className="text-xs opacity-70 mt-1">15% Wachstum</div>
          </button>
        </div>
      </div>

      {/* Custom Parameters */}
      <div className="bg-[#0a0a0a] rounded-xl border border-gray-800/50">
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Annahmen anpassen</h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* Revenue Growth */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Umsatzwachstum (%)
              </label>
              <input
                type="number"
                value={(params.revenueGrowthPct * 100).toFixed(1)}
                onChange={(e) => updateParam('revenueGrowthPct', parseFloat(e.target.value) / 100)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                step="0.5"
                min="0"
                max="30"
              />
            </div>

            {/* EBITDA Margin */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                EBITDA Marge (%)
              </label>
              <input
                type="number"
                value={(params.ebitdaPct * 100).toFixed(1)}
                onChange={(e) => updateParam('ebitdaPct', parseFloat(e.target.value) / 100)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                step="0.5"
                min="5"
                max="50"
              />
            </div>

            {/* Operating Cash Flow */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Operating Cash Flow (%)
              </label>
              <input
                type="number"
                value={(params.operatingCashFlowPct * 100).toFixed(1)}
                onChange={(e) => updateParam('operatingCashFlowPct', parseFloat(e.target.value) / 100)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                step="0.5"
                min="5"
                max="50"
              />
            </div>

            {/* CapEx */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                CapEx (%)
              </label>
              <input
                type="number"
                value={(params.capitalExpenditurePct * 100).toFixed(1)}
                onChange={(e) => updateParam('capitalExpenditurePct', parseFloat(e.target.value) / 100)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                step="0.5"
                min="0"
                max="20"
              />
            </div>

            {/* Terminal Growth */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Terminal Growth (%)
              </label>
              <input
                type="number"
                value={(params.longTermGrowthRate * 100).toFixed(1)}
                onChange={(e) => updateParam('longTermGrowthRate', parseFloat(e.target.value) / 100)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                step="0.5"
                min="0"
                max="5"
              />
            </div>

            {/* Cost of Equity */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Cost of Equity (%)
              </label>
              <input
                type="number"
                value={(params.costOfEquity * 100).toFixed(1)}
                onChange={(e) => updateParam('costOfEquity', parseFloat(e.target.value) / 100)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                step="0.5"
                min="5"
                max="20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {dcfResult && (
        <div className="bg-[#0a0a0a] rounded-xl border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Berechnungsdetails</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Enterprise Value</span>
              <p className="text-white font-semibold">{formatBillion(dcfResult.enterpriseValue)}</p>
            </div>
            <div>
              <span className="text-gray-500">Terminal Value</span>
              <p className="text-white font-semibold">{formatBillion(dcfResult.terminalValue)}</p>
            </div>
            <div>
              <span className="text-gray-500">WACC</span>
              <p className="text-white font-semibold">{formatPercentage(dcfResult.wacc / 100)}</p>
            </div>
            <div>
              <span className="text-gray-500">Net Debt</span>
              <p className="text-white font-semibold">{formatBillion(dcfResult.netDebt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <InformationCircleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium text-sm">Hinweis</p>
            <p className="text-gray-400 text-sm mt-1">
              DCF-Bewertungen basieren auf Zukunftsannahmen. Nutze verschiedene Szenarien für eine ausgewogene Einschätzung.
              Datenquelle: Financial Modeling Prep API.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}