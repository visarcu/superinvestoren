// src/app/analyse/portfolio/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { 
  BriefcaseIcon, 
  ArrowLeftIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

// Supabase Client initialisieren (sollte in einer separaten Datei sein)
import { supabase } from '@/lib/supabaseClient'

interface StockPosition {
  symbol: string
  name: string
  quantity: number
  purchasePrice: number
  purchaseDate: string
}

export default function PortfolioPage() {
  const router = useRouter()
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  // Portfolio Create Form State
  const [portfolioName, setPortfolioName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [cashPosition, setCashPosition] = useState('')
  const [setupMethod, setSetupMethod] = useState<'simple' | 'advanced'>('simple')
  
  // Stock Positions
  const [positions, setPositions] = useState<StockPosition[]>([
    { symbol: '', name: '', quantity: 0, purchasePrice: 0, purchaseDate: '' }
  ])

  useEffect(() => {
    checkExistingPortfolio()
  }, [])

  const checkExistingPortfolio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: portfolios, error } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (error) throw error
      
      if (portfolios && portfolios.length > 0) {
        // Hat bereits Portfolio -> zur Übersicht
        router.push('/analyse/portfolio/dashboard')
      } else {
        setHasPortfolio(false)
      }
    } catch (error) {
      console.error('Error checking portfolio:', error)
      setHasPortfolio(false)
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
      purchaseDate: '' 
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
          is_default: true
        })
        .select()
        .single()

      if (portfolioError) throw portfolioError

      // 2. Wenn Simple Setup und Positionen vorhanden
      if (setupMethod === 'simple' && positions.some(p => p.symbol)) {
        const validPositions = positions
          .filter(p => p.symbol && p.quantity > 0)
          .map(p => ({
            portfolio_id: portfolio.id,
            symbol: p.symbol.toUpperCase(),
            name: p.name || p.symbol,
            quantity: p.quantity,
            purchase_price: p.purchasePrice,
            purchase_date: p.purchaseDate || new Date().toISOString().split('T')[0]
          }))

        if (validPositions.length > 0) {
          const { error: holdingsError } = await supabase
            .from('portfolio_holdings')
            .insert(validPositions)

          if (holdingsError) throw holdingsError
        }
      }

      // Erfolg! Zur Dashboard-Seite
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
          <span className="text-theme-secondary">Lade Portfolio...</span>
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

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <BriefcaseIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                Portfolio erstellen
              </h1>
              <p className="text-sm text-theme-muted mt-1">
                Nahtlose Investmentverfolgung für smartere Entscheidungen
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
                  Name
                </label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="Mein Portfolio"
                  className="w-full px-4 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-400 transition-colors"
                />
                <p className="text-xs text-theme-muted mt-1">Name ist erforderlich</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Bevorzugte Währung
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:border-green-400 transition-colors"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
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
                    className="w-full px-4 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-400 transition-colors"
                  />
                  <p className="text-xs text-theme-muted mt-1">{currency}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Setup Method */}
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h2 className="text-lg font-semibold text-theme-primary">
                Setup-Methode
              </h2>
            </div>

            <div className="space-y-3">
              {/* Simple Method */}
              <div 
                onClick={() => setSetupMethod('simple')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  setupMethod === 'simple' 
                    ? 'border-green-400 bg-green-400/10' 
                    : 'border-theme/20 hover:border-theme/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    setupMethod === 'simple' ? 'border-green-400 bg-green-400' : 'border-theme/40'
                  }`}>
                    {setupMethod === 'simple' && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-theme-primary mb-1">
                      ✓ Simple
                    </h3>
                    <ul className="text-sm text-theme-secondary space-y-1">
                      <li>• Verfolgen Sie Ihre bestehenden Positionen</li>
                      <li>• Aufschlüsselung Ihrer Bestände</li>
                      <li>• Sichern Sie Ihre aktuellen Bestände</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Advanced Method */}
              <div 
                onClick={() => setSetupMethod('advanced')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  setupMethod === 'advanced' 
                    ? 'border-green-400 bg-green-400/10' 
                    : 'border-theme/20 hover:border-theme/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    setupMethod === 'advanced' ? 'border-green-400 bg-green-400' : 'border-theme/40'
                  }`}>
                    {setupMethod === 'advanced' && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-theme-primary mb-1">
                      ⭐ Advanced
                    </h3>
                    <ul className="text-sm text-theme-secondary space-y-1">
                      <li>• Verfolgen Sie Ihre bestehenden Positionen</li>
                      <li>• Aufschlüsselung Ihrer Bestände</li>
                      <li>• Startdaten für Positionen einbeziehen</li>
                      <li>• Historischen Portfoliowert verfolgen</li>
                      <li>• Käufe/Verkäufe verfolgen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Stock Positions (nur bei Simple) */}
          {setupMethod === 'simple' && (
            <div className="bg-theme-card rounded-xl p-6 border border-theme/10 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <h2 className="text-lg font-semibold text-theme-primary">
                  Aktienpositionen
                </h2>
              </div>

              <div className="space-y-3">
                {positions.map((position, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-theme-secondary mb-1">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={position.symbol}
                        onChange={(e) => updatePosition(index, 'symbol', e.target.value)}
                        placeholder="AAPL"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded text-theme-primary text-sm"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs text-theme-secondary mb-1">
                        Anzahl
                      </label>
                      <input
                        type="number"
                        value={position.quantity || ''}
                        onChange={(e) => updatePosition(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded text-theme-primary text-sm"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs text-theme-secondary mb-1">
                        Kaufpreis
                      </label>
                      <input
                        type="number"
                        value={position.purchasePrice || ''}
                        onChange={(e) => updatePosition(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                        placeholder="150.00"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded text-theme-primary text-sm"
                      />
                    </div>

                    <button
                      onClick={() => removePosition(index)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      disabled={positions.length === 1}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addPosition}
                  className="w-full py-2 border border-dashed border-theme/40 hover:border-green-400 text-theme-secondary hover:text-green-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Position hinzufügen
                </button>
              </div>
            </div>
          )}

          {/* Advanced Upload Option */}
          {setupMethod === 'advanced' && (
            <div className="bg-theme-card rounded-xl p-6 border border-theme/10 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <h2 className="text-lg font-semibold text-theme-primary">
                  Import Optionen
                </h2>
              </div>

              <div className="border-2 border-dashed border-theme/20 rounded-lg p-8 text-center">
                <DocumentTextIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
                <h3 className="text-theme-primary font-medium mb-2">
                  CSV-Datei hochladen
                </h3>
                <p className="text-sm text-theme-secondary mb-4">
                  Importieren Sie Ihre Transaktionen aus einer CSV-Datei
                </p>
                <button className="px-4 py-2 bg-theme-secondary hover:bg-theme-secondary/70 text-theme-primary rounded-lg transition-colors">
                  Datei auswählen
                </button>
                <p className="text-xs text-theme-muted mt-3">
                  Unterstützte Formate: Interactive Brokers, Comdirect, Trade Republic
                </p>
              </div>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreatePortfolio}
            disabled={creating || !portfolioName.trim()}
            className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:bg-theme-secondary disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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