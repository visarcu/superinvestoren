// src/app/analyse/portfolio/page.tsx - MIT FUNKTIONIERENDEN TABS
'use client'

import React, { useState, useEffect } from 'react'
import { 
  BriefcaseIcon, 
  CalendarIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'

// ✅ TYPES
interface PortfolioPosition {
  id: number
  ticker: string
  company_name: string
  shares: number
  avg_price: number
  current_price: number | null
  currency: string
  purchase_date: string | null
  purchase_notes: string | null
  current_value: number
  cost_basis: number
  unrealized_gain_loss: number
  unrealized_gain_loss_percent: number
  created_at: string
  updated_at: string
}

interface PortfolioSummary {
  total_positions: number
  total_value: number
  total_cost: number
  total_gain_loss: number
  total_gain_loss_percent: number
  annual_dividend_estimate: number
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface AddStockForm {
  ticker: string
  shares: string
  avgPrice: string
  purchaseDate: string
  notes: string
}

interface StockValidation {
  loading: boolean
  valid?: boolean
  name?: string
  price?: number
  error?: string
}

// Portfolio Tabs
const PORTFOLIO_TABS = [
  { id: 'overview', label: 'Übersicht', icon: ChartBarIcon },
  { id: 'dividends', label: 'Dividenden', icon: CalendarIcon },
  { id: 'performance', label: 'Performance', icon: ChartPieIcon },
  { id: 'settings', label: 'Verwalten', icon: Cog6ToothIcon }
]

export default function PortfolioPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Add Stock Modal States
  const [showAddStock, setShowAddStock] = useState(false)
  const [addStockForm, setAddStockForm] = useState<AddStockForm>({
    ticker: '', shares: '', avgPrice: '', purchaseDate: '', notes: ''
  })
  const [stockValidation, setStockValidation] = useState<StockValidation>({ loading: false })
  const [submitting, setSubmitting] = useState(false)
  const [searchResults, setSearchResults] = useState<typeof stocks>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // ✅ UTILITY FUNCTIONS - Defined early
  const resetModal = () => {
    console.log('Resetting modal')
    setShowAddStock(false)
    setAddStockForm({ ticker: '', shares: '', avgPrice: '', purchaseDate: '', notes: '' })
    setStockValidation({ loading: false })
    setShowSearchResults(false)
    setSearchResults([])
    setError(null)
  }

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowSearchResults(false)
    }
  }

  // ✅ Improved search input handler
  const handleSearchInput = (value: string) => {
    const upperValue = value.toUpperCase()
    setAddStockForm(prev => ({...prev, ticker: upperValue}))
    
    if (upperValue.length === 0) {
      setShowSearchResults(false)
      setStockValidation({ loading: false })
      setSearchResults([])
    } else if (upperValue.length >= 1) {
      const filtered = stocks.filter(stock => 
        stock.ticker.toLowerCase().includes(upperValue.toLowerCase()) ||
        stock.name.toLowerCase().includes(upperValue.toLowerCase())
      ).slice(0, 5)
      
      setSearchResults(filtered)
      setShowSearchResults(filtered.length > 0)
    }
  }

  // ✅ Handle stock selection with immediate close
  const handleStockSelect = (stock: typeof stocks[0]) => {
    console.log('Stock selected:', stock.ticker)
    
    // Immediately close dropdown
    setShowSearchResults(false)
    setSearchResults([])
    
    // Set the ticker
    setAddStockForm(prev => ({ ...prev, ticker: stock.ticker }))
    
    // Set validation immediately
    setStockValidation({
      loading: false,
      valid: true,
      name: stock.name,
      price: 0
    })
  }

  // ✅ Handle input focus
  const handleInputFocus = () => {
    if (addStockForm.ticker.length >= 1 && searchResults.length > 0) {
      setShowSearchResults(true)
    }
  }

  // ✅ Handle input blur with delay
  const handleInputBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setShowSearchResults(false)
    }, 150)
  }

  // ✅ Load User Data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Authentifizierungsfehler. Bitte loggen Sie sich erneut ein.')
          setLoading(false)
          return
        }

        if (!session?.user) {
          setError('Sie sind nicht angemeldet. Bitte loggen Sie sich ein.')
          setLoading(false)
          return
        }

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

      } catch (error) {
        console.error('Error loading user:', error)
        setError('Fehler beim Laden der Benutzerdaten')
        setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: false
          })
          setError(null)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setPortfolio([])
          setSummary(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ✅ Load Portfolio Data
  const loadPortfolio = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data: positions, error: positionsError } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (positionsError) {
        throw new Error(`Fehler beim Laden des Portfolios: ${positionsError.message}`)
      }

      const enrichedPositions = positions?.map(position => ({
        ...position,
        current_value: position.shares * (position.current_price || position.avg_price),
        cost_basis: position.shares * position.avg_price,
        unrealized_gain_loss: position.shares * ((position.current_price || position.avg_price) - position.avg_price),
        unrealized_gain_loss_percent: position.avg_price > 0 ? (((position.current_price || position.avg_price) - position.avg_price) / position.avg_price * 100) : 0
      })) || []

      setPortfolio(enrichedPositions)

      const totalValue = enrichedPositions.reduce((sum, pos) => sum + pos.current_value, 0)
      const totalCost = enrichedPositions.reduce((sum, pos) => sum + pos.cost_basis, 0)
      const totalGainLoss = totalValue - totalCost
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

      setSummary({
        total_positions: enrichedPositions.length,
        total_value: totalValue,
        total_cost: totalCost,
        total_gain_loss: totalGainLoss,
        total_gain_loss_percent: totalGainLossPercent,
        annual_dividend_estimate: 0
      })

    } catch (error) {
      console.error('Portfolio load error:', error)
      setError(error instanceof Error ? error.message : 'Fehler beim Laden des Portfolios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadPortfolio()
    }
  }, [user])

  // ✅ Stock Validation - IMPROVED
  useEffect(() => {
    const validateStock = async () => {
      if (addStockForm.ticker.length >= 2) {
        setStockValidation({ loading: true })
        
        const localStock = stocks.find(s => s.ticker.toUpperCase() === addStockForm.ticker.toUpperCase())
        if (localStock) {
          setStockValidation({
            loading: false,
            valid: true,
            name: localStock.name,
            price: 0
          })
          return
        }

        try {
          const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
          if (!apiKey) {
            setStockValidation({ loading: false, valid: false, error: 'API Key fehlt' })
            return
          }

          const response = await fetch(
            `https://financialmodelingprep.com/api/v3/profile/${addStockForm.ticker}?apikey=${apiKey}`
          )
          
          if (response.ok) {
            const [data] = await response.json()
            if (data?.companyName) {
              setStockValidation({
                loading: false,
                valid: true,
                name: data.companyName,
                price: data.price
              })
            } else {
              setStockValidation({
                loading: false,
                valid: false,
                error: 'Aktie nicht gefunden'
              })
            }
          } else {
            setStockValidation({
              loading: false,
              valid: false,
              error: 'Validierung fehlgeschlagen'
            })
          }
        } catch (error) {
          setStockValidation({
            loading: false,
            valid: false,
            error: 'Verbindungsfehler'
          })
        }
      } else if (addStockForm.ticker.length === 0) {
        setStockValidation({ loading: false })
      }
    }

    const debounceTimer = setTimeout(validateStock, 500)
    return () => clearTimeout(debounceTimer)
  }, [addStockForm.ticker])

  const selectStock = (stock: typeof stocks[0]) => {
    setAddStockForm(prev => ({ ...prev, ticker: stock.ticker }))
    setShowSearchResults(false)
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stockValidation.valid || !addStockForm.shares || !addStockForm.avgPrice || !user) {
      setError('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: newPosition, error: insertError } = await supabase
        .from('portfolio_positions')
        .insert({
          user_id: user.id,
          ticker: addStockForm.ticker.toUpperCase(),
          company_name: stockValidation.name,
          shares: parseInt(addStockForm.shares),
          avg_price: parseFloat(addStockForm.avgPrice),
          currency: 'USD',
          purchase_date: addStockForm.purchaseDate || null,
          purchase_notes: addStockForm.notes || null,
          current_price: stockValidation.price,
          last_price_update: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Position konnte nicht hinzugefügt werden: ${insertError.message}`)
      }

      // Success - reload portfolio and reset modal
      await loadPortfolio()
      resetModal()

    } catch (error) {
      console.error('Add stock error:', error)
      setError(error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Position')
    } finally {
      setSubmitting(false)
    }
  }

  const refreshPrices = async () => {
    setRefreshing(true)
    await loadPortfolio()
    setRefreshing(false)
  }

  // ✅ RENDER DIFFERENT CONTENT BASED ON ACTIVE TAB
  const renderTabContent = () => {
    const hasPortfolio = portfolio.length > 0

    if (!hasPortfolio) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-theme-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <BriefcaseIcon className="w-8 h-8 text-theme-muted" />
            </div>
            
            <h2 className="text-2xl font-bold text-theme-primary mb-3">Portfolio erstellen</h2>
            <p className="text-theme-secondary mb-8">
              Fügen Sie Ihre ersten Aktien hinzu und verfolgen Sie automatisch alle wichtigen Kennzahlen.
            </p>
            
            <button 
              onClick={() => setShowAddStock(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              Erste Aktie hinzufügen
            </button>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            {/* Portfolio Stats */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-theme-card border border-theme rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-theme-muted text-sm font-medium">Portfolio Wert</p>
                      <p className="text-2xl font-bold text-theme-primary">${summary.total_value.toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-theme-card border border-theme rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-theme-muted text-sm font-medium">Gesamt G/V</p>
                      <p className={`text-2xl font-bold ${summary.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {summary.total_gain_loss >= 0 ? '+' : ''}${summary.total_gain_loss.toLocaleString()}
                      </p>
                      <p className={`text-sm ${summary.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {summary.total_gain_loss_percent >= 0 ? '+' : ''}{summary.total_gain_loss_percent.toFixed(2)}%
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary.total_gain_loss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {summary.total_gain_loss >= 0 ? (
                        <ArrowUpIcon className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowDownIcon className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-theme-card border border-theme rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-theme-muted text-sm font-medium">Positionen</p>
                      <p className="text-2xl font-bold text-theme-primary">{summary.total_positions}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-theme-card border border-theme rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-theme-muted text-sm font-medium">Jährliche Dividenden</p>
                      <p className="text-2xl font-bold text-green-400">${summary.annual_dividend_estimate.toFixed(2)}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio Holdings */}
            <div className="bg-theme-card border border-theme rounded-lg">
              <div className="p-6 border-b border-theme flex items-center justify-between">
                <h3 className="text-lg font-semibold text-theme-primary">Meine Positionen</h3>
                <button 
                  onClick={() => setShowAddStock(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Hinzufügen
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-theme-secondary">
                    <tr>
                      <th className="text-left py-3 px-6 text-theme-secondary font-medium">Aktie</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Anzahl</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Ø Preis</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Aktuell</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Wert</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">G/V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((position) => (
                      <tr key={position.id} className="border-t border-theme hover:bg-theme-secondary/30">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-theme-primary">{position.ticker}</div>
                            <div className="text-sm text-theme-muted">{position.company_name}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right text-theme-primary">{position.shares}</td>
                        <td className="py-4 px-6 text-right text-theme-primary">${position.avg_price.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right text-theme-primary">
                          ${(position.current_price || position.avg_price).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-right text-theme-primary font-semibold">
                          ${position.current_value.toLocaleString()}
                        </td>
                        <td className={`py-4 px-6 text-right font-semibold ${position.unrealized_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {position.unrealized_gain_loss >= 0 ? '+' : ''}${position.unrealized_gain_loss.toFixed(0)} 
                          <div className="text-xs">
                            ({position.unrealized_gain_loss_percent >= 0 ? '+' : ''}{position.unrealized_gain_loss_percent.toFixed(1)}%)
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'dividends':
        return (
          <div className="p-6">
            <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Dividenden-Tracking</h3>
              <p className="text-theme-secondary mb-6">
                Hier werden automatisch alle Dividendentermine Ihrer Positionen angezeigt.
              </p>
              <div className="text-sm text-theme-muted">
                📅 Dividendenkalender wird in Kürze verfügbar sein
              </div>
            </div>
          </div>
        )

      case 'performance':
        return (
          <div className="p-6">
            <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
              <ChartPieIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Performance-Analyse</h3>
              <p className="text-theme-secondary mb-6">
                Detaillierte Charts und Kennzahlen zur Portfolio-Performance.
              </p>
              <div className="text-sm text-theme-muted">
                📊 Performance-Charts werden in Kürze verfügbar sein
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="p-6">
            <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
              <Cog6ToothIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Portfolio verwalten</h3>
              <p className="text-theme-secondary mb-6">
                Einstellungen für Benachrichtigungen, Export und Portfolio-Verwaltung.
              </p>
              <div className="text-sm text-theme-muted">
                ⚙️ Einstellungen werden in Kürze verfügbar sein
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary">Portfolio wird geladen...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-full bg-theme-primary flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-theme-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <BriefcaseIcon className="w-8 h-8 text-theme-muted" />
          </div>
          
          <h2 className="text-2xl font-bold text-theme-primary mb-3">Anmeldung erforderlich</h2>
          <p className="text-theme-secondary mb-8">
            Sie müssen sich anmelden, um Ihr Portfolio zu verwalten.
          </p>
          
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-theme-primary text-theme-primary">
      {/* Header */}
      <div className="bg-theme-secondary border-b border-theme">
        <div className="px-6">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">Portfolio</h1>
              <p className="text-theme-secondary mt-1">
                Verwalten Sie Ihre Aktienpositionen und verfolgen Sie Dividenden
              </p>
            </div>
            
            {portfolio.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshPrices}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-1.5 text-theme-secondary hover:text-theme-primary transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </button>
                
                <button 
                  onClick={() => setShowAddStock(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Position hinzufügen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-theme-secondary border-b border-theme">
        <div className="px-6">
          <nav className="flex space-x-6">
            {PORTFOLIO_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors
                    ${isActive 
                      ? 'border-green-500 text-green-400' 
                      : 'border-transparent text-theme-secondary hover:text-theme-primary'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ✅ TAB CONTENT - Different content for each tab */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>

      {/* ✅ KOMPLETT ÜBERARBEITETES ADD STOCK MODAL */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-theme-card border border-theme rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[95vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-theme-card">
              <h3 className="text-xl font-semibold text-theme-primary">Aktie hinzufügen</h3>
              <button
                onClick={resetModal}
                className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
              <form onSubmit={handleAddStock} className="space-y-6">
                {/* Stock Search - COMPLETELY REDESIGNED */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-theme-primary">
                    Aktie suchen <span className="text-red-400">*</span>
                  </label>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <MagnifyingGlassIcon className="h-5 w-5 text-theme-muted" />
                    </div>
                    
                    <input
                      type="text"
                      value={addStockForm.ticker}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      className="w-full pl-10 pr-12 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                      placeholder="z.B. NVDA, Apple, Microsoft..."
                      required
                      autoComplete="off"
                    />
                    
                    {/* Status Icon */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-10">
                      {stockValidation.loading && (
                        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {stockValidation.valid === true && (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {stockValidation.valid === false && addStockForm.ticker.length >= 2 && (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <XMarkIcon className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Search Results Dropdown - SMOOTH & FAST */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-50 left-6 right-6 bg-theme-card border border-theme rounded-lg shadow-2xl max-h-48 overflow-hidden">
                      <div className="overflow-y-auto max-h-48">
                        {searchResults.map((stock, index) => (
                          <button
                            key={`search-${stock.ticker}-${index}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              console.log('Mouse down on:', stock.ticker)
                              handleStockSelect(stock)
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-theme-secondary active:bg-theme-secondary transition-colors duration-150 border-b border-theme/20 last:border-b-0 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-theme-primary text-sm">{stock.ticker}</div>
                                <div className="text-xs text-theme-secondary truncate pr-2">{stock.name}</div>
                              </div>
                              <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Validation Messages */}
                  {stockValidation.name && !showSearchResults && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-green-400">{stockValidation.name}</span>
                    </div>
                  )}
                  
                  {stockValidation.error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <XMarkIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-sm text-red-400">{stockValidation.error}</span>
                    </div>
                  )}
                </div>
                
                {/* Amount and Price - RESPONSIVE GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-theme-primary">
                      Anzahl Aktien <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={addStockForm.shares}
                      onChange={(e) => setAddStockForm(prev => ({...prev, shares: e.target.value}))}
                      className="w-full px-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                      placeholder="100"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-theme-primary">
                      Kaufpreis <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-muted">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={addStockForm.avgPrice}
                        onChange={(e) => setAddStockForm(prev => ({...prev, avgPrice: e.target.value}))}
                        className="w-full pl-8 pr-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                        placeholder="150.00"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Purchase Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-theme-primary">
                    Kaufdatum (optional)
                  </label>
                  <input
                    type="date"
                    value={addStockForm.purchaseDate}
                    onChange={(e) => setAddStockForm(prev => ({...prev, purchaseDate: e.target.value}))}
                    className="w-full px-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                
                {/* Action Buttons - MOBILE FRIENDLY */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-theme">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="flex-1 px-6 py-3 text-theme-secondary hover:text-theme-primary border border-theme rounded-lg font-medium transition-all hover:bg-theme-secondary/20"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !stockValidation.valid || !addStockForm.shares || !addStockForm.avgPrice}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/30 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-green-500/25"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Wird hinzugefügt...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <PlusIcon className="w-4 h-4" />
                        <span>Position hinzufügen</span>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}