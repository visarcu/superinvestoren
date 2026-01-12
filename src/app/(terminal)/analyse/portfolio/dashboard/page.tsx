// src/app/analyse/portfolio/dashboard/page.tsx - VOLLSTÄNDIG OPTIMIERTE VERSION
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotes } from '@/lib/fmp'
import { useCurrency } from '@/lib/CurrencyContext'
import { getEURRate, calculateGainLoss, currencyManager } from '@/lib/portfolioCurrency'
import PortfolioDividends from '@/components/PortfolioDividends'
import PortfolioHistory from '@/components/PortfolioHistory'
import PortfolioBreakdownsDE from '@/components/PortfolioBreakdownsDE'
import PortfolioAllocationChart from '@/components/PortfolioAllocationChart'
import PortfolioPerformanceChart from '@/components/PortfolioPerformanceChart'
import SearchTickerInput from '@/components/SearchTickerInput'
import Logo from '@/components/Logo'
import { stocks } from '@/data/stocks'
import { BrokerType, getBrokerConfig } from '@/lib/brokerConfig'
import {
  BriefcaseIcon,
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  LockClosedIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

// Free User Limit für Portfolio-Positionen
const FREE_USER_POSITION_LIMIT = 2

// Types
interface Portfolio {
  id: string
  name: string
  currency: string
  cash_position: number
  created_at: string
  is_default?: boolean
  broker_type?: BrokerType | null
  broker_name?: string | null
  broker_color?: string | null
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

// Skeleton Component for Loading - Fey Style
const SkeletonRow = () => (
  <div className="flex items-center justify-between py-3 border-b border-neutral-800/50 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-neutral-800 rounded-full"></div>
      <div>
        <div className="h-4 bg-neutral-800 rounded w-12 mb-1"></div>
        <div className="h-3 bg-neutral-800 rounded w-20"></div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-4 bg-neutral-800 rounded w-16"></div>
      <div className="h-4 bg-neutral-800 rounded w-12"></div>
    </div>
  </div>
)

// Premium Upgrade Modal Component - Fey Style
const PremiumUpgradeModal = ({ isOpen, onClose, feature }: { isOpen: boolean, onClose: () => void, feature: string }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-800">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <LockClosedIcon className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Premium Feature</h2>
          <p className="text-neutral-400 text-sm">{feature}</p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-neutral-300">Unbegrenzte Portfolio-Positionen</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-neutral-300">Dividenden-Tracking & Prognosen</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-neutral-300">Performance-Insights & Analysen</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-neutral-300">Portfolio-Historie & Transaktionen</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-6 p-4 bg-neutral-800/50 rounded-xl">
          <div className="text-2xl font-bold text-white">9€<span className="text-base font-normal text-neutral-400">/Monat</span></div>
          <p className="text-xs text-neutral-500 mt-1">Jederzeit kündbar</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-medium bg-neutral-800 text-neutral-400 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            Später
          </button>
          <Link
            href="/pricing"
            className="flex-1 px-4 py-3 text-sm font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-colors text-center"
          >
            Jetzt upgraden
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currency, setCurrency, formatCurrency, formatStockPrice, formatPercentage } = useCurrency()

  // Depot ID from URL params
  const depotIdParam = searchParams.get('depot')
  const isAllDepotsView = depotIdParam === 'all'

  // Core State
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [allPortfolios, setAllPortfolios] = useState<Portfolio[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [holdingsLoading, setHoldingsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Depot Switcher State
  const [showDepotSwitcher, setShowDepotSwitcher] = useState(false)
  
  // UI State
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'dividends' | 'insights' | 'history'>('overview')
  const [editingPosition, setEditingPosition] = useState<Holding | null>(null)
  const [showSuperinvestorsModal, setShowSuperinvestorsModal] = useState<Holding | null>(null)

  // Premium State
  const [isPremium, setIsPremium] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [premiumFeatureMessage, setPremiumFeatureMessage] = useState('')
  
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

  // Top Up Position State
  const [topUpPosition, setTopUpPosition] = useState<Holding | null>(null)
  const [topUpQuantity, setTopUpQuantity] = useState('')
  const [topUpPrice, setTopUpPrice] = useState('')
  const [topUpDate, setTopUpDate] = useState(new Date().toISOString().split('T')[0])
  const [topUpFees, setTopUpFees] = useState('')

  // Cash Modal State
  const [showCashModal, setShowCashModal] = useState(false)
  const [newCashAmount, setNewCashAmount] = useState('')

  // Portfolio Name Modal State
  const [showNameModal, setShowNameModal] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')

  // Portfolio Metrics
  const [totalValue, setTotalValue] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0)
  const [activeInvestments, setActiveInvestments] = useState(0)
  const [cashPositionDisplay, setCashPositionDisplay] = useState(0)

  // Force EUR for German portfolio app
  useEffect(() => {
    setCurrency('EUR')
  }, [])

  // Initial load with staggered requests - reload when depot param changes
  useEffect(() => {
    const initLoad = async () => {
      await loadPortfolio(depotIdParam)
      // Delay exchange rate to reduce initial load
      setTimeout(() => loadExchangeRate(), 500)
    }
    initLoad()
  }, [depotIdParam])

  // Reload when currency changes
  useEffect(() => {
    if (portfolio?.id) {
      loadPortfolio(depotIdParam)
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

  const loadPortfolio = async (depotId?: string | null) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Premium-Status laden
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .single()

      setIsPremium(profile?.is_premium || false)

      // Lade alle Portfolios des Users für den Depot-Switcher
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      setAllPortfolios(portfolios || [])

      // Handle "All Depots" view
      if (depotId === 'all' && portfolios && portfolios.length > 0) {
        // Aggregierte Ansicht: Lade alle Holdings von allen Portfolios
        setPortfolio({
          id: 'all',
          name: 'Alle Depots',
          currency: 'EUR',
          cash_position: portfolios.reduce((sum, p) => sum + (p.cash_position || 0), 0),
          created_at: new Date().toISOString()
        })

        // Lade Holdings von allen Portfolios
        const allHoldings: Holding[] = []
        let totalCash = 0

        for (const p of portfolios) {
          totalCash += p.cash_position || 0
          await loadHoldingsForPortfolio(p.id, allHoldings)
        }

        setCashPositionDisplay(totalCash)
        setHoldings(allHoldings)
        calculateMetrics(allHoldings, totalCash)
        setLoading(false)
        return
      }

      // Bestimme welches Portfolio geladen werden soll
      let portfolioData: Portfolio | undefined

      if (depotId && depotId !== 'all') {
        // Lade spezifisches Portfolio
        portfolioData = portfolios?.find(p => p.id === depotId)
      }

      if (!portfolioData) {
        // Fallback: Default-Portfolio oder erstes Portfolio
        portfolioData = portfolios?.[0]
      }

      // Wenn kein Portfolio existiert, automatisch erstellen
      if (!portfolioData) {
        const { data: newPortfolio, error: createError } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            name: 'Mein Portfolio',
            currency: 'EUR',
            cash_position: 0,
            is_default: true,
            broker_type: 'manual'
          })
          .select()
          .single()

        if (createError) throw createError
        portfolioData = newPortfolio
        setAllPortfolios([newPortfolio])
      }

      setPortfolio(portfolioData!)
      loadHoldings(portfolioData!.id)
      setCashPositionDisplay(portfolioData!.cash_position || 0)

    } catch (error: any) {
      console.error('Error loading portfolio:', error)
      setError(error.message || 'Fehler beim Laden des Portfolios')
    } finally {
      setLoading(false)
    }
  }

  // Helper function for loading holdings from a specific portfolio (used in "All Depots" view)
  const loadHoldingsForPortfolio = async (portfolioId: string, accumulator: Holding[]) => {
    try {
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)

      if (holdingsError) throw holdingsError

      if (holdingsData && holdingsData.length > 0) {
        const symbols = holdingsData.map(h => h.symbol)

        let currentPricesUSD: Record<string, number> = {}
        try {
          currentPricesUSD = await getBulkQuotes(symbols)
        } catch (priceError) {
          holdingsData.forEach(h => {
            currentPricesUSD[h.symbol] = h.purchase_price || 0
          })
        }

        const holdingsWithCurrentPrices = holdingsData.map(holding => ({
          ...holding,
          current_price: currentPricesUSD[holding.symbol] || holding.purchase_price || 0
        }))

        const convertedHoldings = await currencyManager.convertHoldingsForDisplay(
          holdingsWithCurrentPrices,
          currency as 'USD' | 'EUR',
          true
        )

        convertedHoldings.forEach(holding => {
          const currentPrice = holding.current_price_display || 0
          const purchasePrice = holding.purchase_price_display || 0
          const quantity = holding.quantity || 0
          const value = currentPrice * quantity
          const costBasis = purchasePrice * quantity
          const gainLoss = value - costBasis
          const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

          accumulator.push({
            ...holding,
            value,
            gain_loss: gainLoss,
            gain_loss_percent: gainLossPercent
          })
        })
      }
    } catch (error) {
      console.error('Error loading holdings for portfolio:', portfolioId, error)
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

        // Log transaction in history
        try {
          const totalValue = quantity * basePrice
          await supabase
            .from('portfolio_transactions')
            .insert({
              portfolio_id: portfolio?.id,
              type: 'buy',
              symbol: selectedStock?.symbol,
              name: selectedStock?.name,
              quantity: quantity,
              price: priceIncludingFees,
              total_value: totalValue + fees,
              date: newPurchaseDate,
              notes: fees > 0 ? `Kaufpreis: ${formatCurrency(basePrice)}, Gebühren: ${formatCurrency(fees)}` : null
            })
        } catch (txError) {
          // Ignoriere Fehler falls Tabelle nicht existiert
          console.log('Transaction logging skipped:', txError)
        }
      } else {
        const cashAmountEUR = parseFloat(cashAmount)
        const newCashPosition = (portfolio?.cash_position || 0) + cashAmountEUR

        const { error } = await supabase
          .from('portfolios')
          .update({ cash_position: newCashPosition })
          .eq('id', portfolio?.id)

        if (error) throw error

        // Log cash deposit transaction
        try {
          await supabase
            .from('portfolio_transactions')
            .insert({
              portfolio_id: portfolio?.id,
              type: 'cash_deposit',
              symbol: 'CASH',
              name: 'Einzahlung',
              quantity: 1,
              price: cashAmountEUR,
              total_value: cashAmountEUR,
              date: new Date().toISOString().split('T')[0],
              notes: `Cash hinzugefügt: ${formatCurrency(cashAmountEUR)}`
            })
        } catch (txError) {
          console.log('Transaction logging skipped:', txError)
        }
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

  // Handler für Position aufstocken
  const handleTopUpPosition = async () => {
    if (!topUpPosition || !topUpQuantity || !topUpPrice) {
      alert('Bitte alle Felder ausfüllen')
      return
    }

    setAddingPosition(true)

    try {
      const newQty = parseFloat(topUpQuantity)
      const newPrice = parseFloat(topUpPrice)
      const fees = parseFloat(topUpFees) || 0
      const priceWithFees = newPrice + (fees / newQty)

      // Berechne gewichteten Durchschnittspreis
      const oldQty = topUpPosition.quantity
      const oldPrice = topUpPosition.purchase_price  // Original DB Preis
      const totalQty = oldQty + newQty
      const weightedAvgPrice = ((oldQty * oldPrice) + (newQty * priceWithFees)) / totalQty

      // Update die existierende Position mit neuer Menge und Durchschnittspreis
      const { error } = await supabase
        .from('portfolio_holdings')
        .update({
          quantity: totalQty,
          purchase_price: weightedAvgPrice,
          // Behalte das ursprüngliche Kaufdatum oder nimm das ältere
          purchase_date: topUpPosition.purchase_date < topUpDate
            ? topUpPosition.purchase_date
            : topUpDate
        })
        .eq('id', topUpPosition.id)

      if (error) throw error

      // Log transaction in history
      try {
        const totalValue = newQty * newPrice
        await supabase
          .from('portfolio_transactions')
          .insert({
            portfolio_id: portfolio?.id,
            type: 'buy',
            symbol: topUpPosition.symbol,
            name: topUpPosition.name,
            quantity: newQty,
            price: priceWithFees,
            total_value: totalValue + fees,
            date: topUpDate,
            notes: fees > 0 ? `Aufstockung - Kaufpreis: ${formatCurrency(newPrice)}, Gebühren: ${formatCurrency(fees)}` : 'Aufstockung'
          })
      } catch (txError) {
        console.log('Transaction logging skipped:', txError)
      }

      // Reset und Reload
      setTopUpPosition(null)
      setTopUpQuantity('')
      setTopUpPrice('')
      setTopUpDate(new Date().toISOString().split('T')[0])
      setTopUpFees('')
      await loadPortfolio()

    } catch (error: any) {
      console.error('Error topping up position:', error)
      alert(`Fehler beim Aufstocken: ${error.message}`)
    } finally {
      setAddingPosition(false)
    }
  }

  // Handler für Cash Position Update
  const handleUpdateCashPosition = async () => {
    if (newCashAmount === '' || !portfolio?.id) return

    setRefreshing(true)
    try {
      const newAmount = parseFloat(newCashAmount) || 0
      const oldAmount = cashPositionDisplay
      const difference = newAmount - oldAmount

      // Update cash position
      const { error } = await supabase
        .from('portfolios')
        .update({ cash_position: newAmount })
        .eq('id', portfolio.id)

      if (error) throw error

      // Log transaction in history (optional - falls Tabelle existiert)
      try {
        // Nutze lowercase types passend zur existierenden Tabellenstruktur
        const transactionType = difference > 0 ? 'cash_deposit' : 'cash_withdrawal'

        await supabase
          .from('portfolio_transactions')
          .insert({
            portfolio_id: portfolio.id,
            type: transactionType,
            symbol: 'CASH',
            name: difference > 0 ? 'Einzahlung' : 'Auszahlung',
            quantity: 1,
            price: Math.abs(difference),
            total_value: Math.abs(difference),
            date: new Date().toISOString().split('T')[0],
            notes: `Cash ${difference > 0 ? 'hinzugefügt' : 'entnommen'}: ${formatCurrency(Math.abs(difference))}`
          })
      } catch (txError) {
        // Ignoriere Fehler falls Tabelle nicht existiert oder constraint fehlt
        console.log('Transaction logging skipped:', txError)
      }

      setShowCashModal(false)
      setNewCashAmount('')
      await loadPortfolio()

    } catch (error: any) {
      console.error('Error updating cash position:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  // Handler für Portfolio-Name Update
  const handleUpdatePortfolioName = async () => {
    if (!newPortfolioName.trim() || !portfolio?.id) return

    setRefreshing(true)
    try {
      const { error } = await supabase
        .from('portfolios')
        .update({ name: newPortfolioName.trim() })
        .eq('id', portfolio.id)

      if (error) throw error

      // Update local state
      setPortfolio(prev => prev ? { ...prev, name: newPortfolioName.trim() } : null)
      setShowNameModal(false)
      setNewPortfolioName('')

    } catch (error: any) {
      console.error('Error updating portfolio name:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  // Handler für Position hinzufügen mit Premium-Check
  const openAddPositionModal = () => {
    // In "Alle Depots" Ansicht keine Positionen hinzufügen
    if (isAllDepotsView) {
      return
    }
    // Free User hat Limit erreicht?
    if (!isPremium && holdings.length >= FREE_USER_POSITION_LIMIT) {
      setPremiumFeatureMessage('Mit Premium kannst du unbegrenzt Positionen zu deinem Portfolio hinzufügen.')
      setShowPremiumModal(true)
      return
    }
    setShowAddPosition(true)
  }

  // Handler für Tab-Wechsel mit Premium-Check
  const handleTabChange = (tab: typeof activeTab) => {
    // Premium-only Tabs
    const premiumTabs = ['dividends', 'insights', 'history']

    if (!isPremium && premiumTabs.includes(tab)) {
      const messages: Record<string, string> = {
        dividends: 'Portfolio-Dividenden sind ein Premium-Feature. Siehe deine erwarteten Dividenden-Einnahmen.',
        insights: 'Portfolio-Insights sind ein Premium-Feature. Erhalte detaillierte Analysen deines Portfolios.',
        history: 'Portfolio-Historie ist ein Premium-Feature. Verfolge alle deine Transaktionen.'
      }
      setPremiumFeatureMessage(messages[tab] || 'Dieses Feature ist nur für Premium-Nutzer verfügbar.')
      setShowPremiumModal(true)
      return
    }
    setActiveTab(tab)
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

  // Loading State - Fey Style
  if (loading) {
    return (
      <div className="min-h-screen bg-dark">
        <div className="w-full px-6 py-6">
          <div className="animate-pulse">
            <div className="h-6 bg-neutral-800 rounded w-40 mb-2"></div>
            <div className="h-10 bg-neutral-800 rounded w-48 mb-8"></div>
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error State - Fey Style
  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">Fehler beim Laden</h2>
          <p className="text-neutral-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => loadPortfolio(depotIdParam)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header - Fey Style Compact */}
      <div className="border-b border-neutral-800">
        <div className="w-full px-6 py-6">
          {/* Portfolio Name + Actions Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-medium text-white">{portfolio?.name || 'Mein Portfolio'}</h1>

              {/* Depot Switcher */}
              {allPortfolios.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowDepotSwitcher(!showDepotSwitcher)}
                    className="p-1 hover:bg-neutral-800 rounded transition-colors"
                    title="Depot wechseln"
                  >
                    <ChevronDownIcon className={`w-4 h-4 text-neutral-500 transition-transform ${showDepotSwitcher ? 'rotate-180' : ''}`} />
                  </button>

                  {showDepotSwitcher && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowDepotSwitcher(false)} />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-20 py-2 max-h-80 overflow-y-auto">
                        {/* All Depots Option */}
                        {allPortfolios.length > 1 && (
                          <>
                            <Link
                              href="/analyse/portfolio/dashboard?depot=all"
                              onClick={() => setShowDepotSwitcher(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 transition-colors ${portfolio?.id === 'all' ? 'bg-emerald-500/10' : ''}`}
                            >
                              <Squares2X2Icon className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm text-white">Alle Depots</span>
                              {portfolio?.id === 'all' && <CheckIcon className="w-4 h-4 text-emerald-400 ml-auto" />}
                            </Link>
                            <hr className="my-1 border-neutral-800" />
                          </>
                        )}

                        {allPortfolios.map((p) => {
                          const isActive = portfolio?.id === p.id
                          return (
                            <Link
                              key={p.id}
                              href={`/analyse/portfolio/dashboard?depot=${p.id}`}
                              onClick={() => setShowDepotSwitcher(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 transition-colors ${isActive ? 'bg-emerald-500/10' : ''}`}
                            >
                              <BriefcaseIcon className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm text-white truncate">{p.name}</span>
                              {isActive && <CheckIcon className="w-4 h-4 text-emerald-400 ml-auto" />}
                            </Link>
                          )
                        })}

                        <hr className="my-1 border-neutral-800" />
                        <Link
                          href="/analyse/portfolio/depots/neu"
                          onClick={() => setShowDepotSwitcher(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 transition-colors text-emerald-400"
                        >
                          <PlusIcon className="w-4 h-4" />
                          <span className="text-sm">Neues Depot</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}

              {portfolio?.id !== 'all' && (
                <button
                  onClick={() => {
                    setNewPortfolioName(portfolio?.name || '')
                    setShowNameModal(true)
                  }}
                  className="p-1 hover:bg-neutral-800 rounded transition-colors opacity-0 hover:opacity-100"
                  title="Umbenennen"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-neutral-500" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshPrices}
                disabled={refreshing}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                title="Aktualisieren"
              >
                <ArrowPathIcon className={`w-4 h-4 text-neutral-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                title="Export"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-neutral-400" />
              </button>
              <Link
                href="/analyse/portfolio/depots"
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                title="Depots"
              >
                <Squares2X2Icon className="w-4 h-4 text-neutral-400" />
              </Link>
            </div>
          </div>

          {/* Kompakte Stats - Fey Style */}
          <div className="flex items-baseline gap-8">
            <div>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-sm font-medium ${totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                </span>
                <span className={`text-sm ${totalGainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercentage(totalGainLossPercent)}
                </span>
                <span className="text-xs text-neutral-500">All-time</span>
              </div>
            </div>

            {/* Inline Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div>
                <span className="text-neutral-500">Cash</span>
                <span className="text-white ml-2">{formatCurrency(cashPositionDisplay)}</span>
                <button
                  onClick={() => {
                    setNewCashAmount(cashPositionDisplay.toString())
                    setShowCashModal(true)
                  }}
                  className="ml-1 p-0.5 hover:bg-neutral-800 rounded transition-colors"
                >
                  <PencilIcon className="w-3 h-3 text-neutral-600 hover:text-neutral-400" />
                </button>
              </div>
              <div>
                <span className="text-neutral-500">Positionen</span>
                <span className="text-white ml-2">{activeInvestments}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Fey Style */}
      <div className="flex items-center gap-6 px-6 border-b border-neutral-800">
        {[
          { key: 'overview', label: 'Holdings', premium: false },
          { key: 'news', label: 'News', premium: false },
          { key: 'dividends', label: 'Dividenden', premium: true },
          { key: 'insights', label: 'Insights', premium: true },
          { key: 'history', label: 'Activity', premium: true }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as any)}
            className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'text-white border-white'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            {tab.label}
            {!isPremium && tab.premium && (
              <LockClosedIcon className="w-3 h-3 text-amber-500" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="w-full px-6 py-6">
        {/* Exchange Rate Info - Minimal */}
        {exchangeRate && (
          <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>USD/EUR: {exchangeRate.toFixed(4)}</span>
            {lastCurrencyUpdate && (
              <span>• {lastCurrencyUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            <button
              onClick={loadExchangeRate}
              disabled={currencyLoading}
              className="text-emerald-400 hover:text-emerald-300"
            >
              {currencyLoading ? '...' : '↻'}
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column: Performance Chart */}
              <div className="lg:col-span-2">
                {holdings.length > 0 && (
                  <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800/50">
                    <PortfolioPerformanceChart
                      portfolioId={portfolio?.id || ''}
                      holdings={holdings.map(h => ({
                        symbol: h.symbol,
                        name: h.name,
                        quantity: h.quantity,
                        purchase_price: h.purchase_price,
                        current_price: h.current_price_display,
                        value: h.value,
                        purchase_date: h.purchase_date
                      }))}
                      totalValue={holdings.reduce((sum, h) => sum + h.value, 0)}
                      totalCost={holdings.reduce((sum, h) => sum + (h.purchase_price * h.quantity), 0)}
                      cashPosition={cashPositionDisplay}
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Top Positions + Diversification */}
              <div className="space-y-4">
                {/* Top Positions Card */}
                <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
                  <h4 className="font-medium text-white mb-4 text-sm flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-neutral-500" />
                    Top Positionen
                  </h4>
                  <div className="space-y-3">
                    {holdings
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 5)
                      .map((holding, index) => (
                        <div
                          key={holding.symbol}
                          className="flex items-center justify-between py-1 hover:bg-neutral-800/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                          onClick={() => handleViewStock(holding.symbol)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-medium text-neutral-600 w-4">{index + 1}</span>
                            <Logo
                              ticker={holding.symbol}
                              alt={holding.symbol}
                              className="w-7 h-7"
                              padding="none"
                            />
                            <div>
                              <p className="font-medium text-white text-sm">{holding.symbol}</p>
                              <p className="text-xs text-neutral-500">{holding.quantity} St.</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">{formatCurrency(holding.value)}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              holding.gain_loss_percent >= 0
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {holding.gain_loss_percent >= 0 ? '+' : ''}{holding.gain_loss_percent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Diversification Card */}
                <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
                  <h4 className="font-medium text-white mb-4 text-sm">
                    Diversifikation
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400">Positionen</span>
                      <span className="text-sm font-semibold text-white bg-neutral-800 px-2 py-0.5 rounded">
                        {activeInvestments}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400">Cash-Quote</span>
                      <span className="text-sm font-semibold text-white bg-neutral-800 px-2 py-0.5 rounded">
                        {totalValue > 0 ? ((cashPositionDisplay / totalValue) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400">Größte Position</span>
                      <span className="text-sm font-semibold text-white bg-neutral-800 px-2 py-0.5 rounded">
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

            {/* Asset Allocation Section */}
            <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800/50 mb-8">
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

            {/* Free User Info Badge */}
            {!isPremium && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
                <InformationCircleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-400">
                    <span className="font-medium text-white">Free Account:</span> Du kannst bis zu {FREE_USER_POSITION_LIMIT} Positionen hinzufügen.
                    <Link href="/pricing" className="text-emerald-400 hover:text-emerald-300 ml-1 font-medium">
                      Upgrade für unbegrenzte Positionen →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Holdings List - Fey Style */}
            <div>
              {/* Header Row */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-neutral-400">Holdings</h2>
                <button
                  onClick={openAddPositionModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Position</span>
                </button>
              </div>

              {holdingsLoading ? (
                <div className="space-y-0">
                  {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : holdings.length > 0 ? (
                <div className="space-y-0">
                  {holdings
                    .sort((a, b) => b.value - a.value)
                    .map((holding, index) => {
                      const percentage = totalValue > 0 ? (holding.value / totalValue) * 100 : 0

                      return (
                        <div
                          key={holding.id}
                          className="group flex items-center justify-between py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                          onClick={() => handleViewStock(holding.symbol)}
                        >
                          {/* Left: Rank + Logo + Info */}
                          <div className="flex items-center gap-3">
                            <span className="w-5 text-xs text-neutral-600 font-medium">{index + 1}</span>
                            <Logo
                              ticker={holding.symbol}
                              alt={holding.symbol}
                              className="w-8 h-8"
                              padding="none"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white text-sm">{holding.symbol}</span>
                                {holding.superinvestors && holding.superinvestors.count > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setShowSuperinvestorsModal(holding)
                                    }}
                                    className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  >
                                    <span>{holding.superinvestors.count}</span>
                                    <span className="hidden sm:inline">SI</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500">
                                {holding.quantity.toLocaleString('de-DE')} × {formatStockPrice(holding.current_price_display)}
                              </p>
                            </div>
                          </div>

                          {/* Right: Value + Performance + Actions */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-medium text-white text-sm">{formatCurrency(holding.value)}</p>
                              <div className="flex items-center justify-end gap-2">
                                <span className={`text-xs ${holding.gain_loss_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {holding.gain_loss_percent >= 0 ? '+' : ''}{formatPercentage(holding.gain_loss_percent)}
                                </span>
                                <span className="text-xs text-neutral-600">{percentage.toFixed(1)}%</span>
                              </div>
                            </div>

                            {/* Action Buttons - Show on hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTopUpPosition(holding)
                                  setTopUpPrice('')
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                                title="Aufstocken"
                              >
                                <PlusIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-emerald-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditModal(holding)
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                                title="Bearbeiten"
                              >
                                <PencilIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-blue-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePosition(holding.id)
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                                title="Löschen"
                              >
                                <XMarkIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                  {/* Cash Position - Inline in List */}
                  {cashPositionDisplay > 0 && (
                    <div
                      className="group flex items-center justify-between py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        setNewCashAmount(cashPositionDisplay.toString())
                        setShowCashModal(true)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-xs text-neutral-600 font-medium">{holdings.length + 1}</span>
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center">
                          <CurrencyDollarIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div>
                          <span className="font-medium text-white text-sm">Cash</span>
                          <p className="text-xs text-neutral-500">Verfügbar</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-white text-sm">{formatCurrency(cashPositionDisplay)}</p>
                          <span className="text-xs text-neutral-600">
                            {totalValue > 0 ? ((cashPositionDisplay / totalValue) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setNewCashAmount(cashPositionDisplay.toString())
                              setShowCashModal(true)
                            }}
                            className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                            title="Cash bearbeiten"
                          >
                            <PencilIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-blue-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-xl flex items-center justify-center">
                    <BriefcaseIcon className="w-8 h-8 text-neutral-600" />
                  </div>
                  <h3 className="text-base font-medium text-white mb-1">
                    Keine Positionen
                  </h3>
                  <p className="text-neutral-500 text-sm mb-4">
                    Füge deine erste Aktie hinzu
                  </p>
                  <button
                    onClick={openAddPositionModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Position hinzufügen
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* News Tab - Fey Style */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {newsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ArrowPathIcon className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
                  <p className="text-neutral-400">Lade Portfolio News...</p>
                </div>
              </div>
            ) : newsError ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-neutral-400 mb-2">Fehler beim Laden der News</p>
                <button
                  onClick={loadPortfolioNews}
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : portfolioNews.length > 0 ? (
              portfolioNews.map((article, index) => (
                <article
                  key={`${article.url}-${index}`}
                  className="bg-neutral-900/50 rounded-xl p-5 border border-neutral-800 hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                          {article.symbol}
                        </span>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(article.publishedDate)}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {article.site}
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white mb-2 leading-tight">
                        {article.title}
                      </h3>
                      <p className="text-neutral-400 text-sm leading-relaxed line-clamp-3">
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
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                    <Link
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors text-sm"
                    >
                      <span>Artikel lesen</span>
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </Link>
                    <Link
                      href={`/analyse/stocks/${article.symbol.toLowerCase()}`}
                      className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm"
                    >
                      <EyeIcon className="w-3 h-3" />
                      <span>{article.symbol} analysieren</span>
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-8 h-8 text-neutral-600" />
                </div>
                <h3 className="text-base font-medium text-white mb-1">
                  Keine News verfügbar
                </h3>
                <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                  Füge Positionen hinzu, um aktuelle Nachrichten zu deinen Aktien zu sehen.
                </p>
              </div>
            )}
          </div>
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
            onTransactionChange={() => loadPortfolio()}
          />
        )}

        {/* Modals */}
        {/* Add Position Modal - Same as before */}
        {showAddPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            {/* Modal content same as original */}
            <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Position hinzufügen</h2>
                <button
                  onClick={resetAddPositionForm}
                  className="p-1 hover:bg-neutral-800/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">
                    Was möchtest du hinzufügen?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPositionType('stock')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        positionType === 'stock'
                          ? 'border-green-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-neutral-700 hover:border-neutral-800/40 text-neutral-400'
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
                          ? 'border-green-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-neutral-700 hover:border-neutral-800/40 text-neutral-400'
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
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Cash-Betrag (EUR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="1.000,00"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    />
                  </div>
                )}

                {positionType === 'stock' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">
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
                        inputClassName="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-theme-muted"
                        dropdownClassName="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        itemClassName="px-4 py-3 hover:bg-neutral-800/50 transition-colors border-b border-neutral-800 last:border-0 text-white cursor-pointer"
                      />
                    </div>

                    {selectedStock && (
                      <div className="p-3 bg-emerald-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-sm text-emerald-400">Ausgewählt:</p>
                            <p className="font-semibold text-white">
                              {selectedStock.symbol} - {selectedStock.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">
                        Anzahl
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">
                        Kaufpreis pro Aktie (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPurchasePrice}
                        onChange={(e) => setNewPurchasePrice(e.target.value)}
                        placeholder="150,00"
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">
                        Gebühren (optional, EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={transactionFees}
                        onChange={(e) => setTransactionFees(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">
                        Kaufdatum
                      </label>
                      <input
                        type="date"
                        value={newPurchaseDate}
                        onChange={(e) => setNewPurchaseDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddPosition}
                    disabled={addingPosition || (positionType === 'stock' && (!selectedStock || !newQuantity || !newPurchasePrice))}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 disabled:opacity-50 text-white rounded-lg transition-colors"
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
            <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Position bearbeiten</h2>
                <button
                  onClick={() => setEditingPosition(null)}
                  className="p-1 hover:bg-neutral-800/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-neutral-800/20 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {editingPosition.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{editingPosition.symbol}</div>
                      <div className="text-sm text-neutral-500">{editingPosition.name}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Anzahl
                  </label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Kaufpreis (pro Aktie in {currency})
                  </label>
                  <input
                    type="number"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Kaufdatum
                  </label>
                  <input
                    type="date"
                    value={newPurchaseDate}
                    onChange={(e) => setNewPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdatePosition}
                    disabled={refreshing}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 disabled:opacity-50 text-white rounded-lg transition-colors"
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
            <div className="bg-neutral-900 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Super-Investoren</h2>
                  <p className="text-sm text-neutral-400">
                    {showSuperinvestorsModal.symbol} • {showSuperinvestorsModal.superinvestors?.count} Investoren
                  </p>
                </div>
                <button
                  onClick={() => setShowSuperinvestorsModal(null)}
                  className="p-1 hover:bg-neutral-800/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              
              <div className="space-y-3">
                {showSuperinvestorsModal.superinvestors?.investors.map((investor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-neutral-800/20 rounded-lg hover:bg-neutral-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {investor.investorName.split(' - ')[0]}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {investor.portfolioPercentage.toFixed(1)}% des Portfolios
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/superinvestor/${investor.investor}`}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-brand/20 rounded-lg transition-colors text-emerald-400 text-sm font-medium"
                    >
                      Details →
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800">
                <Link
                  href={`/analyse/stocks/${showSuperinvestorsModal.symbol.toLowerCase()}/super-investors`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                >
                  <span>Alle Investoren anzeigen</span>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Top Up Position Modal */}
        {topUpPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Position aufstocken</h2>
                <button
                  onClick={() => setTopUpPosition(null)}
                  className="p-1 hover:bg-neutral-800/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              {/* Aktuelle Position Info */}
              <div className="bg-neutral-800/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {topUpPosition.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{topUpPosition.symbol}</div>
                    <div className="text-sm text-neutral-500">{topUpPosition.name}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500">Aktuelle Menge</p>
                    <p className="font-semibold text-white">{topUpPosition.quantity} Stück</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Ø Kaufpreis</p>
                    <p className="font-semibold text-white">{formatStockPrice(topUpPosition.purchase_price_display)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Zusätzliche Anzahl
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={topUpQuantity}
                    onChange={(e) => setTopUpQuantity(e.target.value)}
                    placeholder="z.B. 5"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Kaufpreis pro Aktie (EUR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={topUpPrice}
                    onChange={(e) => setTopUpPrice(e.target.value)}
                    placeholder="z.B. 495.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Gebühren (optional, EUR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={topUpFees}
                    onChange={(e) => setTopUpFees(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Kaufdatum
                  </label>
                  <input
                    type="date"
                    value={topUpDate}
                    onChange={(e) => setTopUpDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>

                {/* Preview der neuen Position */}
                {topUpQuantity && topUpPrice && (
                  <div className="bg-emerald-500/10 border border-brand/20 rounded-lg p-3">
                    <p className="text-sm text-emerald-400 font-medium mb-2">Nach Aufstockung:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-neutral-500">Neue Menge</p>
                        <p className="font-semibold text-white">
                          {(topUpPosition.quantity + parseFloat(topUpQuantity || '0')).toFixed(0)} Stück
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Neuer Ø Preis</p>
                        <p className="font-semibold text-white">
                          {formatStockPrice(
                            ((topUpPosition.quantity * topUpPosition.purchase_price_display) +
                             (parseFloat(topUpQuantity || '0') * parseFloat(topUpPrice || '0'))) /
                            (topUpPosition.quantity + parseFloat(topUpQuantity || '0'))
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleTopUpPosition}
                    disabled={addingPosition || !topUpQuantity || !topUpPrice}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {addingPosition ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Aufstocken...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4" />
                        Position aufstocken
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setTopUpPosition(null)}
                    disabled={addingPosition}
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Position Modal */}
        {showCashModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Cash Position bearbeiten</h2>
                <button
                  onClick={() => setShowCashModal(false)}
                  className="p-1 hover:bg-neutral-800/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Aktueller Stand
                  </label>
                  <div className="p-3 bg-neutral-800/20 rounded-lg">
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(cashPositionDisplay)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Neuer Cash-Betrag (EUR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCashAmount}
                    onChange={(e) => setNewCashAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Setze auf 0 um die Cash-Position zu löschen
                  </p>
                </div>

                {/* Differenz anzeigen */}
                {newCashAmount && parseFloat(newCashAmount) !== cashPositionDisplay && (
                  <div className={`p-3 rounded-lg ${
                    parseFloat(newCashAmount) > cashPositionDisplay
                      ? 'bg-emerald-500/10 border border-brand/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <p className="text-sm">
                      <span className="text-neutral-400">Änderung: </span>
                      <span className={parseFloat(newCashAmount) > cashPositionDisplay ? 'text-emerald-400' : 'text-red-400'}>
                        {parseFloat(newCashAmount) > cashPositionDisplay ? '+' : ''}
                        {formatCurrency(parseFloat(newCashAmount) - cashPositionDisplay)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpdateCashPosition}
                    disabled={refreshing || newCashAmount === '' || parseFloat(newCashAmount) === cashPositionDisplay}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {refreshing ? 'Speichern...' : 'Speichern'}
                  </button>
                  <button
                    onClick={() => setShowCashModal(false)}
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 text-white rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Name Modal */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Portfolio umbenennen</h2>
                <button
                  onClick={() => setShowNameModal(false)}
                  className="p-1 hover:bg-neutral-800/30 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Portfolio-Name
                  </label>
                  <input
                    type="text"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="z.B. Hauptdepot, Sparplan, etc."
                    maxLength={50}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    autoFocus
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Max. 50 Zeichen
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpdatePortfolioName}
                    disabled={refreshing || !newPortfolioName.trim() || newPortfolioName.trim() === portfolio?.name}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {refreshing ? 'Speichern...' : 'Speichern'}
                  </button>
                  <button
                    onClick={() => setShowNameModal(false)}
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 text-white rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Upgrade Modal */}
        <PremiumUpgradeModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          feature={premiumFeatureMessage}
        />
      </main>
    </div>
  )
}