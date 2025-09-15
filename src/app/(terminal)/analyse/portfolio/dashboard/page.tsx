// src/app/analyse/portfolio/dashboard/page.tsx - VOLLSTÄNDIGE OPTIMIERTE VERSION
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotes } from '@/lib/fmp'
import { useCurrency } from '@/lib/CurrencyContext'
import { currencyManager } from '@/lib/portfolioCurrency'
import PortfolioCalendar from '@/components/PortfolioCalendar'
import PortfolioDividends from '@/components/PortfolioDividends'
import PortfolioHistory from '@/components/PortfolioHistory'
import PortfolioBreakdownsDE from '@/components/PortfolioBreakdownsDE'
import { 
  BriefcaseIcon, 
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  PlusIcon,
  Cog6ToothIcon,
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

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
  purchase_price: number      // Original USD Preis aus DB
  purchase_price_display: number  // Für Anzeige konvertiert
  current_price: number       // Aktueller USD Preis
  current_price_display: number  // Für Anzeige konvertiert
  purchase_date: string
  value: number              // In Anzeige-Währung
  gain_loss: number          // In Anzeige-Währung
  gain_loss_percent: number  // Prozentual
  // Erweiterte Currency-Felder
  purchase_currency?: string
  purchase_exchange_rate?: number
  purchase_price_original?: number
  current_exchange_rate?: number
  currency_aware?: boolean
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

interface SearchResult {
  symbol: string
  name: string
  stockExchange: string
  exchangeShortName: string
}

export default function PortfolioDashboard() {
  const router = useRouter()
  const { currency, setCurrency, formatCurrency, formatStockPrice, formatPercentage } = useCurrency()
  
  // Core State
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'calendar' | 'dividends' | 'insights' | 'history'>('overview')
  
  // News State
  const [portfolioNews, setPortfolioNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  
  // Currency State
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  
  // Add Position Form State
  const [newSymbol, setNewSymbol] = useState('')
  const [newQuantity, setNewQuantity] = useState('')

  // Set EUR as default currency for portfolio (German users)
  useEffect(() => {
    if (currency !== 'EUR') {
      setCurrency('EUR')
    }
  }, [currency, setCurrency])
  const [newPurchasePrice, setNewPurchasePrice] = useState('')
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [addingPosition, setAddingPosition] = useState(false)
  const [positionType, setPositionType] = useState<'stock' | 'cash'>('stock')
  const [cashAmount, setCashAmount] = useState('')
  
  // Neue Form-States für Währung und Gebühren
  const [purchaseCurrency, setPurchaseCurrency] = useState<'EUR' | 'USD'>('EUR') // EUR als Standard
  const [transactionFees, setTransactionFees] = useState('')
  
  // Autocomplete State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string} | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Portfolio Metrics - In Anzeige-Währung
  const [totalValue, setTotalValue] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0)
  const [activeInvestments, setActiveInvestments] = useState(0)
  const [cashPositionDisplay, setCashPositionDisplay] = useState(0)

  // Effects
  useEffect(() => {
    loadPortfolio()
  }, [currency]) // Reload wenn Währung wechselt

  useEffect(() => {
    loadExchangeRate()
  }, [])

  useEffect(() => {
    const searchStocks = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setSearchLoading(true)
      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data || [])
          setShowSearchResults(data.length > 0)
        }
      } catch (error) {
        console.error('Error searching stocks:', error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    const timer = setTimeout(searchStocks, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (activeTab === 'news' && holdings.length > 0 && portfolioNews.length === 0) {
      loadPortfolioNews()
    }
  }, [activeTab, holdings])

  // Core Functions
  const loadExchangeRate = async () => {
    setCurrencyLoading(true)
    try {
      const rate = await currencyManager.getCurrentUSDtoEURRate()
      setExchangeRate(rate) // rate can be null if unavailable
    } catch (error) {
      console.error('Error loading exchange rate:', error)
      setExchangeRate(null) // No fallback for professional accuracy
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

      // Portfolio laden
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (portfolioError) throw portfolioError
      setPortfolio(portfolioData)

      // Holdings laden
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolioData.id)

      if (holdingsError) throw holdingsError

      // Enriched Holdings erstellen
      let enrichedHoldings: Holding[] = []
      
      if (holdingsData && holdingsData.length > 0) {
        const symbols = holdingsData.map(h => h.symbol)
        const currentPricesUSD = await getBulkQuotes(symbols)
        
        // USD Holdings mit aktuellen Preisen
        const holdingsWithCurrentPrices = holdingsData.map(holding => ({
          ...holding,
          current_price: currentPricesUSD[holding.symbol] || holding.purchase_price || 0
        }))
        
        console.log('📊 Holdings with current prices:', holdingsWithCurrentPrices)

        // Korrekte Währungskonvertierung mit Currency Manager
        const convertedHoldings = await currencyManager.convertHoldingsForDisplay(
          holdingsWithCurrentPrices,
          currency as 'USD' | 'EUR', // Cast für currencyManager Kompatibilität
          true // includeHistoricalRates für präzise Performance
        )
        
        // Calculate value field and gain/loss
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
      }

      setHoldings(enrichedHoldings)
      
      // Cash Position konvertieren
      const cashDisplay = await currencyManager.convertCashPosition(
        portfolioData.cash_position,
        currency as 'USD' | 'EUR' // Cast für currencyManager Kompatibilität
      )
      setCashPositionDisplay(cashDisplay.amount)
      
      // Show warning if exchange rate unavailable
      if (cashDisplay.unavailable) {
        console.warn('⚠️ Exchange rate unavailable - displaying cash in USD')
      }
      
      // Metriken berechnen
      calculateMetrics(enrichedHoldings, cashDisplay.amount)
      
    } catch (error: any) {
      console.error('Error loading portfolio:', error)
      setError(error.message || 'Fehler beim Laden des Portfolios')
    } finally {
      setLoading(false)
    }
  }

  const loadPortfolioNews = async () => {
    setNewsLoading(true)
    try {
      // Extract symbols from holdings (Top 5)
      const symbols = holdings.slice(0, 5).map(h => h.symbol)
      
      if (symbols.length === 0) {
        setPortfolioNews([])
        return
      }

      const response = await fetch('/api/portfolio-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols })
      })
      
      if (response.ok) {
        const data = await response.json()
        setPortfolioNews(data.news?.slice(0, 20) || [])
      } else {
        console.error('Failed to load portfolio news:', response.status)
        setPortfolioNews([])
      }
      
    } catch (error) {
      console.error('Error loading portfolio news:', error)
      setPortfolioNews([])
    } finally {
      setNewsLoading(false)
    }
  }

  const calculateMetrics = (holdings: Holding[], cashPosition: number) => {
    console.log('📊 Calculating metrics for holdings:', holdings)
    
    const stockValue = holdings.reduce((sum, h) => {
      const value = h.value || 0
      console.log(`${h.symbol}: value=${value}`)
      return sum + value
    }, 0)
    
    const stockCost = holdings.reduce((sum, h) => {
      const cost = (h.purchase_price_display || 0) * (h.quantity || 0)
      console.log(`${h.symbol}: cost=${cost} (price=${h.purchase_price_display}, qty=${h.quantity})`)
      return sum + cost
    }, 0)
    
    console.log(`📊 Totals: stockValue=${stockValue}, stockCost=${stockCost}, cash=${cashPosition}`)
    
    setTotalValue(stockValue + cashPosition)
    setTotalInvested(stockCost)
    setTotalGainLoss(stockValue - stockCost)
    setTotalGainLossPercent(stockCost > 0 ? ((stockValue - stockCost) / stockCost) * 100 : 0)
    setActiveInvestments(holdings.length)
  }

  const refreshPrices = async () => {
    setRefreshing(true)
    await loadPortfolio()
    await loadExchangeRate()
    setRefreshing(false)
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
        // Stock Position mit Gebühren
        const basePrice = parseFloat(newPurchasePrice)
        const fees = parseFloat(transactionFees) || 0
        const quantity = parseFloat(newQuantity)
        
        // Gebühren pro Aktie hinzufügen
        const priceIncludingFees = basePrice + (fees / quantity)
        
        const conversionResult = await currencyManager.convertNewPositionToUSD(
          priceIncludingFees,
          purchaseCurrency
        )
        
        const { error } = await supabase
          .from('portfolio_holdings')
          .insert({
            portfolio_id: portfolio?.id,
            symbol: selectedStock?.symbol,
            name: selectedStock?.name,
            quantity: quantity,
            purchase_price: conversionResult.priceUSD,
            purchase_date: newPurchaseDate,
            purchase_currency: purchaseCurrency,
            purchase_exchange_rate: conversionResult.exchangeRate,
            purchase_price_original: basePrice, // Originalpreis ohne Gebühren
            currency_metadata: {
              ...conversionResult.metadata,
              transaction_fees: fees,
              fees_currency: purchaseCurrency,
              price_including_fees: priceIncludingFees
            }
          })

        if (error) throw error
      } else {
        // Cash Position - update portfolio cash_position
        const conversionResult = await currencyManager.convertNewPositionToUSD(
          parseFloat(cashAmount),
          purchaseCurrency
        )

        // Add to existing cash position
        const newCashPosition = (portfolio?.cash_position || 0) + conversionResult.priceUSD

        const { error } = await supabase
          .from('portfolios')
          .update({ 
            cash_position: newCashPosition
          })
          .eq('id', portfolio?.id)

        if (error) throw error
      }

      // Form reset
      resetAddPositionForm()
      await loadPortfolio()
      
    } catch (error: any) {
      console.error('Error adding position:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setAddingPosition(false)
    }
  }

  const resetAddPositionForm = () => {
    setSelectedStock(null)
    setSearchQuery('')
    setNewQuantity('')
    setNewPurchasePrice('')
    setNewPurchaseDate(new Date().toISOString().split('T')[0])
    setCashAmount('')
    setPositionType('stock')
    setPurchaseCurrency('EUR') // Reset zu EUR Standard
    setTransactionFees('') // Reset Gebühren
    setShowAddPosition(false)
    setShowSearchResults(false)
  }

  const handleStockSelect = (stock: SearchResult) => {
    setSelectedStock({ symbol: stock.symbol, name: stock.name })
    setSearchQuery(`${stock.symbol} - ${stock.name}`)
    setShowSearchResults(false)
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
      await loadPortfolio()
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Fehler beim Löschen der Position')
    }
  }

  // Utility Functions
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
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="flex items-center gap-3">
          <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin" />
          <span className="text-theme-secondary">Lade Portfolio...</span>
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
            onClick={loadPortfolio}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
                <BriefcaseIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">
                  {portfolio?.name || 'Mein Portfolio'}
                </h1>
                <p className="text-sm text-theme-muted mt-1">
                  Erstellt am {portfolio?.created_at ? new Date(portfolio.created_at).toLocaleDateString('de-DE') : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Currency Toggle */}
              <div className="flex gap-1 p-1 bg-theme-card rounded-lg border border-theme/10">
                <button
                  onClick={() => setCurrency('EUR')}
                  disabled={currencyLoading}
                  className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 disabled:opacity-50 ${
                    currency === 'EUR'
                      ? 'bg-green-500 text-white'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <CurrencyEuroIcon className="w-4 h-4" />
                  EUR
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  disabled={currencyLoading}
                  className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 disabled:opacity-50 ${
                    currency === 'USD'
                      ? 'bg-green-500 text-white'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <CurrencyDollarIcon className="w-4 h-4" />
                  USD
                </button>
              </div>

              <button
                onClick={refreshPrices}
                disabled={refreshing}
                className="p-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 text-theme-secondary ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <button className="p-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme/10 rounded-lg transition-colors">
                <Cog6ToothIcon className="w-5 h-5 text-theme-secondary" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-6 lg:px-8 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Portfolio Wert</p>
            <p className="text-2xl font-bold text-theme-primary">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-theme-muted mt-1">
              inkl. {formatCurrency(cashPositionDisplay)} Cash
            </p>
          </div>

          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Cash Position</p>
            <p className="text-2xl font-bold text-theme-primary">
              {formatCurrency(cashPositionDisplay)}
            </p>
            <p className="text-xs text-theme-muted mt-1">
              {totalValue > 0 ? formatPercentage((cashPositionDisplay / totalValue) * 100, false) : '0%'} des Portfolios
            </p>
          </div>

          <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
            <p className="text-sm text-theme-secondary mb-1">Rendite</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
            <p className="text-sm text-theme-secondary mb-1">Aktive Investments</p>
            <p className="text-2xl font-bold text-theme-primary">
              {activeInvestments}
            </p>
            <p className="text-xs text-theme-muted mt-1">
              Positionen
            </p>
          </div>
        </div>

        {/* Currency Info */}
        {currency === 'EUR' && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-theme-secondary">
                <span className="font-medium text-theme-primary">Währungshinweis:</span> Alle Werte werden mit historischen und aktuellen Wechselkursen 
                umgerechnet {exchangeRate ? `(aktuell: 1 USD = ${exchangeRate.toFixed(4)} EUR)` : '(Wechselkurs derzeit nicht verfügbar - Werte in USD)'}.
                Performance-Berechnungen berücksichtigen Währungseffekte korrekt.
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b border-theme/10 mb-6 overflow-x-auto">
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
              className={`pb-3 px-1 font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
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
            {/* Add Position Modal */}
            {showAddPosition && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                    {/* Position Type Selector */}
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

                    {/* Cash Fields */}
                    {positionType === 'cash' && (
                      <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                          Cash-Betrag ({currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder={currency === 'EUR' ? "1.000,00" : "1000.00"}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                        />
                        <p className="text-xs text-theme-muted mt-1">
                          💡 Cash wird zu deiner bestehenden Position hinzugefügt
                        </p>
                      </div>
                    )}

                    {/* Stock Fields */}
                    {positionType === 'stock' && (
                      <>
                        {/* Stock Search */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Aktie suchen
                      </label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setSelectedStock(null)
                        }}
                        placeholder="Symbol oder Name eingeben (z.B. MSFT oder Microsoft)"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                      
                      {/* Loading Indicator */}
                      {searchLoading && (
                        <div className="absolute right-3 top-[38px] transform -translate-y-1/2">
                          <ArrowPathIcon className="w-4 h-4 text-theme-secondary animate-spin" />
                        </div>
                      )}
                      
                      {/* Autocomplete Dropdown */}
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-theme-card border border-theme/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((stock) => (
                            <button
                              key={stock.symbol}
                              onClick={() => handleStockSelect(stock)}
                              className="w-full px-4 py-3 text-left hover:bg-theme-secondary/50 transition-colors border-b border-theme/10 last:border-0"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-theme-primary text-sm">{stock.symbol}</span>
                                  <p className="text-xs text-theme-secondary mt-0.5 truncate">{stock.name}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-theme-muted">{stock.stockExchange}</span>
                                  {stock.exchangeShortName && (
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-theme-secondary rounded">
                                      {stock.exchangeShortName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Stock Display */}
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

                    {/* Quantity Input */}
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

                    {/* Currency Selection */}
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">
                        Kaufpreis-Währung
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPurchaseCurrency('EUR')}
                          className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                            purchaseCurrency === 'EUR'
                              ? 'border-green-400 bg-green-400/10 text-green-400'
                              : 'border-theme/20 hover:border-theme/40 text-theme-secondary'
                          }`}
                        >
                          EUR €
                        </button>
                        <button
                          onClick={() => setPurchaseCurrency('USD')}
                          className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                            purchaseCurrency === 'USD'
                              ? 'border-green-400 bg-green-400/10 text-green-400'
                              : 'border-theme/20 hover:border-theme/40 text-theme-secondary'
                          }`}
                        >
                          USD $
                        </button>
                      </div>
                    </div>

                    {/* Purchase Price Input */}
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Kaufpreis pro Aktie
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newPurchasePrice}
                          onChange={(e) => setNewPurchasePrice(e.target.value)}
                          placeholder={purchaseCurrency === 'EUR' ? "150,00" : "150.00"}
                          className="w-full px-3 py-2 pr-12 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                        />
                        <span className="absolute right-3 top-2 text-theme-muted text-sm">
                          {purchaseCurrency === 'EUR' ? '€' : '$'}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Fees */}
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Gebühren (optional)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={transactionFees}
                          onChange={(e) => setTransactionFees(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 pr-12 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
                        />
                        <span className="absolute right-3 top-2 text-theme-muted text-sm">
                          {purchaseCurrency === 'EUR' ? '€' : '$'}
                        </span>
                      </div>
                      <p className="text-xs text-theme-muted mt-1">
                        Broker-Gebühren, Orderentgelt, etc.
                      </p>
                    </div>

                    {/* Total Cost Display */}
                    {newQuantity && newPurchasePrice && (
                      <div className="bg-white/5 rounded-2xl p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-theme-secondary">Aktien ({newQuantity}×)</span>
                            <span className="text-theme-primary">
                              {(parseFloat(newQuantity) * parseFloat(newPurchasePrice)).toFixed(2)} {purchaseCurrency}
                            </span>
                          </div>
                          {transactionFees && parseFloat(transactionFees) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-theme-secondary">Gebühren</span>
                              <span className="text-theme-primary">
                                {parseFloat(transactionFees).toFixed(2)} {purchaseCurrency}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold border-t border-white/10 pt-2">
                            <span className="text-white">Gesamtkosten</span>
                            <span className="text-white">
                              {((parseFloat(newQuantity) * parseFloat(newPurchasePrice)) + (parseFloat(transactionFees) || 0)).toFixed(2)} {purchaseCurrency}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Purchase Date Input */}
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
                      <p className="text-xs text-theme-muted mt-1">
                        Für korrekte Performance-Berechnung mit historischem Wechselkurs
                      </p>
                    </div>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleAddPosition}
                        disabled={addingPosition || !selectedStock || !newQuantity || !newPurchasePrice}
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

            {/* Holdings Table */}
            <div className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden">
              <div className="p-4 border-b border-theme/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-theme-primary">Ihre Positionen</h2>
                <button 
                  onClick={() => setShowAddPosition(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Position hinzufügen
                </button>
              </div>

              {holdings.length > 0 ? (
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
                                  {holding.currency_aware && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                      <span className="text-xs text-blue-400">Currency adjusted</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-right px-4 py-4">
                              <p className="font-semibold text-theme-primary">
                                {holding.quantity.toLocaleString('de-DE')}
                              </p>
                              <p className="text-xs text-theme-muted">Shares</p>
                            </td>
                            <td className="text-right px-4 py-4">
                              <p className="font-semibold text-theme-primary">
                                {formatStockPrice(holding.purchase_price_display)}
                              </p>
                              <p className="text-xs text-theme-muted">Avg Cost</p>
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
                                {totalValue > 0 ? formatPercentage((holding.value / totalValue) * 100, false) : '0%'} of Portfolio
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

            {/* Coming Soon Message */}
            <div className="mt-8 bg-theme-card rounded-xl p-6 border border-theme/10">
              <h3 className="text-lg font-semibold text-theme-primary mb-2">📊 Charts Coming Soon</h3>
              <p className="text-theme-secondary">
                Portfolio Performance Charts und Asset Allocation Visualisierungen werden in der nächsten Version hinzugefügt. 
                Aktuell können Sie Ihre Positionen verwalten und die Performance in der Tabelle verfolgen.
              </p>
            </div>
          </>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {newsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin mx-auto mb-3" />
                  <p className="text-theme-secondary">Lade Portfolio News...</p>
                </div>
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
                  Fügen Sie Positionen hinzu, um aktuelle Nachrichten zu Ihren Aktien zu sehen.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <PortfolioCalendar 
            holdings={holdings.map(h => ({
              symbol: h.symbol,
              name: h.name,
              quantity: h.quantity
            }))} 
          />
        )}

        {/* Dividends Tab */}
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

        {/* Insights Tab */}
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
            
            {/* Coming Soon für weitere Insights */}
            <div className="bg-theme-card rounded-xl border border-theme/10 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ChartBarIcon className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-theme-primary mb-2">
                  Weitere Analysen Coming Soon
                </h3>
                <p className="text-theme-secondary text-sm max-w-md mx-auto">
                  Risiko-Analyse, Performance Attribution und KI-basierte Empfehlungen werden in Kürze verfügbar sein.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
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
      </main>
    </div>
  )
}