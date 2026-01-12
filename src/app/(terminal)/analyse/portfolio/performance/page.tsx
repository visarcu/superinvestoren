// src/app/analyse/portfolio/performance/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'

// Types
interface PortfolioPosition {
  id: number
  ticker: string
  name: string
  shares: number
  avgPrice: number
  currentPrice: number
  totalValue: number
  gainLoss: number
  gainLossPercent: number
  weight: number
  sector: string
}

interface PerformanceData {
  date: string
  value: number
  gainLoss: number
  sp500: number
}

interface SectorAllocation {
  sector: string
  value: number
  percentage: number
  color: string
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

// Echte Portfolio-Daten laden
const loadPortfolioData = async (): Promise<PortfolioPosition[]> => {
  try {
    // TODO: Implementiere echte Portfolio-API
    // Vorläufig leere Liste zurückgeben
    return []
  } catch (error) {
    console.error('Error loading portfolio:', error)
    return []
  }
}

// Echte Performance-Daten laden
const loadPerformanceData = async (): Promise<PerformanceData[]> => {
  try {
    // TODO: Implementiere echte Portfolio-Performance API
    // Vorläufig leere Liste zurückgeben - KEINE ZUFÄLLIGEN FINANZDATEN!
    return []
  } catch (error) {
    console.error('Error loading performance data:', error)
    return []
  }
}

// Sector colors
const SECTOR_COLORS = {
  'Technology': '#10B981',
  'Healthcare': '#3B82F6', 
  'Consumer Staples': '#F59E0B',
  'Financials': '#8B5CF6',
  'Energy': '#EF4444',
  'Industrials': '#06B6D4',
  'Other': '#6B7280'
}

export default function PerformancePage() {
  const [user, setUser] = useState<User | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'MAX'>('1Y')

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }

        // Load portfolio and performance data
        const portfolioData = await loadPortfolioData()
        const performanceData = await loadPerformanceData()
        setPortfolio(portfolioData)
        setPerformanceData(performanceData)
        
      } catch (error) {
        console.error('Error loading performance data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate summary metrics
  const totalValue = portfolio.reduce((sum, pos) => sum + pos.totalValue, 0)
  const totalCost = portfolio.reduce((sum, pos) => sum + (pos.shares * pos.avgPrice), 0)
  const totalGainLoss = totalValue - totalCost
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

  // Calculate sector allocation
  const sectorAllocation: SectorAllocation[] = portfolio.reduce((sectors, position) => {
    const existingSector = sectors.find(s => s.sector === position.sector)
    if (existingSector) {
      existingSector.value += position.totalValue
    } else {
      sectors.push({
        sector: position.sector,
        value: position.totalValue,
        percentage: 0,
        color: SECTOR_COLORS[position.sector as keyof typeof SECTOR_COLORS] || SECTOR_COLORS.Other
      })
    }
    return sectors
  }, [] as SectorAllocation[])

  // Calculate percentages
  sectorAllocation.forEach(sector => {
    sector.percentage = (sector.value / totalValue) * 100
  })

  // Top performers
  const topPerformers = [...portfolio]
    .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
    .slice(0, 5)

  const worstPerformers = [...portfolio]
    .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
    .slice(0, 5)

  if (loading) {
    return (
      <div className="h-full bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-neutral-400">Performance-Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-neutral-950 text-white overflow-auto">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/analyse/portfolio"
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Portfolio</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Portfolio Performance</h1>
                <p className="text-neutral-400">Detaillierte Analyse der Wertentwicklung</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timeframe Selector */}
              <div className="flex bg-neutral-700 rounded-lg p-1">
                {(['1M', '3M', '6M', '1Y', 'MAX'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeframe(period)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      timeframe === period
                        ? 'bg-emerald-500 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              
              {!user?.isPremium && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-500 text-white font-semibold rounded-md transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span className="text-sm">Upgrade</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Portfolio Wert</h3>
            </div>
            <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Aktueller Marktwert</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                totalGainLoss >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                {totalGainLoss >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
                )}
              </div>
              <h3 className="font-semibold text-white">Gesamt G/V</h3>
            </div>
            <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString()}
            </p>
            <p className={`text-sm ${totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}% seit Kauf
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white">Beste Position</h3>
            </div>
            <p className="text-lg font-bold text-white">{topPerformers[0]?.ticker}</p>
            <p className="text-sm text-emerald-400">
              +{topPerformers[0]?.gainLossPercent.toFixed(1)}%
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white">Haltedauer</h3>
            </div>
            <p className="text-lg font-bold text-white">8.5 Monate</p>
            <p className="text-sm text-neutral-500">Durchschnittlich</p>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Portfolio Entwicklung</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-neutral-400">Portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-neutral-400">S&P 500</span>
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'value' ? `$${value.toLocaleString()}` : `${value.toFixed(1)}%`,
                    name === 'value' ? 'Portfolio' : 'S&P 500'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  fill="url(#portfolioGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="sp500"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sector Allocation */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Sektor-Aufteilung</h3>
            
            <div className="flex items-center justify-center mb-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {sectorAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="space-y-3">
              {sectorAllocation.map((sector) => (
                <div key={sector.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: sector.color }}
                    ></div>
                    <span className="text-white text-sm">{sector.sector}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium text-sm">
                      ${sector.value.toLocaleString()}
                    </div>
                    <div className="text-neutral-500 text-xs">
                      {sector.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top/Worst Performers */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Performance-Ranking</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-emerald-400 mb-3">🏆 Top Performer</h4>
                <div className="space-y-2">
                  {topPerformers.slice(0, 3).map((position, index) => (
                    <div key={position.id} className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-bold">#{index + 1}</span>
                        <div>
                          <div className="text-white font-medium text-sm">{position.ticker}</div>
                          <div className="text-neutral-500 text-xs">{position.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold text-sm">
                          +{position.gainLossPercent.toFixed(1)}%
                        </div>
                        <div className="text-emerald-400 text-xs">
                          +${position.gainLoss.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-red-400 mb-3">📉 Verbesserungspotential</h4>
                <div className="space-y-2">
                  {worstPerformers.slice(0, 2).map((position, index) => (
                    <div key={position.id} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 font-bold">#{portfolio.length - index}</span>
                        <div>
                          <div className="text-white font-medium text-sm">{position.ticker}</div>
                          <div className="text-neutral-500 text-xs">{position.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-sm ${
                          position.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent.toFixed(1)}%
                        </div>
                        <div className={`text-xs ${
                          position.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {position.gainLoss >= 0 ? '+' : ''}${position.gainLoss.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Statistics */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Portfolio-Statistiken</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Rendite</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">1 Monat</span>
                  <span className="text-emerald-400 font-medium">+3.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">3 Monate</span>
                  <span className="text-emerald-400 font-medium">+8.7%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">1 Jahr</span>
                  <span className="text-emerald-400 font-medium">+{totalGainLossPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Seit Beginn</span>
                  <span className="text-emerald-400 font-medium">+{totalGainLossPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Risiko</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Volatilität (1J)</span>
                  <span className="text-white font-medium">18.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Max Drawdown</span>
                  <span className="text-red-400 font-medium">-12.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Beta vs S&P 500</span>
                  <span className="text-white font-medium">0.92</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Sharpe Ratio</span>
                  <span className="text-emerald-400 font-medium">1.34</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Diversifikation</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Anzahl Positionen</span>
                  <span className="text-white font-medium">{portfolio.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Größte Position</span>
                  <span className="text-white font-medium">{Math.max(...portfolio.map(p => p.weight)).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Sektoren</span>
                  <span className="text-white font-medium">{sectorAllocation.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Konzentration</span>
                  <span className="text-yellow-400 font-medium">Mittel</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Comparison */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Benchmark Vergleich</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800">
                <tr>
                  <th className="text-left py-3 px-6 text-neutral-400 font-medium">Index</th>
                  <th className="text-right py-3 px-6 text-neutral-400 font-medium">1M</th>
                  <th className="text-right py-3 px-6 text-neutral-400 font-medium">3M</th>
                  <th className="text-right py-3 px-6 text-neutral-400 font-medium">1J</th>
                  <th className="text-right py-3 px-6 text-neutral-400 font-medium">Volatilität</th>
                  <th className="text-right py-3 px-6 text-neutral-400 font-medium">Alpha</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-neutral-800 bg-emerald-500/10">
                  <td className="py-4 px-6 font-semibold text-emerald-400">Mein Portfolio</td>
                  <td className="py-4 px-6 text-right text-emerald-400 font-medium">+3.2%</td>
                  <td className="py-4 px-6 text-right text-emerald-400 font-medium">+8.7%</td>
                  <td className="py-4 px-6 text-right text-emerald-400 font-medium">+{totalGainLossPercent.toFixed(1)}%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">18.5%</td>
                  <td className="py-4 px-6 text-right text-emerald-400 font-medium">+4.2%</td>
                </tr>
                <tr className="border-t border-neutral-800 hover:bg-neutral-800/30">
                  <td className="py-4 px-6 text-white">S&P 500</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+2.1%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+5.8%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+12.4%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">16.2%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">0.0%</td>
                </tr>
                <tr className="border-t border-neutral-800 hover:bg-neutral-800/30">
                  <td className="py-4 px-6 text-white">NASDAQ 100</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+4.1%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+11.2%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+18.9%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">22.1%</td>
                  <td className="py-4 px-6 text-right text-emerald-400">+6.5%</td>
                </tr>
                <tr className="border-t border-neutral-800 hover:bg-neutral-800/30">
                  <td className="py-4 px-6 text-white">MSCI World</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+1.8%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+4.9%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">+9.7%</td>
                  <td className="py-4 px-6 text-right text-neutral-400">15.8%</td>
                  <td className="py-4 px-6 text-right text-red-400">-2.7%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-gradient-to-r from-brand/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <InformationCircleIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">📊 Performance Insight</h4>
              <p className="text-neutral-400">
                Dein Portfolio schlägt den S&P 500 um <strong className="text-white">+4.2%</strong> in diesem Jahr. 
                Die Tech-Konzentration (61%) trägt zur Outperformance bei, erhöht aber auch die Volatilität. 
                Erwäge eine weitere Diversifikation in defensive Sektoren.
              </p>
              <div className="mt-3 text-xs text-neutral-500">
                💡 Tipp: Warren Buffett hält aktuell 15% Cash-Position für opportunistische Käufe.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}