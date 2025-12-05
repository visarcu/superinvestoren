// src/app/(terminal)/analyse/portfolio/neu/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  BriefcaseIcon, 
  ArrowLeftIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import StockSymbolAutocomplete from '@/components/StockSymbolAutocomplete'
import { supabase } from '@/lib/supabaseClient'
import { checkUserPremiumStatus } from '@/lib/premiumCheck'

interface StockPosition {
  symbol: string
  name: string
  quantity: number
  purchasePrice: number
  purchaseDate: string
}

export default function NewPortfolioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [existingPortfolios, setExistingPortfolios] = useState(0)
  
  // Portfolio Create Form State
  const [portfolioName, setPortfolioName] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [cashPosition, setCashPosition] = useState('')
  
  // Stock Positions
  const [positions, setPositions] = useState<StockPosition[]>([
    { symbol: '', name: '', quantity: 0, purchasePrice: 0, purchaseDate: new Date().toISOString().split('T')[0] }
  ])

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const premiumStatus = await checkUserPremiumStatus()
      setIsPremium(premiumStatus?.isPremium || false)

      const { data: portfolios, error } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)

      if (error) throw error
      const portfolioCount = portfolios?.length || 0
      setExistingPortfolios(portfolioCount)

      // Non-premium users can only have 1 portfolio
      if (portfolioCount > 0 && !premiumStatus?.isPremium) {
        router.push('/pricing')
        return
      }

    } catch (error) {
      console.error('Error checking permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const addPosition = () => {
    setPositions([...positions, { 
      symbol: '', 
      name: '', 
      quantity: 0, 
      purchasePrice: 0, 
      purchaseDate: new Date().toISOString().split('T')[0]
    }])
  }

  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index))
  }

  const updatePosition = (index: number, field: keyof StockPosition, value: any) => {
    const newPositions = [...positions]
    newPositions[index] = { ...newPositions[index], [field]: value }
    setPositions(newPositions)
  }

  const handleCreatePortfolio = async () => {
    if (!portfolioName.trim()) {
      alert('Bitte geben Sie einen Portfolio-Namen ein')
      return
    }

    setCreating(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      // 1. Portfolio erstellen
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          name: portfolioName,
          currency: currency,
          cash_position: cashPosition ? parseFloat(cashPosition) : 0,
          is_default: existingPortfolios === 0
        })
        .select()
        .single()

      if (portfolioError) throw portfolioError

      // 2. Positionen hinzufügen wenn vorhanden
      if (positions.some(p => p.symbol && p.quantity > 0)) {
        const { currencyManager } = await import('@/lib/portfolioCurrency')
        
        const validPositions = await Promise.all(
          positions
            .filter(p => p.symbol && p.quantity > 0)
            .map(async (p) => {
              const conversionResult = await currencyManager.convertNewPositionToUSD(
                p.purchasePrice,
                currency as 'USD' | 'EUR'
              )
              
              return {
                portfolio_id: portfolio.id,
                symbol: p.symbol.toUpperCase(),
                name: p.name || p.symbol,
                quantity: p.quantity,
                purchase_price: conversionResult.priceUSD,
                purchase_date: p.purchaseDate || new Date().toISOString().split('T')[0],
                purchase_currency: currency,
                purchase_exchange_rate: conversionResult.exchangeRate,
                purchase_price_original: p.purchasePrice,
                currency_metadata: conversionResult.metadata
              }
            })
        )

        if (validPositions.length > 0) {
          const { error: holdingsError } = await supabase
            .from('portfolio_holdings')
            .insert(validPositions)

          if (holdingsError) throw holdingsError
        }
      }

      router.push('/analyse/portfolio/dashboard')
      
    } catch (error: any) {
      console.error('Error creating portfolio:', error)
      alert(`Fehler: ${error.message || 'Unbekannter Fehler'}`)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="flex items-center gap-3">
          <ArrowPathIcon className="w-5 h-5 text-green-400 animate-spin" />
          <span className="text-theme-secondary">Lade...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/analyse/portfolio/dashboard"
              className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Zurück zum Portfolio
            </Link>
            <span className="text-theme-muted">•</span>
            <Link
              href="/analyse/portfolio/verwaltung"
              className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Portfolios verwalten
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <BriefcaseIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                Neues Portfolio erstellen
              </h1>
              <p className="text-sm text-theme-muted mt-1">
                {existingPortfolios === 0 
                  ? 'Starten Sie mit Ihrem ersten Portfolio'
                  : `Portfolio ${existingPortfolios + 1} erstellen`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          
          {/* Step 1: Basic Information */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <h2 className="text-lg font-semibold text-theme-primary">
                Basis-Informationen
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="z.B. Dividenden-Portfolio"
                  className="w-full px-4 py-3 bg-theme-input border border-theme/20 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Währung
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-theme-input border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:border-green-400 transition-colors"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Cash-Position
                  </label>
                  <input
                    type="number"
                    value={cashPosition}
                    onChange={(e) => setCashPosition(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-theme-input border border-theme/20 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Stock Positions */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h2 className="text-lg font-semibold text-theme-primary">
                Positionen hinzufügen
              </h2>
              <span className="text-sm text-theme-muted">(optional)</span>
            </div>

            <div className="space-y-4">
              {positions.map((position, index) => (
                <div key={index} className="p-4 bg-theme-secondary/30 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-theme-secondary mb-2">
                        Aktie suchen
                      </label>
                      <StockSymbolAutocomplete
                        value={position.symbol}
                        onChange={(symbol, name) => {
                          updatePosition(index, 'symbol', symbol)
                          if (name) updatePosition(index, 'name', name)
                        }}
                        placeholder="z.B. AAPL"
                        className="bg-theme-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-theme-secondary mb-2">
                        Anzahl Stück
                      </label>
                      <input
                        type="number"
                        value={position.quantity || ''}
                        onChange={(e) => updatePosition(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-theme-input border border-theme/20 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-theme-secondary mb-2">
                        Einstandskurs ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={position.purchasePrice || ''}
                        onChange={(e) => updatePosition(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                        placeholder="150.00"
                        className="w-full px-3 py-2 bg-theme-input border border-theme/20 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-400"
                      />
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">
                          Kaufdatum
                        </label>
                        <input
                          type="date"
                          value={position.purchaseDate}
                          onChange={(e) => updatePosition(index, 'purchaseDate', e.target.value)}
                          className="w-full px-3 py-2 bg-theme-input border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:border-green-400"
                        />
                      </div>
                      
                      {positions.length > 1 && (
                        <button
                          onClick={() => removePosition(index)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {position.symbol && position.name && (
                    <div className="mt-3 p-2 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">
                          {position.symbol} - {position.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addPosition}
                className="w-full py-3 border-2 border-dashed border-theme/30 hover:border-green-400 text-theme-secondary hover:text-green-400 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Weitere Position hinzufügen
              </button>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreatePortfolio}
            disabled={creating || !portfolioName.trim()}
            className="w-full py-4 bg-green-500 hover:bg-green-400 disabled:bg-theme-secondary disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
          >
            {creating ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Portfolio wird erstellt...
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                Portfolio erstellen
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
