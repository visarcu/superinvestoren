// src/components/DividendAnalysisSection.tsx - CLEAN & PROFESSIONAL VERSION
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  StarIcon,
  TrophyIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'

// ─── Types (unchanged) ─────────────────────────────────────────────────────
interface DividendData {
  ticker: string
  name: string
  currentYield: number
  payoutRatio: number
  dividendPerShareTTM: number
  annualDividendIncome: number
  portfolioValue: number
  portfolioWeight: number
  dividendGrowthRate: number
  payoutSafety: {
    text: string
    color: 'green' | 'yellow' | 'red' | 'gray'
    level: string
  }
}

interface YearlyDividendData {
  year: number
  totalDividends: number
  averageYield: number
  topContributors: Array<{
    ticker: string
    amount: number
    percentage: number
  }>
  growthRate: number
}

interface QuarterlyData {
  quarter: string
  amount: number
  contributors: number
}

interface Props {
  investorName: string
  currentPositions: any[]
  snapshots: any[]
}

// ─── Utility Functions (unchanged) ─────────────────────────────────────────
function formatCurrency(amount: number, showCurrency = true) {
  const suffix = showCurrency ? ' $' : ''
  
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} Mrd.${suffix}`
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Mio.${suffix}`
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)} Tsd.${suffix}`
  }
  return `${amount.toFixed(0)}${suffix}`
}

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getStockName(position: any): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
}

// ✅ CLEAN ERROR COMPONENT - Reduced colors
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-4">Dividenden-Analyse</h2>
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Fehler beim Laden</h3>
        <p className="text-gray-400 text-sm mb-4 leading-relaxed">{error}</p>
        
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Erneut versuchen
          </button>
          
          <div className="text-xs text-gray-500 text-left">
            <p className="font-medium mb-1">Mögliche Lösungen:</p>
            <ul className="space-y-1">
              <li>• API-Schlüssel prüfen (.env.local)</li>
              <li>• Server neustarten (npm run dev)</li>
              <li>• API-Limit erreicht</li>
              <li>• Später erneut versuchen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
)

// ✅ CLEAN LOADING COMPONENT
const LoadingDisplay = () => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-4">Dividenden-Analyse</h2>
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 max-w-md mx-auto">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <div className="absolute inset-0 rounded-full border-2 border-gray-700/50"></div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Dividenden-Daten werden geladen...</h3>
        <p className="text-gray-400 text-sm mb-4">Analysiere Portfolio-Ausschüttungen</p>
        
        <div className="bg-gray-800/30 rounded-lg p-3 text-xs text-gray-500">
          <div className="flex justify-between items-center mb-2">
            <span>Fortschritt:</span>
            <span className="text-green-400">Lädt API-Daten...</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

// ✅ CLEAN NO DATA COMPONENT
const NoDataDisplay = ({ investorName, onRetry }: { investorName: string; onRetry: () => void }) => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-4">Dividenden-Analyse</h2>
      <p className="text-gray-400 max-w-2xl mx-auto mb-8">
        {investorName}s jährliche Dividendenerträge und Ausschüttungsstrategien
      </p>
    </div>
    
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center max-w-md mx-auto">
      <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Keine Dividenden-Daten</h3>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">
        Für {investorName}s Portfolio konnten keine Dividenden-Informationen geladen werden. 
        Dies kann daran liegen, dass die Positionen keine Dividenden zahlen oder die Daten nicht verfügbar sind.
      </p>
      <button
        onClick={onRetry}
        className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  </div>
)

// ─── Main Component mit CLEAN Design ──────────────────────────────────────
export default function DividendAnalysisSection({ 
  investorName, 
  currentPositions, 
  snapshots 
}: Props) {
  
  const [dividendData, setDividendData] = useState<DividendData[]>([])
  const [yearlyData, setYearlyData] = useState<YearlyDividendData[]>([])
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ All the same logic functions from before (loadDividendData, etc.)
  const retryLoading = () => {
    console.log('🔄 [DividendAnalysis] Retrying data load...')
    setError(null)
    setLoading(true)
    setDividendData([])
    setYearlyData([])
    setQuarterlyData([])
    
    setTimeout(() => {
      loadDividendData()
    }, 500)
  }

  const loadDividendData = async () => {
    try {
      console.log(`🔍 [DividendAnalysis] Starting dividend data load for ${investorName}`)
      
      if (!currentPositions || !Array.isArray(currentPositions)) {
        throw new Error('Portfolio-Daten sind nicht verfügbar. Bitte warten Sie, bis die Daten geladen sind.')
      }
      
      if (currentPositions.length === 0) {
        throw new Error('Keine Portfolio-Positionen gefunden. Das Portfolio scheint leer zu sein.')
      }

      const mergedPositions = new Map<string, { value: number, shares: number, name: string }>()
      let validTickersCount = 0
      
      currentPositions.forEach((position, index) => {
        const ticker = getTicker(position)
        if (!ticker) return
        
        validTickersCount++
        const existing = mergedPositions.get(ticker)
        if (existing) {
          existing.value += position.value || 0
          existing.shares += position.shares || 0
        } else {
          mergedPositions.set(ticker, {
            value: position.value || 0,
            shares: position.shares || 0,
            name: getStockName(position)
          })
        }
      })
      
      if (mergedPositions.size === 0) {
        throw new Error('Keine gültigen Ticker-Symbole in den Portfolio-Positionen gefunden.')
      }
      
      const totalPortfolioValue = Array.from(mergedPositions.values())
        .reduce((sum, pos) => sum + pos.value, 0)

      const tickers = Array.from(mergedPositions.keys())
      const batchSize = 5
      const results: (DividendData | null)[] = []
      
      console.log(`🚀 [DividendAnalysis] Loading dividend data for ${tickers.length} tickers...`)
      
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (ticker) => {
          const position = mergedPositions.get(ticker)!
          
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)
            
            const response = await fetch(`/api/dividends/${ticker}`, {
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            
            if (!response.ok) return null
            
            const data = await response.json()
            const currentInfo = data.currentInfo
            
            if (!currentInfo) return null
            
            const annualDividendIncome = currentInfo.dividendPerShareTTM 
              ? currentInfo.dividendPerShareTTM * position.shares
              : 0
            
            return {
              ticker,
              name: position.name,
              currentYield: currentInfo.currentYield || 0,
              payoutRatio: currentInfo.payoutRatio || 0,
              dividendPerShareTTM: currentInfo.dividendPerShareTTM || 0,
              annualDividendIncome,
              portfolioValue: position.value,
              portfolioWeight: (position.value / totalPortfolioValue) * 100,
              dividendGrowthRate: currentInfo.dividendGrowthRate || 0,
              payoutSafety: currentInfo.payoutSafety || {
                text: 'Keine Daten',
                color: 'gray' as const,
                level: 'no_data'
              }
            } as DividendData
            
          } catch (error) {
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        if (i + batchSize < tickers.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      const validDividendData = results.filter(Boolean) as DividendData[]
      
      if (validDividendData.length === 0) {
        throw new Error(`Keine Dividenden-Daten für die ${tickers.length} Portfolio-Positionen verfügbar.`)
      }
      
      setDividendData(validDividendData)
      calculateYearlyDividends(validDividendData, snapshots || [])
      calculateQuarterlyDividends(validDividendData)
      
    } catch (error) {
      console.error('❌ [DividendAnalysis] Failed to load dividend data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der Dividenden-Daten'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    
    const initializeAnalysis = async () => {
      if (!currentPositions || currentPositions.length === 0) {
        setLoading(false)
        setError('Portfolio-Daten werden noch geladen. Bitte warten...')
        return
      }
      
      if (isMounted) {
        await loadDividendData()
      }
    }
    
    initializeAnalysis()
    
    return () => {
      isMounted = false
    }
  }, [currentPositions, investorName, snapshots])

  function calculateYearlyDividends(dividendData: DividendData[], snapshots: any[]) {
    const currentYear = new Date().getFullYear()
    const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear]
    
    const yearlyResults: YearlyDividendData[] = years.map((year, index) => {
      let totalDividends = 0
      let weightedYield = 0
      let totalValue = 0
      
      if (year === currentYear) {
        totalDividends = dividendData.reduce((sum, stock) => sum + stock.annualDividendIncome, 0)
        
        dividendData.forEach(stock => {
          if (stock.currentYield > 0) {
            weightedYield += stock.currentYield * stock.portfolioValue
            totalValue += stock.portfolioValue
          }
        })
      } else {
        const growthFactor = Math.pow(1.08, currentYear - year)
        totalDividends = dividendData.reduce((sum, stock) => 
          sum + (stock.annualDividendIncome / growthFactor), 0
        )
        
        dividendData.forEach(stock => {
          if (stock.currentYield > 0) {
            const adjustedValue = stock.portfolioValue / growthFactor
            weightedYield += stock.currentYield * adjustedValue
            totalValue += adjustedValue
          }
        })
      }
      
      const averageYield = totalValue > 0 ? weightedYield / totalValue : 0
      
      const contributors = dividendData
        .map(stock => ({
          ticker: stock.ticker,
          amount: year === currentYear ? stock.annualDividendIncome : stock.annualDividendIncome / Math.pow(1.08, currentYear - year),
          percentage: 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
      
      const totalContributorAmount = contributors.reduce((sum, c) => sum + c.amount, 0)
      contributors.forEach(c => {
        c.percentage = totalContributorAmount > 0 ? (c.amount / totalContributorAmount) * 100 : 0
      })
      
      return {
        year,
        totalDividends,
        averageYield,
        topContributors: contributors,
        growthRate: 0
      }
    })
    
    yearlyResults.forEach((entry, index) => {
      if (index > 0) {
        const previous = yearlyResults[index - 1]
        if (previous.totalDividends > 0) {
          entry.growthRate = ((entry.totalDividends - previous.totalDividends) / previous.totalDividends) * 100
        }
      }
    })
    
    setYearlyData(yearlyResults)
  }

  function calculateQuarterlyDividends(dividendData: DividendData[]) {
    const currentYear = new Date().getFullYear()
    const quarters = [
      { quarter: `Q1 ${currentYear}`, amount: 0, contributors: 0 },
      { quarter: `Q2 ${currentYear}`, amount: 0, contributors: 0 },
      { quarter: `Q3 ${currentYear}`, amount: 0, contributors: 0 },
      { quarter: `Q4 ${currentYear}`, amount: 0, contributors: 0 }
    ]
    
    const totalAnnual = dividendData.reduce((sum, stock) => sum + stock.annualDividendIncome, 0)
    const quarterlyAmount = totalAnnual / 4
    const contributingStocks = dividendData.filter(stock => stock.annualDividendIncome > 0).length
    
    quarters.forEach(q => {
      q.amount = quarterlyAmount
      q.contributors = contributingStocks
    })
    
    setQuarterlyData(quarters)
  }

  const metrics = useMemo(() => {
    if (dividendData.length === 0) {
      return {
        totalAnnualDividends: 0,
        averagePortfolioYield: 0,
        dividendGrowingStocks: 0,
        monthlyIncome: 0,
        topDividendStock: null,
        qualityDistribution: { safe: 0, moderate: 0, risky: 0 }
      }
    }
    
    const totalAnnual = dividendData.reduce((sum, stock) => sum + stock.annualDividendIncome, 0)
    const totalValue = dividendData.reduce((sum, stock) => sum + stock.portfolioValue, 0)
    const weightedYield = totalValue > 0 ? dividendData.reduce((sum, stock) => 
      sum + (stock.currentYield * stock.portfolioValue), 0
    ) / totalValue : 0
    
    const growingStocks = dividendData.filter(stock => stock.dividendGrowthRate > 0).length
    const topDividendStock = dividendData.reduce((top, stock) => 
      stock.annualDividendIncome > (top?.annualDividendIncome || 0) ? stock : top, null as DividendData | null
    )
    
    const qualityDistribution = dividendData.reduce((acc, stock) => {
      if (stock.payoutSafety.color === 'green') acc.safe++
      else if (stock.payoutSafety.color === 'yellow') acc.moderate++
      else if (stock.payoutSafety.color === 'red') acc.risky++
      return acc
    }, { safe: 0, moderate: 0, risky: 0 })
    
    return {
      totalAnnualDividends: totalAnnual,
      averagePortfolioYield: weightedYield,
      dividendGrowingStocks: growingStocks,
      monthlyIncome: totalAnnual / 12,
      topDividendStock,
      qualityDistribution
    }
  }, [dividendData])

  if (loading) {
    return <LoadingDisplay />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={retryLoading} />
  }

  if (dividendData.length === 0) {
    return <NoDataDisplay investorName={investorName} onRetry={retryLoading} />
  }

  return (
    <div className="space-y-8">
      
      {/* ✅ CLEAN Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Dividenden-Analyse
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          {investorName}s jährliche Dividendenerträge und Ausschüttungsstrategien
        </p>
        
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>{dividendData.length} Positionen analysiert</span>
        </div>
      </div>

      {/* ✅ CLEAN Key Metrics - Only Green & Blue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Jährliche Dividenden</h3>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(metrics.totalAnnualDividends)}
          </p>
          <p className="text-xs text-gray-500">Geschätzte Jahresausschüttung</p>
        </div>
        
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Portfolio Yield</h3>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {(metrics.averagePortfolioYield * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Gewichtete Dividendenrendite</p>
        </div>
        
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Wachsende Dividenden</h3>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {metrics.dividendGrowingStocks}
          </p>
          <p className="text-xs text-gray-500">Aktien mit steigenden Dividenden</p>
        </div>
        
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Monatliches Einkommen</h3>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {formatCurrency(metrics.monthlyIncome)}
          </p>
          <p className="text-xs text-gray-500">Durchschnitt pro Monat</p>
        </div>
      </div>

      {/* ✅ CLEAN Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top Dividend Contributors */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrophyIcon className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top Dividenden-Zahler</h3>
              <p className="text-sm text-gray-400">Nach jährlicher Ausschüttung</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {dividendData
              .filter(stock => stock.annualDividendIncome > 0)
              .sort((a, b) => b.annualDividendIncome - a.annualDividendIncome)
              .slice(0, 8)
              .map((stock, index) => (
                <div key={stock.ticker} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-gray-700/30">
                      <Logo
                        ticker={stock.ticker}
                        alt={`${stock.ticker} Logo`}
                        className="w-full h-full"
                        padding="small"
                      />
                    </div>
                    <div>
                      <span className="text-green-400 font-mono text-sm font-semibold">
                        {stock.ticker}
                      </span>
                      <p className="text-gray-300 text-sm truncate max-w-[120px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold text-sm">
                      {formatCurrency(stock.annualDividendIncome)}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {(stock.currentYield * 100).toFixed(1)}% Yield
                    </div>
                  </div>
                </div>
              ))}
            
            {dividendData.filter(stock => stock.annualDividendIncome > 0).length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Keine Dividenden-zahlenden Aktien im Portfolio gefunden
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dividend Growth Over Time */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Dividenden-Wachstum</h3>
              <p className="text-sm text-gray-400">Jährliche Entwicklung (geschätzt)</p>
            </div>
          </div>
          
          {yearlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickFormatter={(value) => formatCurrency(value, false)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: any) => [formatCurrency(value), 'Dividenden']}
                  labelFormatter={(label) => `Jahr: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="totalDividends"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <div className="text-center">
                <ChartBarIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Keine historischen Daten verfügbar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ CLEAN Quality Analysis - Simplified */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Quality Distribution - Clean */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <StarIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Dividenden-Qualität</h3>
              <p className="text-sm text-gray-400">Sicherheitsbewertung</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Sicher</span>
              </div>
              <span className="text-green-400 font-semibold">{metrics.qualityDistribution.safe}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Moderat</span>
              </div>
              <span className="text-blue-400 font-semibold">{metrics.qualityDistribution.moderate}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Riskant</span>
              </div>
              <span className="text-gray-400 font-semibold">{metrics.qualityDistribution.risky}</span>
            </div>
            
            {/* Quality Summary */}
            <div className="mt-6 pt-4 border-t border-gray-800/50">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">Qualitäts-Score</p>
                <div className="flex items-center justify-center gap-2">
                  {metrics.qualityDistribution.safe >= metrics.qualityDistribution.risky ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-medium text-sm">Solide</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-400 font-medium text-sm">Gemischt</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Yielding Stocks - Clean */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Höchste Renditen</h3>
              <p className="text-sm text-gray-400">Top Dividend Yields</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {dividendData
              .filter(stock => stock.currentYield > 0)
              .sort((a, b) => b.currentYield - a.currentYield)
              .slice(0, 8)
              .map((stock) => (
                <div key={stock.ticker} className="flex items-center justify-between p-2 hover:bg-gray-800/20 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded overflow-hidden bg-white/5">
                      <Logo
                        ticker={stock.ticker}
                        alt={`${stock.ticker} Logo`}
                        className="w-full h-full"
                        padding="none"
                      />
                    </div>
                    <span className="text-green-400 font-mono text-sm font-semibold">
                      {stock.ticker}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">
                      {(stock.currentYield * 100).toFixed(1)}%
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      stock.payoutSafety.color === 'green' ? 'bg-green-400' :
                      stock.payoutSafety.color === 'yellow' ? 'bg-blue-400' :
                      stock.payoutSafety.color === 'red' ? 'bg-gray-400' :
                      'bg-gray-400'
                    }`} />
                  </div>
                </div>
              ))}
            
            {dividendData.filter(stock => stock.currentYield > 0).length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">Keine Dividend Yields verfügbar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ CLEAN Quarterly Breakdown */}
      {quarterlyData.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Quartalsweise Dividenden</h3>
              <p className="text-sm text-gray-400">Geschätzte Verteilung {new Date().getFullYear()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quarterlyData.map((q, index) => (
              <div key={index} className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/30 hover:bg-gray-800/50 transition-colors">
                <div className="text-lg font-bold text-white mb-2">
                  {formatCurrency(q.amount)}
                </div>
                <div className="text-sm text-gray-400 mb-1">
                  {q.quarter}
                </div>
                <div className="text-xs text-gray-500">
                  {q.contributors} Aktien
                </div>
                
                <div className="mt-3 w-full bg-gray-700/50 rounded-full h-1">
                  <div 
                    className="bg-blue-400 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((q.amount / Math.max(...quarterlyData.map(qd => qd.amount))) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ CLEAN Insights - Reduced colors */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <LightBulbIcon className="w-4 h-4 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Dividenden-Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800/20 rounded-lg p-4">
            <span className="text-green-400 font-semibold block mb-1">
              {formatCurrency(metrics.monthlyIncome / 30)} täglich
            </span>
            <p className="text-gray-400 text-xs leading-relaxed">
              Durchschnittliche tägliche Dividendenerträge
            </p>
          </div>
          
          {metrics.topDividendStock && (
            <div className="bg-gray-800/20 rounded-lg p-4">
              <span className="text-blue-400 font-semibold block mb-1">
                {metrics.topDividendStock.ticker} führt
              </span>
              <p className="text-gray-400 text-xs leading-relaxed">
                Größter Dividenden-Contributor mit {formatCurrency(metrics.topDividendStock.annualDividendIncome)}
              </p>
            </div>
          )}
          
          <div className="bg-gray-800/20 rounded-lg p-4">
            <span className="text-green-400 font-semibold block mb-1">
              {formatCurrency(metrics.totalAnnualDividends / 8760)} pro Stunde
            </span>  
            <p className="text-gray-400 text-xs leading-relaxed">
              Passive Einkommen rund um die Uhr
            </p>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{dividendData.filter(d => d.annualDividendIncome > 0).length} Dividenden-Zahler</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Ø {(metrics.averagePortfolioYield * 100).toFixed(1)}% Portfolio-Yield</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{metrics.dividendGrowingStocks} wachsende Dividenden</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}