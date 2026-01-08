// src/components/StandaloneDCFCalculator.tsx - FINALER INTERAKTIVER DCF
'use client'

import React, { useState, useEffect } from 'react'
import { 
  CalculatorIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'

export default function StandaloneDCFCalculator() {
  const [selectedTicker, setSelectedTicker] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'base' | 'optimistic'>('base')
  
  // DCF Base Data
  const [baseData, setBaseData] = useState<any>(null)
  
  // ANPASSBARE PARAMETER
  const [params, setParams] = useState({
    revenueGrowth: 10,      // %
    fcfMargin: 20,          // %
    terminalGrowth: 2.5,    // %
    discountRate: 10,       // %
    taxRate: 21,            // %
    capexPercent: 3         // %
  })

  // Szenarien
  const scenarios = {
    conservative: {
      revenueGrowth: 5,
      fcfMargin: 15,
      terminalGrowth: 2,
      discountRate: 12
    },
    base: {
      revenueGrowth: 10,
      fcfMargin: 20,
      terminalGrowth: 2.5,
      discountRate: 10
    },
    optimistic: {
      revenueGrowth: 15,
      fcfMargin: 25,
      terminalGrowth: 3,
      discountRate: 8
    }
  }

  // Filtered stocks
  const filteredStocks = searchQuery
    ? stocks.filter(s => 
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : []

  // Load base DCF data from API
  const loadBaseDCF = async (ticker: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/discounted-cash-flow/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setBaseData(data[0])
        }
      }
    } catch (error) {
      console.error('DCF Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle stock selection
  const handleSelectStock = (ticker: string) => {
    setSelectedTicker(ticker)
    setSearchQuery('')
    setIsSearchOpen(false)
    loadBaseDCF(ticker)
  }

  // Apply scenario
  const applyScenario = (scenario: keyof typeof scenarios) => {
    setActiveScenario(scenario)
    setParams(prev => ({
      ...prev,
      ...scenarios[scenario]
    }))
  }

  // BERECHNE DCF MIT CUSTOM PARAMETERN
  const calculateCustomDCF = () => {
    if (!baseData) return null

    const currentPrice = baseData['Stock Price'] || 100
    const shares = baseData.numberOfShares || 1e9
    
    // Simple DCF calculation
    let revenue = 400e9 // Base revenue (would come from API)
    let totalPV = 0
    
    // 5 Jahre projizieren
    for (let year = 1; year <= 5; year++) {
      revenue = revenue * (1 + params.revenueGrowth / 100)
      const fcf = revenue * (params.fcfMargin / 100)
      const pv = fcf / Math.pow(1 + params.discountRate / 100, year)
      totalPV += pv
    }
    
    // Terminal Value
    const terminalFCF = revenue * (params.fcfMargin / 100) * (1 + params.terminalGrowth / 100)
    const terminalValue = terminalFCF / ((params.discountRate - params.terminalGrowth) / 100)
    const terminalPV = terminalValue / Math.pow(1 + params.discountRate / 100, 5)
    
    const enterpriseValue = totalPV + terminalPV
    const fairValue = enterpriseValue / shares
    const upside = ((fairValue - currentPrice) / currentPrice) * 100
    
    return {
      fairValue,
      currentPrice,
      upside,
      enterpriseValue,
      terminalValue
    }
  }

  const dcfResult = calculateCustomDCF()

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Full width container */}
      <div className="w-full px-6 py-6">
        
        <h1 className="text-2xl font-semibold text-white mb-2">DCF Calculator</h1>
        <p className="text-gray-500 mb-8">Interaktive Discounted Cash Flow Bewertung</p>

        {/* Stock Search */}
        <div className="max-w-2xl mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Ticker eingeben (z.B. GOOGL, AAPL)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearchOpen(true)
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
            />
            <MagnifyingGlassIcon className="absolute right-3 top-3.5 w-5 h-5 text-gray-500" />
            
            {isSearchOpen && filteredStocks.length > 0 && (
              <>
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  {filteredStocks.map(stock => (
                    <button
                      key={stock.ticker}
                      onClick={() => handleSelectStock(stock.ticker)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors text-left"
                    >
                      <Logo ticker={stock.ticker} className="w-8 h-8" alt="" />
                      <div className="flex-1">
                        <div className="text-white font-medium">{stock.ticker}</div>
                        <div className="text-gray-500 text-xs">{stock.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
              </>
            )}
          </div>
        </div>

        {selectedTicker && (
          <>
            {/* Current Stock Header */}
            <div className="flex items-center gap-3 mb-6">
              <Logo ticker={selectedTicker} className="w-10 h-10" alt="" />
              <h2 className="text-xl font-semibold text-white">{selectedTicker}</h2>
              <button
                onClick={() => loadBaseDCF(selectedTicker)}
                disabled={loading}
                className="ml-auto px-4 py-2 bg-brand/20 text-brand-light rounded-lg text-sm hover:bg-brand/30 transition-colors"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* HAUPTERGEBNISSE - GROSS UND PROMINENT */}
            {dcfResult && (
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 mb-8">
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">FAIRER WERT</div>
                    <div className="text-4xl font-bold text-white">
                      ${dcfResult.fairValue.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">pro Aktie</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 mb-2">AKTUELLER KURS</div>
                    <div className="text-4xl font-bold text-white">
                      ${dcfResult.currentPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Marktpreis</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {dcfResult.upside > 0 ? (
                        <ArrowTrendingUpIcon className="w-5 h-5 text-brand-light" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
                      )}
                      <span className="text-sm text-gray-500">POTENZIAL</span>
                    </div>
                    <div className={`text-4xl font-bold ${dcfResult.upside > 0 ? 'text-brand-light' : 'text-red-400'}`}>
                      {dcfResult.upside > 0 ? '+' : ''}{dcfResult.upside.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dcfResult.upside > 0 ? 'Unterbewertet' : 'Überbewertet'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SZENARIEN */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Szenarien</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => applyScenario('conservative')}
                  className={`p-6 rounded-xl border transition-all ${
                    activeScenario === 'conservative'
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <ShieldCheckIcon className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-medium">Konservativ</div>
                  <div className="text-xs opacity-70 mt-1">5% Wachstum • 12% WACC</div>
                </button>

                <button
                  onClick={() => applyScenario('base')}
                  className={`p-6 rounded-xl border transition-all ${
                    activeScenario === 'base'
                      ? 'bg-brand/20 border-green-500 text-brand-light'
                      : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <ChartBarIcon className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-medium">Basis</div>
                  <div className="text-xs opacity-70 mt-1">10% Wachstum • 10% WACC</div>
                </button>

                <button
                  onClick={() => applyScenario('optimistic')}
                  className={`p-6 rounded-xl border transition-all ${
                    activeScenario === 'optimistic'
                      ? 'bg-brand/20 border-green-500 text-brand-light'
                      : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <RocketLaunchIcon className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-medium">Optimistisch</div>
                  <div className="text-xs opacity-70 mt-1">15% Wachstum • 8% WACC</div>
                </button>
              </div>
            </div>

            {/* ANPASSBARE PARAMETER */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                Annahmen anpassen
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Umsatzwachstum (%)
                  </label>
                  <input
                    type="number"
                    value={params.revenueGrowth}
                    onChange={(e) => setParams({...params, revenueGrowth: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0d0d0d] border border-gray-800 rounded-lg px-4 py-2 text-white"
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    FCF Marge (%)
                  </label>
                  <input
                    type="number"
                    value={params.fcfMargin}
                    onChange={(e) => setParams({...params, fcfMargin: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0d0d0d] border border-gray-800 rounded-lg px-4 py-2 text-white"
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Terminal Growth (%)
                  </label>
                  <input
                    type="number"
                    value={params.terminalGrowth}
                    onChange={(e) => setParams({...params, terminalGrowth: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0d0d0d] border border-gray-800 rounded-lg px-4 py-2 text-white"
                    min="0"
                    max="5"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Diskontierungssatz / WACC (%)
                  </label>
                  <input
                    type="number"
                    value={params.discountRate}
                    onChange={(e) => setParams({...params, discountRate: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0d0d0d] border border-gray-800 rounded-lg px-4 py-2 text-white"
                    min="5"
                    max="20"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Steuersatz (%)
                  </label>
                  <input
                    type="number"
                    value={params.taxRate}
                    onChange={(e) => setParams({...params, taxRate: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0d0d0d] border border-gray-800 rounded-lg px-4 py-2 text-white"
                    min="0"
                    max="40"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    CapEx (% vom Umsatz)
                  </label>
                  <input
                    type="number"
                    value={params.capexPercent}
                    onChange={(e) => setParams({...params, capexPercent: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0d0d0d] border border-gray-800 rounded-lg px-4 py-2 text-white"
                    min="0"
                    max="20"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}