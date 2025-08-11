'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BanknotesIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  CogIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import KPICards from './components/KPICards'
import PortfolioChart from './components/PortfolioChart'
import TransactionForm from './components/TransactionForm'
import TransactionTable from './components/TransactionTable'
import IncomeExpenseChart from './components/IncomeExpenseChart'
import AccountManagement from './components/AccountManagement'
import { Transaction, PortfolioData, PortfolioPosition } from './types/portfolio'

interface StockQuote {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  marketCap?: number
  pe?: number
}

export default function PortfolioDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showAccountManagement, setShowAccountManagement] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadPortfolioData()
  }, [])

  const loadPortfolioData = async () => {
    try {
      // Load from localStorage for now (later: API)
      const savedTransactions = localStorage.getItem('portfolio_transactions')
      if (savedTransactions) {
        const parsed = JSON.parse(savedTransactions)
        setTransactions(parsed)
        await calculatePortfolioData(parsed)
      } else {
        // Initialize with empty data
        setPortfolioData({
          totalValue: 0,
          totalInvested: 0,
          totalGainLoss: 0,
          gainLossPercent: 0,
          positions: [],
          monthlyIncome: 0,
          monthlyExpenses: 0,
          savingsRate: 0
        })
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch real stock quotes
  const fetchStockQuotes = async (symbols: string[]): Promise<StockQuote[]> => {
    if (symbols.length === 0) return []
    
    try {
      const response = await fetch('/api/portfolio/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      })
      
      if (!response.ok) {
        console.error('API error:', response.status)
        return []
      }
      
      const data = await response.json()
      return data.quotes || []
    } catch (error) {
      console.error('Error fetching stock quotes:', error)
      return []
    }
  }

  // 🔧 FIXED: Corrected calculation logic
  const calculatePortfolioData = async (txns: Transaction[]) => {
    // Group by asset
    const positions: Record<string, {
      symbol: string
      name: string
      quantity: number
      totalCost: number
    }> = {}

    // Calculate positions from transactions
    txns.forEach(tx => {
      if (tx.category === 'INVESTMENT') {
        if (!positions[tx.symbol]) {
          positions[tx.symbol] = {
            symbol: tx.symbol,
            name: tx.name,
            quantity: 0,
            totalCost: 0
          }
        }

        if (tx.type === 'BUY') {
          positions[tx.symbol].quantity += tx.quantity
          positions[tx.symbol].totalCost += tx.quantity * tx.price + tx.fees
        } else if (tx.type === 'SELL') {
          positions[tx.symbol].quantity -= tx.quantity
          positions[tx.symbol].totalCost -= tx.quantity * tx.price - tx.fees
        }
      }
    })

    // Filter out positions with zero quantity
    const activePositions = Object.values(positions).filter(p => p.quantity > 0)
    
    // Fetch current prices for all symbols
    const symbols = activePositions.map(p => p.symbol)
    const quotes = await fetchStockQuotes(symbols)
    
    // Create a map for quick lookup
    const quoteMap = new Map(quotes.map(q => [q.symbol, q]))

    // Convert to portfolio positions with current values
    const portfolioPositions: PortfolioPosition[] = activePositions.map(position => {
      const quote = quoteMap.get(position.symbol)
      
      // Use real price if available, otherwise fallback to average cost
      const avgCost = position.totalCost / position.quantity
      const currentPrice = quote?.price || avgCost
      const currentValue = position.quantity * currentPrice
      const gainLoss = currentValue - position.totalCost
      const gainLossPercent = position.totalCost > 0 ? (gainLoss / position.totalCost * 100) : 0

      return {
        symbol: position.symbol,
        name: position.name,
        quantity: position.quantity,
        totalCost: position.totalCost,
        currentValue: currentValue,
        currentPrice: currentPrice,
        gainLoss: gainLoss,
        gainLossPercent: gainLossPercent
      }
    })

    // Calculate totals
    const totalInvested = portfolioPositions.reduce((sum, p) => sum + p.totalCost, 0)
    const totalValue = portfolioPositions.reduce((sum, p) => sum + p.currentValue, 0)
    const totalGainLoss = totalValue - totalInvested

    // 🔧 FIX: Better income/expense calculation
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    // ✅ ALL income (INCOME + DIVIDEND)
    const incomeData = txns
      .filter(tx => {
        const txDate = new Date(tx.date)
        return (tx.category === 'INCOME' || tx.type === 'DIVIDEND') && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear
      })
      .reduce((sum, tx) => sum + (tx.quantity * tx.price), 0)
    
    // ✅ Only real expenses (EXPENSE)
    const expenseData = txns
      .filter(tx => {
        const txDate = new Date(tx.date)
        return tx.category === 'EXPENSE' && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear
      })
      .reduce((sum, tx) => sum + (tx.quantity * tx.price), 0)

    // 🔧 FIX: Calculate investments separately
    const investmentData = txns
      .filter(tx => {
        const txDate = new Date(tx.date)
        return tx.type === 'BUY' && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear
      })
      .reduce((sum, tx) => sum + (tx.quantity * tx.price + tx.fees), 0)

    // 🔧 FIX: Savings rate = Investments / Income (only INCOME, not DIVIDEND)
    const realIncomeOnly = txns
      .filter(tx => {
        const txDate = new Date(tx.date)
        return tx.category === 'INCOME' && // Only INCOME, not DIVIDEND
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear
      })
      .reduce((sum, tx) => sum + (tx.quantity * tx.price), 0)

    const savingsRate = realIncomeOnly > 0 ? (investmentData / realIncomeOnly * 100) : 0

    // Debug logging
    console.log('💰 Income calculation:', {
      totalIncome: incomeData,
      realIncomeOnly: realIncomeOnly,
      expenses: expenseData,
      investments: investmentData,
      savingsRate: savingsRate.toFixed(1) + '%'
    })

    setPortfolioData({
      totalValue,
      totalInvested,
      totalGainLoss,
      gainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested * 100) : 0,
      positions: portfolioPositions,
      monthlyIncome: incomeData, // ✅ Now includes dividends
      monthlyExpenses: expenseData,
      savingsRate // ✅ Now correctly calculated: Investments/Income
    })

    // Update timestamp
    setLastUpdate(new Date())
  }
  
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString()
    }
  
    const updatedTransactions = [...transactions, newTransaction]
    setTransactions(updatedTransactions)
    
    localStorage.setItem('portfolio_transactions', JSON.stringify(updatedTransactions))
    
    await calculatePortfolioData(updatedTransactions)
    setShowTransactionForm(false)
  }

  const deleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== id)
    setTransactions(updatedTransactions)
    localStorage.setItem('portfolio_transactions', JSON.stringify(updatedTransactions))
    await calculatePortfolioData(updatedTransactions)
  }

  // Manual refresh function
  const refreshPortfolio = async () => {
    if (updating) return
    
    setUpdating(true)
    try {
      await calculatePortfolioData(transactions)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-theme-secondary">Portfolio wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary noise-bg">
      {/* Hero Header Section */}
      <div className="bg-theme-primary pt-32 pb-16 relative overflow-hidden">
        
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[300px] bg-green-500/2 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            
            {/* Title Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Portfolio</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                  Dein Portfolio
                </h1>
                <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                    Dashboard
                  </span>
                </h2>
              </div>
              
              <p className="text-xl text-theme-secondary max-w-2xl leading-relaxed">
                Verwalte deine Finanzen professionell mit Echtzeit-Kursen und detaillierten Analysen.
              </p>
              
              {/* Last Update Info */}
              {lastUpdate && (
                <div className="flex items-center gap-2 text-theme-muted text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Letzte Aktualisierung: {lastUpdate.toLocaleTimeString('de-DE')}</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-fit">
              <button
                onClick={refreshPortfolio}
                disabled={updating}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600/90 hover:bg-blue-500 disabled:bg-blue-800/50 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-blue-500/20 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
              >
                <ArrowPathIcon className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                {updating ? 'Aktualisiere...' : 'Kurse aktualisieren'}
              </button>
              
              <button
                onClick={() => setShowAccountManagement(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600/90 hover:bg-gray-500 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-gray-500/20 hover:scale-105 shadow-lg"
              >
                <CogIcon className="w-4 h-4" />
                Konten verwalten
              </button>
              
              <Link
                href="/dividends"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600/90 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-purple-500/20 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                <span>💎</span>
                Dividenden
              </Link>
              
              <button
                onClick={() => setShowTransactionForm(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                <PlusIcon className="w-5 h-5" />
                Transaktion hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-8 relative">
        
        {/* KPI Cards with improved styling */}
        <div className="mb-12">
          <KPICards data={portfolioData} />
        </div>

        {/* Portfolio Positions with Premium Styling */}
        {portfolioData && portfolioData.positions.length > 0 && (
          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl p-8 mb-12 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-theme-primary mb-2">
                  Aktuelle Positionen
                </h3>
                <p className="text-theme-secondary">
                  {portfolioData.positions.length} Positionen • Gesamtwert: €{portfolioData.totalValue.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${portfolioData.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioData.totalGainLoss >= 0 ? '+' : ''}€{portfolioData.totalGainLoss.toFixed(2)}
                </div>
                <div className="text-sm text-theme-muted">
                  ({portfolioData.gainLossPercent >= 0 ? '+' : ''}{portfolioData.gainLossPercent.toFixed(1)}%)
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-hover/50">
                    <th className="text-left py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Symbol</th>
                    <th className="text-left py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Name</th>
                    <th className="text-right py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Anzahl</th>
                    <th className="text-right py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Ø Einkauf</th>
                    <th className="text-right py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Aktuell</th>
                    <th className="text-right py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Marktwert</th>
                    <th className="text-right py-4 text-theme-secondary text-sm font-semibold uppercase tracking-wide">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.positions.map((position, index) => (
                    <tr key={position.symbol} className="border-b border-theme-hover/30 hover:bg-theme-tertiary/50 transition-all duration-200 group">
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-400 rounded-lg flex items-center justify-center">
                            <span className="text-black font-bold text-sm">{position.symbol.slice(0, 2)}</span>
                          </div>
                          <div className="font-bold text-theme-primary text-lg">{position.symbol}</div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="text-theme-secondary max-w-48 truncate">{position.name}</div>
                      </td>
                      <td className="py-5 text-right">
                        <div className="text-theme-primary font-medium">{position.quantity.toFixed(3)}</div>
                      </td>
                      <td className="py-5 text-right">
                        <div className="text-theme-primary font-mono">
                          €{(position.totalCost / position.quantity).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <div className="text-theme-primary font-bold font-mono">
                          €{position.currentPrice.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <div className="text-theme-primary font-bold text-lg font-mono">
                          €{position.currentValue.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <div className={`flex items-center justify-end gap-2 ${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <div className="text-right">
                            <div className="font-bold font-mono">
                              {position.gainLoss >= 0 ? '+' : ''}€{position.gainLoss.toFixed(2)}
                            </div>
                            <div className="text-sm opacity-80">
                              ({position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent.toFixed(1)}%)
                            </div>
                          </div>
                          {position.gainLoss >= 0 ? (
                            <ArrowUpIcon className="w-5 h-5" />
                          ) : (
                            <ArrowDownIcon className="w-5 h-5" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts Grid with improved styling */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl shadow-xl overflow-hidden">
            <PortfolioChart data={portfolioData} />
          </div>
          <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl shadow-xl overflow-hidden">
            <IncomeExpenseChart data={portfolioData} transactions={transactions} />
          </div>
        </div>

        {/* Transactions Table with improved styling */}
        <div className="bg-theme-card/80 backdrop-blur-sm border border-theme-hover rounded-xl shadow-xl overflow-hidden">
          <TransactionTable 
            transactions={transactions} 
            onDeleteTransaction={deleteTransaction}
          />
        </div>

        {/* Modals */}
        {showTransactionForm && (
          <TransactionForm
            onSubmit={addTransaction}
            onCancel={() => setShowTransactionForm(false)}
          />
        )}

        {showAccountManagement && (
          <AccountManagement
            onClose={() => setShowAccountManagement(false)}
          />
        )}
      </div>
    </div>
  )
}