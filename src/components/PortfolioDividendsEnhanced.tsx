// src/components/PortfolioDividendsEnhanced.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Holding {
  symbol: string
  name: string
  quantity: number
  current_price: number
  value: number
}

interface DividendForecast {
  month: string
  year: number
  estimated: number
  confirmed: number
}

interface DividendByStock {
  symbol: string
  name: string
  lastDividend: number
  yield: number
  frequency: string
  exDate: string
  payDate: string
  totalAnnual: number
  growth5Year: number
  payoutRatio: number
  consecutiveYears: number
}

interface PortfolioDividendsEnhancedProps {
  holdings: Holding[]
}

export default function PortfolioDividendsEnhanced({ holdings }: PortfolioDividendsEnhancedProps) {
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'forecast' | 'breakdown' | 'history' | 'analysis'>('forecast')
  const [timeframe, setTimeframe] = useState<'3M' | '6M' | '1Y' | '5Y'>('1Y')
  
  // Mock data for demonstration
  const [monthlyForecast, setMonthlyForecast] = useState<DividendForecast[]>([])
  const [stockDividends, setStockDividends] = useState<DividendByStock[]>([])
  const [totalAnnualDividends, setTotalAnnualDividends] = useState(3750)
  const [averageYield, setAverageYield] = useState(2.8)
  const [monthlyAverage, setMonthlyAverage] = useState(312.50)
  const [yieldOnCost, setYieldOnCost] = useState(3.2)

  useEffect(() => {
    generateMockData()
  }, [holdings])

  const generateMockData = () => {
    // Generate monthly forecast
    const forecast: DividendForecast[] = []
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth + i) % 12
      const year = currentYear + Math.floor((currentMonth + i) / 12)
      forecast.push({
        month: getMonthName(month),
        year,
        estimated: Math.random() * 500 + 200,
        confirmed: i < 3 ? Math.random() * 400 + 150 : 0
      })
    }
    setMonthlyForecast(forecast)

    // Generate stock dividend data
    const stockData: DividendByStock[] = holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      lastDividend: Math.random() * 2 + 0.5,
      yield: Math.random() * 4 + 1,
      frequency: ['Quarterly', 'Monthly', 'Semi-Annual'][Math.floor(Math.random() * 3)],
      exDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payDate: new Date(Date.now() + Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAnnual: Math.random() * 1000 + 200,
      growth5Year: Math.random() * 20 - 5,
      payoutRatio: Math.random() * 60 + 20,
      consecutiveYears: Math.floor(Math.random() * 25)
    }))
    setStockDividends(stockData)

    setLoading(false)
  }

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[month]
  }

  const getMaxDividend = () => Math.max(...monthlyForecast.map(f => f.estimated + f.confirmed))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-green-400 font-medium">+12.5%</span>
          </div>
          <p className="text-sm text-theme-secondary mb-1">Est. Next Year Payouts</p>
          <p className="text-2xl font-bold text-theme-primary">
            ${totalAnnualDividends.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-theme-muted">
            <span>Monthly: ${monthlyAverage.toFixed(2)}</span>
            <span>•</span>
            <span>Daily: ${(monthlyAverage / 30).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ArrowTrendingUpIcon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-blue-400 font-medium">Stable</span>
          </div>
          <p className="text-sm text-theme-secondary mb-1">Forward Yield</p>
          <p className="text-2xl font-bold text-theme-primary">{averageYield.toFixed(2)}%</p>
          <div className="mt-2 text-xs text-theme-muted">
            Yield on Base Cost: {yieldOnCost.toFixed(2)}%
          </div>
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CalendarDaysIcon className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-purple-400 font-medium">Quarterly</span>
          </div>
          <p className="text-sm text-theme-secondary mb-1">Next Payout</p>
          <p className="text-2xl font-bold text-theme-primary">Dec 25</p>
          <div className="mt-2 text-xs text-theme-muted">
            AMZN, NVDA - $387 est.
          </div>
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-xs text-yellow-400 font-medium">Growing</span>
          </div>
          <p className="text-sm text-theme-secondary mb-1">Div. Growth Rate</p>
          <p className="text-2xl font-bold text-theme-primary">8.7%</p>
          <div className="mt-2 text-xs text-theme-muted">
            5-Year Average
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 p-1 bg-theme-card rounded-lg border border-theme/10">
        {(['forecast', 'breakdown', 'history', 'analysis'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              activeView === view
                ? 'bg-green-500 text-white'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Forecast View */}
      {activeView === 'forecast' && (
        <div className="space-y-4">
          {/* Time Period Selector */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-theme-primary">Dividend Forecast</h3>
            <div className="flex gap-2">
              {(['3M', '6M', '1Y', '5Y'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    timeframe === period
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <div className="space-y-4">
              {monthlyForecast.slice(0, timeframe === '3M' ? 3 : timeframe === '6M' ? 6 : 12).map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">{month.month} '{month.year.toString().slice(-2)}</span>
                    <span className="font-semibold text-theme-primary">
                      ${(month.estimated + month.confirmed).toFixed(2)}
                    </span>
                  </div>
                  <div className="relative h-8 bg-theme-secondary/30 rounded-lg overflow-hidden">
                    {month.confirmed > 0 && (
                      <div 
                        className="absolute left-0 top-0 h-full bg-green-500 rounded-lg"
                        style={{ width: `${(month.confirmed / getMaxDividend()) * 100}%` }}
                      />
                    )}
                    <div 
                      className="absolute left-0 top-0 h-full bg-green-400/50 rounded-lg"
                      style={{ 
                        left: `${(month.confirmed / getMaxDividend()) * 100}%`,
                        width: `${(month.estimated / getMaxDividend()) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-theme/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-xs text-theme-secondary">Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400/50 rounded" />
                <span className="text-xs text-theme-secondary">Estimated</span>
              </div>
            </div>
          </div>

          {/* Cumulative Chart */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <h4 className="text-sm font-medium text-theme-secondary mb-4">Cumulative Payouts</h4>
            <div className="h-32 relative">
              <svg className="w-full h-full">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 100 Q 100 80 200 60 T 400 40 L 400 130 L 0 130 Z"
                  fill="url(#gradient)"
                  className="w-full"
                />
                <path
                  d="M 0 100 Q 100 80 200 60 T 400 40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute top-0 right-0 text-2xl font-bold text-green-400">
                ${(totalAnnualDividends * 1.2).toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown View */}
      {activeView === 'breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Stock */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">By Position</h3>
            <div className="space-y-3">
              {stockDividends.slice(0, 5).map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded-lg hover:bg-theme-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-green-400">
                        {stock.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-theme-primary">{stock.symbol}</p>
                      <p className="text-xs text-theme-muted">{stock.yield.toFixed(2)}% yield</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">${stock.totalAnnual.toFixed(2)}</p>
                    <p className="text-xs text-theme-muted">{stock.frequency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Metrics */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Key Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-theme-secondary">Avg. Payout Ratio</span>
                </div>
                <span className="font-semibold text-theme-primary">42.3%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                  <span className="text-theme-secondary">Dividend Growth</span>
                </div>
                <span className="font-semibold text-green-400">+8.7%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon className="w-5 h-5 text-purple-400" />
                  <span className="text-theme-secondary">Payment Frequency</span>
                </div>
                <span className="font-semibold text-theme-primary">Quarterly</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="w-5 h-5 text-yellow-400" />
                  <span className="text-theme-secondary">Dividend Kings</span>
                </div>
                <span className="font-semibold text-theme-primary">2 Stocks</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="bg-theme-card rounded-xl border border-theme/10">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-theme-secondary">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-theme-secondary">Stock</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-theme-secondary">Per Share</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-theme-secondary">Shares</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-theme-secondary">Total</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-theme-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-theme/5 hover:bg-theme-secondary/10 transition-colors">
                      <td className="py-3 px-4 text-sm text-theme-primary">
                        {new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-theme-primary">
                          {holdings[i % holdings.length]?.symbol || 'AAPL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-theme-primary">
                        ${(Math.random() * 2 + 0.5).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-theme-primary">
                        {Math.floor(Math.random() * 100 + 50)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-400">
                        ${(Math.random() * 200 + 50).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          i < 3 ? 'bg-green-500/20 text-green-400' : 'bg-theme-secondary/30 text-theme-muted'
                        }`}>
                          {i < 3 ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analysis View */}
      {activeView === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Dividend Safety Score</h3>
            <div className="space-y-4">
              {['Payout Ratio', 'Earnings Stability', 'Free Cash Flow', 'Debt Level', 'Dividend History'].map((metric, i) => {
                const score = Math.random() * 40 + 60
                return (
                  <div key={metric}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-theme-secondary">{metric}</span>
                      <span className="text-sm font-semibold text-theme-primary">{score.toFixed(0)}/100</span>
                    </div>
                    <div className="h-2 bg-theme-secondary/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          score > 80 ? 'bg-green-500' : score > 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-400">Strong Dividend Safety</span>
              </div>
              <p className="text-xs text-theme-secondary">
                Your portfolio consists of companies with stable dividend histories and strong fundamentals.
              </p>
            </div>
          </div>

          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Recommendations</h3>
            <div className="space-y-3">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <LightBulbIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-theme-primary mb-1">Diversify Income Sources</p>
                    <p className="text-xs text-theme-secondary">
                      Consider adding REITs or high-yield bonds to increase monthly income stability.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-theme-primary mb-1">Growth Opportunity</p>
                    <p className="text-xs text-theme-secondary">
                      MSFT has increased dividends for 20 consecutive years. Consider increasing position.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-theme-primary mb-1">Monitor Payout Ratio</p>
                    <p className="text-xs text-theme-secondary">
                      BAT.XL has a payout ratio above 80%. Watch for sustainability concerns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}