// src/app/analyse/portfolio/page.tsx - TYPESCRIPT FIXED VERSION //brkn
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
  ChartPieIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Link from 'next/link'

// ✅ IMPROVED TYPES
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
  price_source?: string
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

interface AuthDebugInfo {
  isAuthenticated: boolean
  user: {
    id: string
    email?: string
  } | null  // ✅ FIXED: Explizit null als Möglichkeit
  session: any
  errors: {
    sessionError?: string
    userError?: string
    exception?: string
  }
}

// ✅ ENHANCED CLIENT AUTH DEBUG mit besseren Types
async function debugClientAuth(): Promise<AuthDebugInfo> {
  try {
    console.log('🔍 [Client Auth Debug] Starting auth check...')
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    console.log('🔍 [Client Auth Debug] Session:', {
      hasSession: !!sessionData.session,
      hasUser: !!sessionData.session?.user,
      userId: sessionData.session?.user?.id,
      email: sessionData.session?.user?.email,
      sessionError: sessionError?.message,
      tokenPresent: !!sessionData.session?.access_token
    })
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    console.log('🔍 [Client Auth Debug] User:', {
      hasUser: !!userData.user,
      userId: userData.user?.id,
      userError: userError?.message
    })
    
    const cookies = document.cookie
    const hasSupabaseCookies = cookies.includes('supabase')
    
    console.log('🔍 [Client Auth Debug] Cookies:', {
      hasCookies: !!cookies,
      hasSupabaseCookies,
      cookieCount: cookies.split(';').length
    })
    
    // ✅ FIXED: Bessere User-Auswahl mit null handling
    const user = sessionData.session?.user || userData.user || null
    
    return {
      isAuthenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,  // ✅ FIXED: Explizit null wenn kein user
      session: sessionData.session,
      errors: {
        sessionError: sessionError?.message,
        userError: userError?.message
      }
    }
    
  } catch (error) {
    console.error('❌ [Client Auth Debug] Exception:', error)
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      errors: {
        exception: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
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
  const [authDebugInfo, setAuthDebugInfo] = useState<AuthDebugInfo | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [showAuthDebug, setShowAuthDebug] = useState(false)

  // Add Stock Modal States
  const [showAddStock, setShowAddStock] = useState(false)
  const [addStockForm, setAddStockForm] = useState<AddStockForm>({
    ticker: '', shares: '', avgPrice: '', purchaseDate: '', notes: ''
  })
  const [stockValidation, setStockValidation] = useState<StockValidation>({ loading: false })
  const [submitting, setSubmitting] = useState(false)
  const [searchResults, setSearchResults] = useState<typeof stocks>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // ✅ UTILITY FUNCTIONS
  const resetModal = () => {
    setShowAddStock(false)
    setAddStockForm({ ticker: '', shares: '', avgPrice: '', purchaseDate: '', notes: '' })
    setStockValidation({ loading: false })
    setShowSearchResults(false)
    setSearchResults([])
    setError(null)
  }

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

  const handleStockSelect = (stock: typeof stocks[0]) => {
    setShowSearchResults(false)
    setSearchResults([])
    setAddStockForm(prev => ({ ...prev, ticker: stock.ticker }))
    setStockValidation({
      loading: false,
      valid: true,
      name: stock.name,
      price: 0
    })
  }

  // ✅ ENHANCED User Authentication Check mit TYPESCRIPT FIXES
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🚀 [Portfolio] Starting user authentication check')
        
        const authInfo = await debugClientAuth()
        setAuthDebugInfo(authInfo)
        
        if (!authInfo.isAuthenticated || !authInfo.user) {  // ✅ FIXED: Explizite Null-Prüfung
          console.error('❌ [Portfolio] User not authenticated:', authInfo.errors)
          setError('Sie sind nicht angemeldet. Bitte loggen Sie sich ein.')
          setLoading(false)
          return
        }
        
        // ✅ FIXED: TypeScript-sichere Zugriffe
        console.log('✅ [Portfolio] User authenticated:', authInfo.user.email || 'No email')

        // Profile laden
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('user_id', authInfo.user.id)
          .maybeSingle()

        setUser({
          id: authInfo.user.id,
          email: authInfo.user.email || '',
          isPremium: profile?.is_premium || false
        })

        console.log('✅ [Portfolio] User profile loaded:', {
          id: authInfo.user.id,
          email: authInfo.user.email || 'No email',
          isPremium: profile?.is_premium || false
        })

      } catch (error) {
        console.error('❌ [Portfolio] Error loading user:', error)
        setError('Fehler beim Laden der Benutzerdaten')
        setLoading(false)
      }
    }

    loadUser()

    // ✅ Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [Portfolio] Auth state changed:', event, !!session)
        
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
          setError('Sie wurden abgemeldet. Bitte loggen Sie sich erneut ein.')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ✅ Load Portfolio Data - UNVERÄNDERT aber mit besserer Fehlerbehandlung
  const loadPortfolio = async () => {
    if (!user) {
      console.log('ℹ️ [Portfolio] Skipping portfolio load - no user')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 [Portfolio] Loading portfolio for user:', user.id)

      const response = await fetch('/api/portfolio', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      console.log('🔍 [Portfolio] API Response status:', response.status)

      if (response.status === 401) {
        const errorData = await response.json()
        console.error('❌ [Portfolio] Unauthorized error:', errorData)
        
        setError(`Authentifizierung fehlgeschlagen: ${errorData.details || 'Bitte loggen Sie sich erneut ein'}`)
        setShowAuthDebug(true)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Portfolio konnte nicht geladen werden')
      }

      console.log('✅ [Portfolio] Portfolio loaded successfully:', {
        positions: data.portfolio.positions?.length || 0,
        totalValue: data.portfolio.summary?.total_value || 0
      })

      setPortfolio(data.portfolio.positions || [])
      setSummary(data.portfolio.summary || null)
      setLastUpdated(data.portfolio.lastUpdated)

    } catch (error) {
      console.error('❌ [Portfolio] Load error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden des Portfolios'
      setError(errorMessage)
      setPortfolio([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadPortfolio()
    }
  }, [user])

  // ✅ Stock Validation - UNVERÄNDERT
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

  // ✅ Add Stock - UNVERÄNDERT
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stockValidation.valid || !addStockForm.shares || !addStockForm.avgPrice || !user) {
      setError('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      console.log('🔍 [Portfolio] Adding stock position:', {
        ticker: addStockForm.ticker,
        shares: addStockForm.shares,
        avgPrice: addStockForm.avgPrice
      })

      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ticker: addStockForm.ticker.toUpperCase(),
          shares: parseInt(addStockForm.shares),
          avg_price: parseFloat(addStockForm.avgPrice),
          purchase_date: addStockForm.purchaseDate || null,
          purchase_notes: addStockForm.notes || null,
          currency: 'USD'
        }),
      })

      if (response.status === 401) {
        setError('Authentifizierung fehlgeschlagen. Bitte loggen Sie sich erneut ein.')
        setShowAuthDebug(true)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Position konnte nicht hinzugefügt werden')
      }

      console.log('✅ [Portfolio] Stock position added successfully:', data.position)

      await loadPortfolio()
      resetModal()

    } catch (error) {
      console.error('❌ [Portfolio] Add stock error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Position'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const refreshPrices = async () => {
    setRefreshing(true)
    await loadPortfolio()
    setRefreshing(false)
  }

  // ✅ FORCE REAUTH Function
  const forceReauth = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [Portfolio] Forcing re-authentication...')
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ [Portfolio] Refresh failed:', error)
        window.location.href = '/auth/login'
        return
      }
      
      console.log('✅ [Portfolio] Session refreshed successfully')
      window.location.reload()
      
    } catch (error) {
      console.error('❌ [Portfolio] Reauth error:', error)
      window.location.href = '/auth/login'
    } finally {
      setLoading(false)
    }
  }

  // ✅ RENDER TAB CONTENT - vereinfacht aber funktional
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

    if (activeTab === 'overview' && summary) {
      return (
        <div className="p-6">
          {/* Portfolio Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-muted text-sm font-medium">Portfolio Wert</p>
                  <p className="text-2xl font-bold text-theme-primary">${summary.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                    {summary.total_gain_loss >= 0 ? '+' : ''}${summary.total_gain_loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* Portfolio Table */}
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
                          {position.price_source === 'live' && (
                            <div className="text-xs text-green-400">● Live</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-theme-primary">{position.shares}</td>
                      <td className="py-4 px-6 text-right text-theme-primary">${position.avg_price.toFixed(2)}</td>
                      <td className="py-4 px-6 text-right text-theme-primary">
                        ${(position.current_price || position.avg_price).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-right text-theme-primary font-semibold">
                        ${position.current_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    }

    // Andere Tabs...
    return (
      <div className="p-6">
        <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
          <ChartPieIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-primary mb-2">Bereich in Entwicklung</h3>
          <p className="text-theme-secondary">Dieser Bereich wird in Kürze verfügbar sein.</p>
        </div>
      </div>
    )
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
            <UserIcon className="w-8 h-8 text-theme-muted" />
          </div>
          
          <h2 className="text-2xl font-bold text-theme-primary mb-3">Anmeldung erforderlich</h2>
          <p className="text-theme-secondary mb-8">
            Sie müssen sich anmelden, um Ihr Portfolio zu verwalten.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/auth/login'}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            >
              Zur Anmeldung
            </button>
            
            <button 
              onClick={forceReauth}
              className="w-full px-6 py-3 border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-colors"
            >
              Session erneuern
            </button>
            
            <button 
              onClick={() => setShowAuthDebug(!showAuthDebug)}
              className="text-sm text-theme-muted hover:text-theme-secondary"
            >
              {showAuthDebug ? 'Debug verbergen' : 'Debug anzeigen'}
            </button>
          </div>

          {showAuthDebug && authDebugInfo && (
            <div className="mt-6 p-4 bg-theme-card border border-theme rounded-lg text-left">
              <h4 className="text-sm font-semibold text-theme-primary mb-2">Auth Debug Info</h4>
              <pre className="text-xs text-theme-secondary overflow-auto">
                {JSON.stringify(authDebugInfo, null, 2)}
              </pre>
            </div>
          )}
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
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Angemeldet</span>
              </div>
              
              {portfolio.length > 0 && (
                <>
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
                </>
              )}
            </div>
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
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 mb-3">{error}</p>
              
              {error.includes('Authentifizierung') && (
                <div className="flex gap-2">
                  <button
                    onClick={forceReauth}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                  >
                    Session erneuern
                  </button>
                  <button
                    onClick={() => window.location.href = '/auth/login'}
                    className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 text-sm rounded transition-colors"
                  >
                    Neu anmelden
                  </button>
                  <button
                    onClick={() => setShowAuthDebug(!showAuthDebug)}
                    className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm"
                  >
                    Debug
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          {showAuthDebug && authDebugInfo && (
            <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Debug Information</h4>
              <pre className="text-xs text-red-300 overflow-auto max-h-32">
                {JSON.stringify(authDebugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>

      {/* Add Stock Modal - MINIMALE VERSION für Platz */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-theme-card border border-theme rounded-xl shadow-2xl w-full max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
              <h3 className="text-xl font-semibold text-theme-primary">Aktie hinzufügen</h3>
              <button
                onClick={resetModal}
                className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAddStock} className="space-y-4">
                {/* Vereinfachtes Formular */}
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    Ticker <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addStockForm.ticker}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="w-full px-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                    placeholder="z.B. AAPL, NVDA..."
                    required
                  />
                  
                  {stockValidation.name && (
                    <div className="mt-2 text-sm text-green-400">✓ {stockValidation.name}</div>
                  )}
                  {stockValidation.error && (
                    <div className="mt-2 text-sm text-red-400">✗ {stockValidation.error}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Anzahl <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={addStockForm.shares}
                      onChange={(e) => setAddStockForm(prev => ({...prev, shares: e.target.value}))}
                      className="w-full px-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary focus:border-green-500 focus:outline-none"
                      placeholder="100"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Preis <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addStockForm.avgPrice}
                      onChange={(e) => setAddStockForm(prev => ({...prev, avgPrice: e.target.value}))}
                      className="w-full px-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme-primary focus:border-green-500 focus:outline-none"
                      placeholder="150.00"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="flex-1 px-6 py-3 text-theme-secondary hover:text-theme-primary border border-theme rounded-lg font-medium transition-all"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !stockValidation.valid || !addStockForm.shares || !addStockForm.avgPrice}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/30 text-white font-medium rounded-lg transition-all"
                  >
                    {submitting ? 'Hinzufügen...' : 'Hinzufügen'}
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