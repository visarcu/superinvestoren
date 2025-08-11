'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CalendarIcon,
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  GiftIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

import { PlusIcon } from '@heroicons/react/24/outline'  // ← Fehlt!


interface DividendDashboardProps {
  transactions?: any[]  // Props for real data
}

export default function DividendDashboard({ transactions = [] }: DividendDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('2025')
  const [realDividendData, setRealDividendData] = useState({
    yearlyTotal: 0,
    monthlyAverage: 0,
    nextDividends: [] as any[],
    monthlyHistory: [] as any[],
    topDividendStocks: [] as any[]
  })

  // 🆕 NEU: Load real data from localStorage and calculate
  useEffect(() => {
    loadRealDividendData()
  }, [])

  const loadRealDividendData = () => {
    // Load transactions from localStorage
    const savedTransactions = localStorage.getItem('portfolio_transactions')
    if (!savedTransactions) {
      console.log('No transactions found')
      return
    }

    const txns = JSON.parse(savedTransactions)
    console.log('Loading dividend data from transactions:', txns)

    // Filter dividend transactions
    const dividendTxns = txns.filter((tx: any) => tx.type === 'DIVIDEND')
    console.log('Dividend transactions:', dividendTxns)

    // Calculate yearly total (current year)
    const currentYear = new Date().getFullYear()
    const yearlyDividends = dividendTxns
      .filter((tx: any) => new Date(tx.date).getFullYear() === currentYear)
      .reduce((sum: number, tx: any) => sum + (tx.quantity * tx.price), 0)

    // Calculate monthly history (last 12 months)
    const monthlyHistory = []
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      
      const monthAmount = dividendTxns
        .filter((tx: any) => {
          const txDate = new Date(tx.date)
          return txDate.getFullYear() === date.getFullYear() && 
                 txDate.getMonth() === date.getMonth()
        })
        .reduce((sum: number, tx: any) => sum + (tx.quantity * tx.price), 0)

      monthlyHistory.push({
        month: monthNames[date.getMonth()],
        amount: monthAmount
      })
    }

    // Calculate top dividend stocks from portfolio
    const portfolioPositions: Record<string, any> = {}
    
    // Get all investment transactions to calculate positions
    txns.forEach((tx: any) => {
      if (tx.category === 'INVESTMENT') {
        if (!portfolioPositions[tx.symbol]) {
          portfolioPositions[tx.symbol] = {
            symbol: tx.symbol,
            name: tx.name,
            quantity: 0,
            totalDividends: 0
          }
        }

        if (tx.type === 'BUY') {
          portfolioPositions[tx.symbol].quantity += tx.quantity
        } else if (tx.type === 'SELL') {
          portfolioPositions[tx.symbol].quantity -= tx.quantity
        }
      }
    })

    // Add dividend data to positions
    dividendTxns.forEach((tx: any) => {
      if (portfolioPositions[tx.symbol]) {
        portfolioPositions[tx.symbol].totalDividends += (tx.quantity * tx.price)
        portfolioPositions[tx.symbol].lastDividend = tx.quantity // per share
      }
    })

    // Create top dividend stocks array
    const topDividendStocks = Object.values(portfolioPositions)
      .filter((pos: any) => pos.quantity > 0 && pos.totalDividends > 0)
      .map((pos: any) => ({
        symbol: pos.symbol,
        name: pos.name,
        shares: pos.quantity,
        annual: pos.totalDividends,
        yield: 0 // Would need stock prices to calculate
      }))
      .sort((a: any, b: any) => b.annual - a.annual)
      .slice(0, 4)

    const monthlyAverage = yearlyDividends / 12

    setRealDividendData({
      yearlyTotal: yearlyDividends,
      monthlyAverage,
      nextDividends: [], // Would need dividend calendar API
      monthlyHistory,
      topDividendStocks
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-theme-primary noise-bg">
      {/* Hero Header */}
      <div className="bg-theme-primary pt-32 pb-16 relative overflow-hidden">
        
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[300px] bg-green-500/2 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            
            {/* Title Section */}
            <div className="space-y-6">
              {/* Back Button */}
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-lg text-theme-secondary hover:text-theme-primary transition-all duration-200 hover:scale-105"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Zurück zum Portfolio
              </Link>
              
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-sm font-medium backdrop-blur-sm">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span>💎 Dividenden</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                  Passive
                </h1>
                <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-purple-400 to-green-300 bg-clip-text text-transparent">
                    Einnahmen
                  </span>
                </h2>
              </div>
              
              <p className="text-xl text-theme-secondary max-w-2xl leading-relaxed">
                Verfolge deine Dividenden-Erträge und kommende Ausschüttungen in Echtzeit.
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-3 bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-lg text-theme-primary focus:border-purple-500 focus:outline-none transition"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="all">Alle Jahre</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-8 relative">
        
        {/* KPI Cards with real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CurrencyEuroIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm text-theme-secondary mb-1">Jährliche Dividenden</h3>
                <p className="text-2xl font-bold text-theme-primary">
                  {formatCurrency(realDividendData.yearlyTotal)}
                </p>
                {realDividendData.yearlyTotal > 0 && (
                  <p className="text-xs text-green-400">📈 Aktives Jahr</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm text-theme-secondary mb-1">Monatlicher Durchschnitt</h3>
                <p className="text-2xl font-bold text-theme-primary">
                  {formatCurrency(realDividendData.monthlyAverage)}
                </p>
                <p className="text-xs text-theme-muted">Dieses Jahr</p>
              </div>
            </div>
          </div>

          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm text-theme-secondary mb-1">Dividenden-Aktien</h3>
                <p className="text-2xl font-bold text-theme-primary">{realDividendData.topDividendStocks.length}</p>
                <p className="text-xs text-theme-muted">Im Portfolio</p>
              </div>
            </div>
          </div>

          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <GiftIcon className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm text-theme-secondary mb-1">Letzter Monat</h3>
                <p className="text-2xl font-bold text-theme-primary">
                  {formatCurrency(realDividendData.monthlyHistory[realDividendData.monthlyHistory.length - 1]?.amount || 0)}
                </p>
                <p className="text-xs text-theme-muted">
                  {realDividendData.monthlyHistory[realDividendData.monthlyHistory.length - 1]?.month || 'Aug'} 2025
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* No Data State */}
        {realDividendData.yearlyTotal === 0 && (
          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-12 mb-12 text-center shadow-xl">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-semibold text-theme-primary mb-2">
              Noch keine Dividenden erfasst
            </h3>
            <p className="text-theme-secondary mb-6">
              Füge deine ersten Dividenden-Transaktionen hinzu, um deine passiven Einnahmen zu verfolgen.
            </p>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              Erste Dividende hinzufügen
            </Link>
          </div>
        )}

        {/* Charts Grid - only show if we have data */}
        {realDividendData.yearlyTotal > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              
              {/* Monthly Dividend Chart with real data */}
              <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">
                  Monatliche Dividenden {selectedPeriod}
                </h3>
                <div className="h-64">
                  <div className="flex items-end justify-between h-48 gap-2">
                    {realDividendData.monthlyHistory.map((month, index) => {
                      const maxAmount = Math.max(...realDividendData.monthlyHistory.map(m => m.amount))
                      const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm min-h-[4px]"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <div className="text-xs text-theme-muted mt-2">{month.month}</div>
                          <div className="text-xs text-theme-primary font-medium">
                            €{month.amount.toFixed(0)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Top Dividend Stocks with real data */}
              <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">
                  Top Dividenden-Aktien
                </h3>
                <div className="space-y-4">
                  {realDividendData.topDividendStocks.length > 0 ? (
                    realDividendData.topDividendStocks.map((stock, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-theme-tertiary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{stock.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-theme-primary">{stock.symbol}</div>
                            <div className="text-xs text-theme-muted">{stock.shares} Aktien</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-theme-primary">{formatCurrency(stock.annual)}</div>
                          <div className="text-xs text-purple-400">Gesamt-Dividenden</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-theme-muted">
                      <p>Noch keine Dividenden-Aktien im Portfolio</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dividend Timeline */}
            <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">
                Dividenden-Verlauf
              </h3>
              <div className="text-center py-12 text-theme-muted">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Detaillierter Dividenden-Kalender kommt bald...</p>
                <p className="text-sm mt-2">Füge mehr Dividenden-Transaktionen hinzu für bessere Insights</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}