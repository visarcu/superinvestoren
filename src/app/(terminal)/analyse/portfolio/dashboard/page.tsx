// src/app/analyse/portfolio/dashboard/page.tsx - VOLLSTÄNDIG OPTIMIERTE VERSION
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotes } from '@/lib/fmp'
import { useCurrency } from '@/lib/CurrencyContext'
import { getEURRate, calculateGainLoss, currencyManager } from '@/lib/portfolioCurrency'
import PortfolioCalendar from '@/components/PortfolioCalendar'
import PortfolioDividends from '@/components/PortfolioDividends'
import PortfolioHistory from '@/components/PortfolioHistory'
import PortfolioBreakdownsDE from '@/components/PortfolioBreakdownsDE'
import PortfolioAllocationChart from '@/components/PortfolioAllocationChart'
import SearchTickerInput from '@/components/SearchTickerInput'
import { stocks } from '@/data/stocks'
import {
  BriefcaseIcon,
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  NewspaperIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  CheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

// Types
interface Portfolio {
  id: string
  name: string
  currency: string
  cash_position: number
  created_at: string
}

interface Holding {
  id: string
  symbol: string
  name: string
  quantity: number
  purchase_price: number
  purchase_price_display: number
  current_price: number
  current_price_display: number
  purchase_date: string
  value: number
  gain_loss: number
  gain_loss_percent: number
  purchase_currency?: string
  purchase_exchange_rate?: number
  purchase_price_original?: number
  current_exchange_rate?: number
  currency_aware?: boolean
  superinvestors?: {
    count: number
    investors: Array<{
      investor: string
      investorName: string
      portfolioPercentage: number
    }>
  }
}

interface NewsArticle {
  title: string
  url: string
  publishedDate: string
  text: string
  image: string
  site: string
  symbol: string
}

// Skeleton Components for Loading
const SkeletonCard = () => (
  <div className="bg-theme-card rounded-xl p-4 border border-theme/10 animate-pulse">
    <div className="h-4 bg-theme-secondary/30 rounded w-24 mb-2"></div>
    <div className="h-8 bg-theme-secondary/30 rounded w-32"></div>
  </div>
)

const SkeletonRow = () => (
  <tr className="border-t border-theme/10 animate-pulse">
    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-theme-secondary/30 rounded-lg"></div>
        <div>
          <div className="h-4 bg-theme-secondary/30 rounded w-16 mb-1"></div>
          <div className="h-3 bg-theme-secondary/30 rounded w-24"></div>
        </div>
      </div>
    </td>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-theme-secondary/30 rounded w-16 mx-auto"></div>
      </td>
    ))}
  </tr>
)

// Mobile Card View Component
const MobileHoldingCard = ({ holding, onView, onEdit, onDelete, formatCurrency, formatStockPrice, formatPercentage, totalValue }: any) => (
  <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-green-400">
            {holding.symbol.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-bold text-theme-primary">{holding.symbol}</p>
          <p className="text-xs text-theme-muted">{holding.quantity} Stück</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-theme-primary">
          {formatCurrency(holding.value)}
        </p>
        <p className={`text-xs ${holding.gain_loss_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatPercentage(holding.gain_loss_percent)}
        </p>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
      <div>
        <p className="text-theme-muted">Kaufpreis</p>
        <p className="text-theme-primary font-semibold">{formatStockPrice(holding.purchase_price_display)}</p>
      </div>
      <div>
        <p className="text-theme-muted">Aktuell</p>
        <p className="text-theme-primary font-semibold">{formatStockPrice(holding.current_price_display)}</p>
      </div>
    </div>

    {holding.superinvestors && holding.superinvestors.count > 0 && (
      <div className="flex items-center justify-center mb-3 py-2 bg-green-500/10 rounded-lg">
        <span className="text-xs text-green-400">
          {holding.superinvestors.count} Superinvestoren
        </span>
      </div>
    )}

    <div className="flex gap-2">
      <button onClick={() => onView(holding.symbol)} className="flex-1 p-2 bg-theme-secondary/30 rounded-lg">
        <EyeIcon className="w-4 h-4 mx-auto text-theme-secondary" />
      </button>
      <button onClick={() => onEdit(holding)} className="flex-1 p-2 bg-blue-400/20 rounded-lg">
        <PencilIcon className="w-4 h-4 mx-auto text-blue-400" />
      </button>
      <button onClick={() => onDelete(holding.id)} className="flex-1 p-2 bg-red-400/20 rounded-lg">
        <XMarkIcon className="w-4 h-4 mx-auto text-red-400" />
      </button>
    </div>
  </div>
)

export default function PortfolioDashboard() {
  const router = useRouter()
  const { currency, setCurrency, formatCurrency, formatStockPrice, formatPercentage } = useCurrency()
  
  // Core State
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [holdingsLoading, setHoldingsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'calendar' | 'dividends' | 'insights' | 'history'>('overview')
  const [editingPosition, setEditingPosition] = useState<Holding | null>(null)
  const [showSuperinvestorsModal, setShowSuperinvestorsModal] = useState<Holding | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // News State
  const [portfolioNews, setPortfolioNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState(false)
  
  // Currency State
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [lastCurrencyUpdate, setLastCurrencyUpdate] = useState<Date | null>(null)
  
  // Add Position Form State
  const [newSymbol, setNewSymbol] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [newPurchasePrice, setNewPurchasePrice] = useState('')
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [addingPosition, setAddingPosition] = useState(false)
  const [positionType, setPositionType] = useState<'stock' | 'cash'>('stock')
  const [cashAmount, setCashAmount] = useState('')
  const [transactionFees, setTransactionFees] = useState('')
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string} | null>(null)
  
  // Portfolio Metrics
  const [totalValue, setTotalValue] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0)
  const [activeInvestments, setActiveInvestments] = useState(0)
  const [cashPositionDisplay, setCashPositionDisplay] = useState(0)

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Force EUR for German portfolio app
  useEffect(() => {
    setCurrency('EUR')
  }, [])

  // Initial load with staggered requests
  useEffect(() => {
    const initLoad = async () => {
      await loadPortfolio()
      // Delay exchange rate to reduce initial load
      setTimeout(() => loadExchangeRate(), 500)
    }
    initLoad()
  }, [])

  // Reload when currency changes
  useEffect(() => {
    if (portfolio?.id) {
      loadPortfolio()
    }
  }, [currency])

  // Lazy load news when tab is selected
  useEffect(() => {
    if (activeTab === 'news' && holdings.length > 0 && portfolioNews.length === 0 && !newsError) {
      loadPortfolioNews()
    }
  }, [activeTab, holdings])

  // Core Functions with Error Recovery
  const loadExchangeRate = async () => {
    setCurrencyLoading(true)
    try {
      const rate = await currencyManager.getCurrentUSDtoEURRate()
      setExchangeRate(rate)
      setLastCurrencyUpdate(new Date())
    } catch (error) {
      console.error('Error loading exchange rate:', error)
      setExchangeRate(null)
      // Don't fail the whole app for exchange rate
    } finally {
      setCurrencyLoading(false)
    }
  }

  const loadPortfolio = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // VEREINFACHT: Jeder User hat genau ein Portfolio
      // Lade existierendes oder erstelle automatisch ein neues
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)

      let portfolioData = portfolios?.[0]

      // Wenn kein Portfolio existiert, automatisch erstellen
      if (!portfolioData) {
        const { data: newPortfolio, error: createError } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            name: 'Mein Portfolio',
            currency: 'EUR',
            cash_position: 0,
            is_default: true
          })
          .select()
          .single()

        if (createError) throw createError
        portfolioData = newPortfolio
      }

      setPortfolio(portfolioData)
      loadHoldings(portfolioData.id)
      setCashPositionDisplay(portfolioData.cash_position || 0)

    } catch (error: any) {
      console.error('Error loading portfolio:', error)
      setError(error.message || 'Fehler beim Laden des Portfolios')
    } finally {
      setLoading(false)
    }
  }

  const loadHoldings = async (portfolioId: string, showLoadingState = true) => {
    if (showLoadingState) setHoldingsLoading(true)
    
    try {
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)

      if (holdingsError) throw holdingsError

      let enrichedHoldings: Holding[] = []
      
      if (holdingsData && holdingsData.length > 0) {
        const symbols = holdingsData.map(h => h.symbol)
        
        // Try to get current prices with fallback
        let currentPricesUSD: Record<string, number> = {}
        try {
          currentPricesUSD = await getBulkQuotes(symbols)
        } catch (priceError) {
          console.error('Error fetching prices, using purchase prices as fallback:', priceError)
          // Fallback: use purchase prices
          holdingsData.forEach(h => {
            currentPricesUSD[h.symbol] = h.purchase_price || 0
          })
        }
        
        const holdingsWithCurrentPrices = holdingsData.map(holding => ({
          ...holding,
          current_price: currentPricesUSD[holding.symbol] || holding.purchase_price || 0
        }))

        // Convert for display
        const convertedHoldings = await currencyManager.convertHoldingsForDisplay(
          holdingsWithCurrentPrices,
          currency as 'USD' | 'EUR',
          true
        )
        
        enrichedHoldings = convertedHoldings.map(holding => {
          const currentPrice = holding.current_price_display || 0
          const purchasePrice = holding.purchase_price_display || 0
          const quantity = holding.quantity || 0
          const value = currentPrice * quantity
          const costBasis = purchasePrice * quantity
          const gainLoss = value - costBasis
          const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
          
          return {
            ...holding,
            value,
            gain_loss: gainLoss,
            gain_loss_percent: gainLossPercent
          }
        })

        // Load superinvestors in batches (not all at once)
        enrichedHoldings = await loadSuperinvestorsInBatches(enrichedHoldings)
      }

      setHoldings(enrichedHoldings)
      calculateMetrics(enrichedHoldings, portfolio?.cash_position || 0)
      
    } catch (error) {
      console.error('Error loading holdings:', error)
      // Don't crash, just show empty holdings
      setHoldings([])
    } finally {
      setHoldingsLoading(false)
    }
  }

  // Batch load superinvestors to avoid overwhelming the API
  const loadSuperinvestorsInBatches = async (holdings: Holding[], batchSize = 3) => {
    const results = [...holdings]
    
    for (let i = 0; i < holdings.length; i += batchSize) {
      const batch = holdings.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (holding, idx) => {
          try {
            const symbolMapping: { [key: string]: string } = {
              'BOOKING': 'BKNG',
              'ALPHABET': 'GOOGL',
              'META': 'META',
              'TESLA': 'TSLA'
            }
            
            const correctSymbol = symbolMapping[holding.symbol] || holding.symbol
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
            const response = await fetch(`${baseUrl}/api/stocks/${correctSymbol}/super-investors`)

            if (response.ok) {
              const data = await response.json()
              results[i + idx] = {
                ...holding,
                superinvestors: {
                  count: data.summary?.totalInvestors || 0,
                  investors: data.positions?.slice(0, 3).map((pos: any) => ({
                    investor: pos.investor.slug,
                    investorName: pos.investor.name,
                    portfolioPercentage: pos.position.portfolioPercentage
                  })) || []
                }
              }
            }
          } catch (error) {
            console.error(`Error loading superinvestors for ${holding.symbol}:`, error)
          }
        })
      )
    }
    
    return results
  }

  const loadPortfolioNews = async () => {
    setNewsLoading(true)
    setNewsError(false)
    
    try {
      const symbols = holdings.slice(0, 5).map(h => h.symbol)
      
      if (symbols.length === 0) {
        setPortfolioNews([])
        return
      }

      const response = await fetch('/api/portfolio-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      })
      
      if (response.ok) {
        const data = await response.json()
        setPortfolioNews(data.news?.slice(0, 20) || [])
      } else {
        throw new Error('Failed to load news')
      }
      
    } catch (error) {
      console.error('Error loading portfolio news:', error)
      setNewsError(true)
      setPortfolioNews([])
    } finally {
      setNewsLoading(false)
    }
  }

  const calculateMetrics = useCallback((holdings: Holding[], cashPosition: number) => {
    const stockValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0)
    const stockCost = holdings.reduce((sum, h) => 
      sum + ((h.purchase_price_display || 0) * (h.quantity || 0)), 0)
    
    setTotalValue(stockValue + cashPosition)
    setTotalInvested(stockCost)
    setTotalGainLoss(stockValue - stockCost)
    setTotalGainLossPercent(stockCost > 0 ? ((stockValue - stockCost) / stockCost) * 100 : 0)
    setActiveInvestments(holdings.length)
  }, [])

  const refreshPrices = async () => {
    setRefreshing(true)
    await Promise.all([
      loadHoldings(portfolio?.id || '', false),
      loadExchangeRate()
    ])
    setRefreshing(false)
  }

  // Export functions
  const exportToCSV = () => {
    const headers = ['Symbol', 'Name', 'Quantity', 'Purchase Price', 'Current Price', 'Value', 'Gain/Loss', 'Gain/Loss %']
    const rows = holdings.map(h => [
      h.symbol,
      h.name,
      h.quantity,
      h.purchase_price_display,
      h.current_price_display,
      h.value,
      h.gain_loss,
      h.gain_loss_percent
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_${portfolio?.name}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Form Handlers
  const handleAddPosition = async () => {
    if (positionType === 'stock') {
      if (!selectedStock || !newQuantity || !newPurchasePrice) {
        alert('Bitte alle Felder ausfüllen')
        return
      }
    } else if (positionType === 'cash') {
      if (!cashAmount) {
        alert('Bitte Cash-Betrag eingeben')
        return
      }
    }

    setAddingPosition(true)
    
    try {
      if (positionType === 'stock') {
        // VEREINFACHT: Direkt EUR speichern - keine Konvertierung!
        const basePrice = parseFloat(newPurchasePrice)
        const fees = parseFloat(transactionFees) || 0
        const quantity = parseFloat(newQuantity)
        const priceIncludingFees = basePrice + (fees / quantity)

        const { error } = await supabase
          .from('portfolio_holdings')
          .insert({
            portfolio_id: portfolio?.id,
            symbol: selectedStock?.symbol,
            name: selectedStock?.name,
            quantity: quantity,
            purchase_price: priceIncludingFees,  // Direkt EUR!
            purchase_date: newPurchaseDate,
            purchase_currency: 'EUR'              // Immer EUR
          })

        if (error) throw error
      } else {
        const cashAmountEUR = parseFloat(cashAmount)
        const newCashPosition = (portfolio?.cash_position || 0) + cashAmountEUR

        const { error } = await supabase
          .from('portfolios')
          .update({ cash_position: newCashPosition })
          .eq('id', portfolio?.id)

        if (error) throw error
      }

      resetAddPositionForm()
      await loadPortfolio()
      
    } catch (error: any) {
      console.error('Error adding position:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setAddingPosition(false)
    }
  }

  const handleUpdatePosition = async () => {
    if (!editingPosition) return

    setRefreshing(true)
    try {
      // VEREINFACHT: Direkt EUR speichern - keine Konvertierung!
      const { error } = await supabase
        .from('portfolio_holdings')
        .update({
          quantity: parseFloat(newQuantity) || editingPosition.quantity,
          purchase_price: parseFloat(newPurchasePrice) || editingPosition.purchase_price,
          purchase_date: newPurchaseDate || editingPosition.purchase_date,
          purchase_currency: 'EUR'
        })
        .eq('id', editingPosition.id)

      if (error) throw error

      setEditingPosition(null)
      setNewQuantity('')
      setNewPurchasePrice('')
      setNewPurchaseDate(new Date().toISOString().split('T')[0])
      await loadPortfolio()

    } catch (error: any) {
      console.error('Error updating position:', error)
      alert(`Fehler beim Aktualisieren: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const resetAddPositionForm = () => {
    setSelectedStock(null)
    setNewQuantity('')
    setNewPurchasePrice('')
    setNewPurchaseDate(new Date().toISOString().split('T')[0])
    setCashAmount('')
    setPositionType('stock')
    setTransactionFees('')
    setShowAddPosition(false)
  }

  const handleViewStock = (symbol: string) => {
    router.push(`/analyse/stocks/${symbol.toLowerCase()}`)
  }

  const handleDeletePosition = async (holdingId: string) => {
    if (!confirm('Position wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', holdingId)

      if (error) throw error
      await loadHoldings(portfolio?.id || '')
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Fehler beim Löschen der Position')
    }
  }

  const openEditModal = (holding: Holding) => {
    setEditingPosition(holding)
    setNewQuantity(holding.quantity.toString())
    setNewPurchasePrice(holding.purchase_price_display?.toString() || holding.purchase_price.toString())
    setNewPurchaseDate(holding.purchase_date)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Vor wenigen Minuten'
    if (diffHours < 24) return `Vor ${diffHours} Stunden`
    if (diffHours < 48) return 'Gestern'
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-theme-secondary/30 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Fehler beim Laden</h2>
          <p className="text-theme-secondary mb-4">{error}</p>
          <button
            onClick={() => loadPortfolio()}
            className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zum Dashboard
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
                <BriefcaseIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">
                  Portfolio Dashboard
                </h1>
                <p className="text-sm text-theme-muted mt-1">
                  Verwalten Sie Ihre Investments
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="p-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme/10 rounded-lg transition-colors"
                title="Export CSV"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-theme-secondary" />
              </button>
              
              <button
                onClick={refreshPrices}
                disabled={refreshing}
                className="p-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme/10 rounded-lg transition-colors disabled:opacity-50"
                title="Kurse aktualisieren"
              >
                <ArrowPathIcon className={`w-5 h-5 text-theme-secondary ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-6 lg:px-8 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Portfolio Wert</p>
            <p className="text-xl lg:text-2xl font-bold text-theme-primary">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-theme-muted mt-1">
              inkl. {formatCurrency(cashPositionDisplay)} Cash
            </p>
          </div>

          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Cash Position</p>
            <p className="text-xl lg:text-2xl font-bold text-theme-primary">
              {formatCurrency(cashPositionDisplay)}
            </p>
            <p className="text-xs text-theme-muted mt-1">
              {totalValue > 0 ? formatPercentage((cashPositionDisplay / totalValue) * 100, false) : '0%'} des Portfolios
            </p>
          </div>

          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Rendite</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl lg:text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalGainLoss >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalGainLoss))}
              </p>
              {totalGainLoss >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
              )}
            </div>
            <p className={`text-xs mt-1 ${totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercentage(totalGainLossPercent)} All-time
            </p>
          </div>

          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Investments</p>
            <p className="text-xl lg:text-2xl font-bold text-theme-primary">
              {activeInvestments}
            </p>
            <p className="text-xs text-theme-muted mt-1">Positionen</p>
          </div>
        </div>

        {/* Exchange Rate Info */}
        {exchangeRate && (
          <div className="bg-theme-card/50 rounded-lg p-2 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-theme-muted">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Wechselkurs: 1 USD = {exchangeRate.toFixed(4)} EUR</span>
              {lastCurrencyUpdate && (
                <span>• Stand: {lastCurrencyUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            <button
              onClick={loadExchangeRate}
              disabled={currencyLoading}
              className="text-green-400 hover:text-green-300 text-xs"
            >
              {currencyLoading ? 'Lade...' : 'Aktualisieren'}
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 lg:gap-6 border-b border-theme/10 mb-6 overflow-x-auto">
          {[
            { key: 'overview', label: 'Übersicht', icon: null },
            { key: 'news', label: 'News', icon: NewspaperIcon },
            { key: 'calendar', label: 'Kalender', icon: CalendarIcon },
            { key: 'dividends', label: 'Dividenden', icon: CurrencyDollarIcon },
            { key: 'insights', label: 'Insights', icon: ChartBarIcon },
            { key: 'history', label: 'Historie', icon: ClockIcon }
          ].map(tab => (
            <button 
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 px-1 font-medium whitespace-nowrap transition-colors flex items-center gap-2 text-sm lg:text-base ${
                activeTab === tab.key 
                  ? 'text-green-400 border-b-2 border-green-400' 
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Asset Allocation Chart */}
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PortfolioAllocationChart 
                    holdings={holdings.map(h => ({
                      symbol: h.symbol,
                      name: h.name,
                      value: h.value,
                      quantity: h.quantity
                    }))}
                    totalValue={totalValue}
                    cashPosition={cashPositionDisplay}
                    activeInvestments={activeInvestments}
                  />
                </div>

                <div className="space-y-4">
                  <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
                    <h4 className="font-semibold text-theme-primary mb-3 text-sm">
                      Top Positionen
                    </h4>
                    <div className="space-y-3">
                      {holdings
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5)
                        .map((holding, index) => {
                          const percentage = totalValue > 0 ? (holding.value / totalValue) * 100 : 0
                          return (
                            <div key={holding.symbol} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-theme-secondary rounded flex items-center justify-center">
                                  <span className="text-xs font-bold text-green-400">
                                    {index + 1}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-theme-primary text-xs">
                                    {holding.symbol}
                                  </p>
                                  <p className="text-xs text-theme-muted">
                                    {formatCurrency(holding.value)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-medium text-theme-secondary">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                  
                  <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
                    <h4 className="font-semibold text-theme-primary mb-3 text-sm">
                      Portfolio Diversifikation
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-theme-secondary">Positionen</span>
                        <span className="text-sm font-semibold text-theme-primary">
                          {activeInvestments}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-theme-secondary">Cash %</span>
                        <span className="text-sm font-semibold text-theme-primary">
                          {totalValue > 0 ? ((cashPositionDisplay / totalValue) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-theme-secondary">Größte Position</span>
                        <span className="text-sm font-semibold text-theme-primary">
                          {holdings.length > 0 
                            ? ((Math.max(...holdings.map(h => h.value)) / totalValue) * 100).toFixed(1) + '%'
                            : '0.0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Holdings Table or Cards */}
            <div className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden">
              <div className="p-4 border-b border-theme/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-theme-primary">Ihre Positionen</h2>
                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-theme-secondary/30 rounded-lg p-1">
                    <button
                      onClick={() => setIsMobile(false)}
                      className={`p-1.5 rounded ${!isMobile ? 'bg-theme-card' : ''}`}
                      title="Tabelle"
                    >
                      <ComputerDesktopIcon className="w-4 h-4 text-theme-secondary" />
                    </button>
                    <button
                      onClick={() => setIsMobile(true)}
                      className={`p-1.5 rounded ${isMobile ? 'bg-theme-card' : ''}`}
                      title="Karten"
                    >
                      <DevicePhoneMobileIcon className="w-4 h-4 text-theme-secondary" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setShowAddPosition(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden lg:inline">Position hinzufügen</span>
                  </button>
                </div>
              </div>

              {holdingsLoading ? (
                <div className="p-4">
                  {isMobile ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-theme-secondary/30 rounded-xl p-4 animate-pulse">
                          <div className="h-4 bg-theme-secondary/50 rounded w-24 mb-2"></div>
                          <div className="h-6 bg-theme-secondary/50 rounded w-32"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table className="w-full">
                      <tbody>
                        {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : holdings.length > 0 ? (
                isMobile ? (
                  <div className="p-4 space-y-4">
                    {holdings.map(holding => (
                      <MobileHoldingCard
                        key={holding.id}
                        holding={holding}
                        onView={handleViewStock}
                        onEdit={openEditModal}
                        onDelete={handleDeletePosition}
                        formatCurrency={formatCurrency}
                        formatStockPrice={formatStockPrice}
                        formatPercentage={formatPercentage}
                        totalValue={totalValue}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-theme-secondary/30">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-medium text-theme-secondary">Symbol</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Anzahl</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Kaufpreis</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Aktueller Preis</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Wert</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Gewinn/Verlust</th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-theme-secondary">Superinvestoren</th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-theme-secondary">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((holding) => {
                          const currentPrice = holding.current_price_display || 0
                          const purchasePrice = holding.purchase_price_display || 0
                          const dayChange = currentPrice - purchasePrice
                          const dayChangePercent = purchasePrice > 0 
                            ? (dayChange / purchasePrice) * 100 
                            : 0
                          
                          return (
                            <tr key={holding.id} className="border-t border-theme/10 hover:bg-theme-secondary/10 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
                                    <span className="text-xs font-bold text-green-400">
                                      {holding.symbol.slice(0, 2)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-bold text-theme-primary">{holding.symbol}</p>
                                    <p className="text-xs text-theme-muted truncate max-w-[150px]">{holding.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="text-right px-4 py-4">
                                <p className="font-semibold text-theme-primary">
                                  {holding.quantity.toLocaleString('de-DE')}
                                </p>
                              </td>
                              <td className="text-right px-4 py-4">
                                <p className="font-semibold text-theme-primary">
                                  {formatStockPrice(holding.purchase_price_display)}
                                </p>
                              </td>
                              <td className="text-right px-4 py-4">
                                <p className="font-semibold text-theme-primary">
                                  {formatStockPrice(holding.current_price_display)}
                                </p>
                                <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${dayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {dayChangePercent >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-3 h-3" />
                                  ) : (
                                    <ArrowTrendingDownIcon className="w-3 h-3" />
                                  )}
                                  <span>{formatPercentage(dayChangePercent)}</span>
                                </div>
                              </td>
                              <td className="text-right px-4 py-4">
                                <p className="font-bold text-lg text-theme-primary">
                                  {formatCurrency(holding.value)}
                                </p>
                                <p className="text-xs text-theme-muted">
                                  {totalValue > 0 ? formatPercentage((holding.value / totalValue) * 100, false) : '0%'}
                                </p>
                              </td>
                              <td className="text-right px-4 py-4">
                                <div className={`inline-flex flex-col items-end px-3 py-2 rounded-lg ${
                                  holding.gain_loss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`}>
                                  <p className={`font-bold text-sm ${holding.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {holding.gain_loss >= 0 ? '+' : '-'}{formatCurrency(Math.abs(holding.gain_loss))}
                                  </p>
                                  <p className={`text-xs font-medium ${holding.gain_loss_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatPercentage(holding.gain_loss_percent)}
                                  </p>
                                </div>
                              </td>
                              <td className="text-center px-4 py-4">
                                {holding.superinvestors && holding.superinvestors.count > 0 ? (
                                  <button
                                    onClick={() => setShowSuperinvestorsModal(holding)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-all cursor-pointer"
                                  >
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-bold text-white">
                                        {holding.superinvestors.count}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium text-green-600">
                                      Investoren
                                    </span>
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center px-3 py-1.5 bg-theme-secondary/30 rounded-lg">
                                    <span className="text-xs text-theme-muted">
                                      Keine Daten
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => handleViewStock(holding.symbol)}
                                    className="p-2 hover:bg-theme-secondary/30 rounded-lg transition-colors"
                                    title="Aktie analysieren"
                                  >
                                    <EyeIcon className="w-4 h-4 text-theme-secondary" />
                                  </button>
                                  <button 
                                    onClick={() => openEditModal(holding)}
                                    className="p-2 hover:bg-blue-400/20 rounded-lg transition-colors"
                                    title="Position bearbeiten"
                                  >
                                    <PencilIcon className="w-4 h-4 text-blue-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePosition(holding.id)}
                                    className="p-2 hover:bg-red-400/20 rounded-lg transition-colors"
                                    title="Position löschen"
                                  >
                                    <XMarkIcon className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="p-12 text-center">
                  <ChartBarIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
                  <p className="text-theme-secondary mb-4">Noch keine Positionen vorhanden</p>
                  <button 
                    onClick={() => setShowAddPosition(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Erste Position hinzufügen
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Other Tabs remain the same */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {newsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin mx-auto mb-3" />
                  <p className="text-theme-secondary">Lade Portfolio News...</p>
                </div>
              </div>
            ) : newsError ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-theme-secondary mb-2">Fehler beim Laden der News</p>
                <button
                  onClick={loadPortfolioNews}
                  className="text-green-400 hover:text-green-300 text-sm"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : portfolioNews.length > 0 ? (
              portfolioNews.map((article, index) => (
                <article 
                  key={`${article.url}-${index}`}
                  className="bg-theme-card rounded-xl p-6 border border-theme/10 hover:bg-theme-secondary/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                          {article.symbol}
                        </span>
                        <span className="text-xs text-theme-muted flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(article.publishedDate)}
                        </span>
                        <span className="text-xs text-theme-muted">
                          {article.site}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-theme-primary mb-2 leading-tight">
                        {article.title}
                      </h3>
                      <p className="text-theme-secondary text-sm leading-relaxed line-clamp-3">
                        {article.text}
                      </p>
                    </div>
                    {article.image && (
                      <img 
                        src={article.image} 
                        alt=""
                        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-theme/10">
                    <Link
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors text-sm"
                    >
                      <span>Artikel lesen</span>
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </Link>
                    <Link
                      href={`/analyse/stocks/${article.symbol.toLowerCase()}`}
                      className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors text-sm"
                    >
                      <EyeIcon className="w-3 h-3" />
                      <span>{article.symbol} analysieren</span>
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="text-center py-12">
                <NewspaperIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
                <p className="text-theme-secondary mb-2">Keine News verfügbar</p>
                <p className="text-theme-muted text-sm">
                  Fügen Sie Positionen hinzu, um aktuelle Nachrichten zu sehen.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <PortfolioCalendar 
            holdings={holdings.map(h => ({
              symbol: h.symbol,
              name: h.name,
              quantity: h.quantity,
              current_price: h.current_price_display,
              value: h.value
            }))} 
          />
        )}

        {activeTab === 'dividends' && (
          <PortfolioDividends 
            holdings={holdings.map(h => ({
              symbol: h.symbol,
              name: h.name,
              quantity: h.quantity,
              current_price: h.current_price_display,
              value: h.value
            }))} 
          />
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <PortfolioBreakdownsDE 
              holdings={holdings.map(h => ({
                symbol: h.symbol,
                name: h.name,
                value: h.value,
                quantity: h.quantity,
                purchase_price: h.purchase_price_display
              }))}
              totalValue={totalValue}
              cashPosition={cashPositionDisplay}
              currency={currency as 'USD' | 'EUR'}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <PortfolioHistory 
            portfolioId={portfolio?.id || ''}
            holdings={holdings.map(h => ({
              symbol: h.symbol,
              name: h.name,
              quantity: h.quantity,
              purchase_price: h.purchase_price_display,
              purchase_date: h.purchase_date
            }))}
          />
        )}

        {/* Modals */}
        {/* Add Position Modal - Same as before */}
        {showAddPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            {/* Modal content same as original */}
            <div className="bg-theme-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-theme-primary">Position hinzufügen</h2>
                <button
                  onClick={resetAddPositionForm}
                  className="p-1 hover:bg-theme-secondary/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-theme-secondary" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-3">
                    Was möchtest du hinzufügen?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPositionType('stock')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        positionType === 'stock'
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-theme/20 hover:border-theme/40 text-theme-secondary'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ChartBarIcon className="w-5 h-5" />
                        <span className="font-medium text-sm">Aktie</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setPositionType('cash')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        positionType === 'cash'
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-theme/20 hover:border-theme/40 text-theme-secondary'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <CurrencyDollarIcon className="w-5 h-5" />
                        <span className="font-medium text-sm">Cash</span>
                      </div>
                    </button>
                  </div>
                </div>

                {positionType === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Cash-Betrag (EUR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="1.000,00"
                      className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    />
                  </div>
                )}

                {positionType === 'stock' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">
                        Aktie suchen
                      </label>
                      <SearchTickerInput
                        onSelect={(ticker) => {
                          const stock = stocks.find(s => s.ticker === ticker)
                          if (stock) {
                            setSelectedStock({ symbol: stock.ticker, name: stock.name })
                          }
                        }}
                        placeholder="z.B. AAPL oder Apple"
                        className="w-full"
                        inputClassName="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-theme-muted"
                        dropdownClassName="absolute z-10 w-full mt-1 bg-theme-card border border-theme/20 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        itemClassName="px-4 py-3 hover:bg-theme-secondary/50 transition-colors border-b border-theme/10 last:border-0 text-theme-primary cursor-pointer"
                      />
                    </div>

                    {selectedStock && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="text-sm text-green-400">Ausgewählt:</p>
                            <p className="font-semibold text-theme-primary">
                              {selectedStock.symbol} - {selectedStock.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Anzahl
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Kaufpreis pro Aktie (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPurchasePrice}
                        onChange={(e) => setNewPurchasePrice(e.target.value)}
                        placeholder="150,00"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Gebühren (optional, EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={transactionFees}
                        onChange={(e) => setTransactionFees(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Kaufdatum
                      </label>
                      <input
                        type="date"
                        value={newPurchaseDate}
                        onChange={(e) => setNewPurchaseDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddPosition}
                    disabled={addingPosition || (positionType === 'stock' && (!selectedStock || !newQuantity || !newPurchasePrice))}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-400 disabled:bg-theme-secondary disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {addingPosition ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Hinzufügen...
                      </>
                    ) : (
                      'Position hinzufügen'
                    )}
                  </button>
                  <button
                    onClick={resetAddPositionForm}
                    disabled={addingPosition}
                    className="flex-1 py-2 border border-theme/20 hover:bg-theme-secondary/30 disabled:opacity-50 text-theme-primary rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Position Modal */}
        {editingPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-card rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-theme-primary">Position bearbeiten</h2>
                <button
                  onClick={() => setEditingPosition(null)}
                  className="p-1 hover:bg-theme-secondary/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-theme-secondary" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-theme-secondary/20 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {editingPosition.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-theme-primary">{editingPosition.symbol}</div>
                      <div className="text-sm text-theme-muted">{editingPosition.name}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Anzahl
                  </label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Kaufpreis (pro Aktie in {currency})
                  </label>
                  <input
                    type="number"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Kaufdatum
                  </label>
                  <input
                    type="date"
                    value={newPurchaseDate}
                    onChange={(e) => setNewPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdatePosition}
                    disabled={refreshing}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {refreshing ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Änderungen speichern
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingPosition(null)}
                    disabled={refreshing}
                    className="flex-1 py-2 border border-theme/20 hover:bg-theme-secondary/30 disabled:opacity-50 text-theme-primary rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Superinvestors Modal */}
        {showSuperinvestorsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-card rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-theme-primary">Super-Investoren</h2>
                  <p className="text-sm text-theme-secondary">
                    {showSuperinvestorsModal.symbol} • {showSuperinvestorsModal.superinvestors?.count} Investoren
                  </p>
                </div>
                <button
                  onClick={() => setShowSuperinvestorsModal(null)}
                  className="p-1 hover:bg-theme-secondary/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-theme-secondary" />
                </button>
              </div>
              
              <div className="space-y-3">
                {showSuperinvestorsModal.superinvestors?.investors.map((investor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded-lg hover:bg-theme-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-theme-primary">
                          {investor.investorName.split(' - ')[0]}
                        </p>
                        <p className="text-xs text-theme-muted">
                          {investor.portfolioPercentage.toFixed(1)}% des Portfolios
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/superinvestor/${investor.investor}`}
                      className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-colors text-green-400 text-sm font-medium"
                    >
                      Details →
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-theme/10">
                <Link
                  href={`/analyse/stocks/${showSuperinvestorsModal.symbol.toLowerCase()}/super-investors`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                >
                  <span>Alle Investoren anzeigen</span>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}