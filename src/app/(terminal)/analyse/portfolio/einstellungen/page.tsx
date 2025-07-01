// src/app/analyse/portfolio/einstellungen/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  BellIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'

// Types
interface PortfolioPosition {
  id: number
  ticker: string
  name: string
  shares: number
  avgPrice: number
  currentPrice: number
  dividendYield: number
  totalValue: number
  gainLoss: number
  gainLossPercent: number
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
}

interface EditStockForm extends AddStockForm {
  id: number
  name: string
}

// Mock Portfolio Data
const MOCK_PORTFOLIO: PortfolioPosition[] = [
  { 
    id: 1, ticker: 'AAPL', name: 'Apple Inc.', shares: 100, avgPrice: 150.00, 
    currentPrice: 175.50, dividendYield: 0.51, totalValue: 17550, gainLoss: 2550, gainLossPercent: 17.0
  },
  { 
    id: 2, ticker: 'MSFT', name: 'Microsoft Corp.', shares: 50, avgPrice: 280.00, 
    currentPrice: 420.00, dividendYield: 0.73, totalValue: 21000, gainLoss: 7000, gainLossPercent: 50.0
  },
  { 
    id: 3, ticker: 'JNJ', name: 'Johnson & Johnson', shares: 75, avgPrice: 160.00, 
    currentPrice: 165.20, dividendYield: 2.95, totalValue: 12390, gainLoss: 390, gainLossPercent: 3.25
  },
  { 
    id: 4, ticker: 'KO', name: 'Coca-Cola Co.', shares: 200, avgPrice: 55.00, 
    currentPrice: 62.30, dividendYield: 3.10, totalValue: 12460, gainLoss: 1460, gainLossPercent: 13.27
  }
]

// Stock validation via FMP API
async function validateStock(ticker: string): Promise<{ valid: boolean, name?: string, price?: number }> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`
    )
    
    if (!response.ok) return { valid: false }
    
    const [data] = await response.json()
    if (data && data.companyName) {
      return {
        valid: true,
        name: data.companyName,
        price: data.price || 0
      }
    }
    
    return { valid: false }
  } catch (error) {
    console.error('Stock validation error:', error)
    return { valid: false }
  }
}

export default function EinstellungenPage() {
  const [user, setUser] = useState<User | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'positions' | 'import' | 'export' | 'notifications'>('positions')
  
  // Add/Edit Stock States
  const [showAddStock, setShowAddStock] = useState(false)
  const [editingStock, setEditingStock] = useState<EditStockForm | null>(null)
  const [addStockForm, setAddStockForm] = useState<AddStockForm>({
    ticker: '', shares: '', avgPrice: '', purchaseDate: ''
  })
  const [stockValidation, setStockValidation] = useState<{ loading: boolean, valid?: boolean, name?: string }>({ loading: false })

  // Settings States
  const [notifications, setNotifications] = useState({
    dividendAlerts: true,
    priceAlerts: false,
    newsAlerts: true,
    weeklyReport: true
  })

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
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
        }

        // Load portfolio (später aus Supabase)
        setPortfolio(MOCK_PORTFOLIO)
        
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Validate stock ticker on input
  useEffect(() => {
    const validateTicker = async () => {
      if (addStockForm.ticker.length >= 2) {
        setStockValidation({ loading: true })
        const result = await validateStock(addStockForm.ticker.toUpperCase())
        setStockValidation({ loading: false, valid: result.valid, name: result.name })
      } else {
        setStockValidation({ loading: false })
      }
    }

    const debounceTimer = setTimeout(validateTicker, 500)
    return () => clearTimeout(debounceTimer)
  }, [addStockForm.ticker])

  const handleAddStock = async () => {
    if (!stockValidation.valid || !addStockForm.shares || !addStockForm.avgPrice) return

    // Mock current price fetch
    const currentPrice = Math.random() * 100 + 50 // Mock price
    const shares = parseInt(addStockForm.shares)
    const avgPrice = parseFloat(addStockForm.avgPrice)
    const totalValue = shares * currentPrice
    const costBasis = shares * avgPrice
    const gainLoss = totalValue - costBasis
    const gainLossPercent = (gainLoss / costBasis) * 100

    const newPosition: PortfolioPosition = {
      id: Date.now(),
      ticker: addStockForm.ticker.toUpperCase(),
      name: stockValidation.name || `${addStockForm.ticker.toUpperCase()} Corp.`,
      shares,
      avgPrice,
      currentPrice,
      dividendYield: Math.random() * 3, // Mock dividend yield
      totalValue,
      gainLoss,
      gainLossPercent
    }

    setPortfolio(prev => [...prev, newPosition])
    setAddStockForm({ ticker: '', shares: '', avgPrice: '', purchaseDate: '' })
    setShowAddStock(false)
    setStockValidation({ loading: false })

    // TODO: Save to Supabase
  }

  const handleEditStock = (position: PortfolioPosition) => {
    setEditingStock({
      id: position.id,
      ticker: position.ticker,
      name: position.name,
      shares: position.shares.toString(),
      avgPrice: position.avgPrice.toString(),
      purchaseDate: ''
    })
  }

  const handleUpdateStock = () => {
    if (!editingStock) return

    setPortfolio(prev => prev.map(pos => {
      if (pos.id === editingStock.id) {
        const newShares = parseInt(editingStock.shares)
        const newAvgPrice = parseFloat(editingStock.avgPrice)
        const newTotalValue = newShares * pos.currentPrice
        const newCostBasis = newShares * newAvgPrice
        const newGainLoss = newTotalValue - newCostBasis
        const newGainLossPercent = (newGainLoss / newCostBasis) * 100

        return {
          ...pos,
          shares: newShares,
          avgPrice: newAvgPrice,
          totalValue: newTotalValue,
          gainLoss: newGainLoss,
          gainLossPercent: newGainLossPercent
        }
      }
      return pos
    }))

    setEditingStock(null)
    // TODO: Update in Supabase
  }

  const handleDeleteStock = (id: number) => {
    if (confirm('Möchten Sie diese Position wirklich löschen?')) {
      setPortfolio(prev => prev.filter(pos => pos.id !== id))
      // TODO: Delete from Supabase
    }
  }

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      const lines = csv.split('\n')
      const headers = lines[0].split(',')
      
      // Parse CSV and validate format
      console.log('CSV Import:', { headers, lineCount: lines.length })
      // TODO: Implement CSV parsing and validation
    }
    reader.readAsText(file)
  }

  const exportToCSV = () => {
    const headers = ['Ticker', 'Name', 'Shares', 'Avg Price', 'Current Price', 'Total Value', 'Gain/Loss', 'Gain/Loss %', 'Dividend Yield']
    const csvContent = [
      headers.join(','),
      ...portfolio.map(pos => [
        pos.ticker,
        `"${pos.name}"`,
        pos.shares,
        pos.avgPrice.toFixed(2),
        pos.currentPrice.toFixed(2),
        pos.totalValue.toFixed(2),
        pos.gainLoss.toFixed(2),
        pos.gainLossPercent.toFixed(2),
        pos.dividendYield.toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="h-full bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary">Einstellungen werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-theme-primary text-theme-primary overflow-auto">
      {/* Header */}
      <div className="bg-theme-secondary border-b border-theme">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/analyse/portfolio"
                className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Portfolio</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">Portfolio verwalten</h1>
                <p className="text-theme-secondary">Positionen bearbeiten, importieren und exportieren</p>
              </div>
            </div>
          </div>
          
          {/* Sub Navigation */}
          <div className="mt-4">
            <nav className="flex space-x-6">
              {[
                { id: 'positions', label: 'Positionen', icon: Cog6ToothIcon },
                { id: 'import', label: 'Import', icon: DocumentArrowUpIcon },
                { id: 'export', label: 'Export', icon: DocumentArrowDownIcon },
                { id: 'notifications', label: 'Benachrichtigungen', icon: BellIcon }
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeView === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`flex items-center gap-2 py-2 text-sm font-medium border-b-2 transition-colors
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
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'positions' && (
          <>
            {/* Add Position Button */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-theme-primary">Meine Positionen</h2>
              <button
                onClick={() => setShowAddStock(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Position hinzufügen
              </button>
            </div>

            {/* Positions Table */}
            <div className="bg-theme-card border border-theme rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-secondary">
                  <tr>
                    <th className="text-left py-3 px-6 text-theme-secondary font-medium">Aktie</th>
                    <th className="text-right py-3 px-6 text-theme-secondary font-medium">Anzahl</th>
                    <th className="text-right py-3 px-6 text-theme-secondary font-medium">Ø Preis</th>
                    <th className="text-right py-3 px-6 text-theme-secondary font-medium">Aktuell</th>
                    <th className="text-right py-3 px-6 text-theme-secondary font-medium">Wert</th>
                    <th className="text-right py-3 px-6 text-theme-secondary font-medium">G/V</th>
                    <th className="text-center py-3 px-6 text-theme-secondary font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((position) => (
                    <tr key={position.id} className="border-t border-theme hover:bg-theme-secondary/30">
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-semibold text-theme-primary">{position.ticker}</div>
                          <div className="text-sm text-theme-muted">{position.name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-theme-primary">{position.shares}</td>
                      <td className="py-4 px-6 text-right text-theme-primary">${position.avgPrice.toFixed(2)}</td>
                      <td className="py-4 px-6 text-right text-theme-primary">${position.currentPrice.toFixed(2)}</td>
                      <td className="py-4 px-6 text-right text-theme-primary font-semibold">${position.totalValue.toLocaleString()}</td>
                      <td className={`py-4 px-6 text-right font-semibold ${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.gainLoss >= 0 ? '+' : ''}${position.gainLoss.toFixed(0)} ({position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent.toFixed(1)}%)
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditStock(position)}
                            className="p-1 text-theme-muted hover:text-blue-400 rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStock(position.id)}
                            className="p-1 text-theme-muted hover:text-red-400 rounded transition-colors"
                            title="Löschen"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeView === 'import' && (
          <div className="space-y-6">
            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">CSV Import</h3>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center">
                  <DocumentArrowUpIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
                  <h4 className="text-theme-primary font-medium mb-2">Portfolio CSV hochladen</h4>
                  <p className="text-theme-muted text-sm mb-4">
                    Unterstützte Formate: CSV mit Spalten für Ticker, Anzahl, Durchschnittspreis
                  </p>
                  
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md cursor-pointer transition-colors">
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    CSV-Datei auswählen
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h5 className="text-blue-400 font-medium mb-2">CSV Format-Beispiel:</h5>
                  <pre className="text-sm text-theme-secondary bg-theme-secondary p-3 rounded font-mono">
{`Ticker,Name,Shares,AvgPrice,PurchaseDate
AAPL,Apple Inc.,100,150.00,2024-01-15
MSFT,Microsoft Corp.,50,280.00,2024-02-10
GOOGL,Alphabet Inc.,25,120.00,2024-03-05`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Broker Import</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Trade Republic', status: 'Geplant' },
                  { name: 'Scalable Capital', status: 'Geplant' },
                  { name: 'ING DiBa', status: 'Geplant' },
                  { name: 'Comdirect', status: 'Geplant' }
                ].map((broker) => (
                  <div key={broker.name} className="p-4 border border-theme rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-theme-primary">{broker.name}</span>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        {broker.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'export' && (
          <div className="space-y-6">
            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Portfolio exportieren</h3>
              
              <div className="space-y-4">
                <button
                  onClick={exportToCSV}
                  className="w-full text-left p-4 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors border border-theme"
                >
                  <div className="flex items-center gap-3">
                    <DocumentArrowDownIcon className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="font-medium text-theme-primary">CSV Export</div>
                      <div className="text-sm text-theme-muted">
                        Portfolio-Daten für Excel, Google Sheets oder andere Tools
                      </div>
                    </div>
                  </div>
                </button>

                <button className="w-full text-left p-4 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors border border-theme">
                  <div className="flex items-center gap-3">
                    <DocumentArrowDownIcon className="w-6 h-6 text-blue-400" />
                    <div>
                      <div className="font-medium text-theme-primary">PDF Report</div>
                      <div className="text-sm text-theme-muted">
                        Detaillierter Portfolio-Bericht mit Charts und Kennzahlen
                      </div>
                    </div>
                  </div>
                </button>

                <button className="w-full text-left p-4 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors border border-theme">
                  <div className="flex items-center gap-3">
                    <DocumentArrowDownIcon className="w-6 h-6 text-purple-400" />
                    <div>
                      <div className="font-medium text-theme-primary">Steuer-Export</div>
                      <div className="text-sm text-theme-muted">
                        Dividenden und Kapitalerträge für die Steuererklärung
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Benachrichtigungseinstellungen</h3>
              
              <div className="space-y-4">
                {Object.entries({
                  dividendAlerts: 'Dividenden-Ankündigungen',
                  priceAlerts: 'Kurs-Alerts bei +/- 5%',
                  newsAlerts: 'Wichtige Unternehmensnews',
                  weeklyReport: 'Wöchentlicher Portfolio-Report'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-3 border border-theme rounded-lg">
                    <span className="text-theme-primary">{label}</span>
                    <input
                      type="checkbox"
                      checked={notifications[key as keyof typeof notifications]}
                      onChange={(e) => setNotifications(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="w-4 h-4 text-green-500 bg-theme-secondary border-theme rounded focus:ring-green-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Benachrichtigungskanäle</h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-theme rounded-lg">
                  <span className="text-theme-primary">E-Mail Benachrichtigungen</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-green-500" />
                </label>
                
                <label className="flex items-center justify-between p-3 border border-theme rounded-lg">
                  <span className="text-theme-primary">Browser Push-Notifications</span>
                  <input type="checkbox" className="w-4 h-4 text-green-500" />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-card border border-theme rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Position hinzufügen</h3>
              <button
                onClick={() => {
                  setShowAddStock(false)
                  setAddStockForm({ ticker: '', shares: '', avgPrice: '', purchaseDate: '' })
                  setStockValidation({ loading: false })
                }}
                className="p-1 text-theme-muted hover:text-theme-primary rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Ticker Symbol *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={addStockForm.ticker}
                    onChange={(e) => setAddStockForm(prev => ({...prev, ticker: e.target.value.toUpperCase()}))}
                    className="w-full px-3 py-2 pr-10 bg-theme-secondary border border-theme rounded-md text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20"
                    placeholder="z.B. AAPL"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {stockValidation.loading && (
                      <div className="w-4 h-4 border border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {stockValidation.valid === true && (
                      <CheckIcon className="w-4 h-4 text-green-400" />
                    )}
                    {stockValidation.valid === false && addStockForm.ticker.length >= 2 && (
                      <XMarkIcon className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                {stockValidation.name && (
                  <p className="text-xs text-green-400 mt-1">{stockValidation.name}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Anzahl Aktien *</label>
                  <input
                    type="number"
                    min="1"
                    value={addStockForm.shares}
                    onChange={(e) => setAddStockForm(prev => ({...prev, shares: e.target.value}))}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20"
                    placeholder="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Ø Kaufpreis *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addStockForm.avgPrice}
                    onChange={(e) => setAddStockForm(prev => ({...prev, avgPrice: e.target.value}))}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20"
                    placeholder="150.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Kaufdatum (optional)</label>
                <input
                  type="date"
                  value={addStockForm.purchaseDate}
                  onChange={(e) => setAddStockForm(prev => ({...prev, purchaseDate: e.target.value}))}
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStock(false)
                  setAddStockForm({ ticker: '', shares: '', avgPrice: '', purchaseDate: '' })
                  setStockValidation({ loading: false })
                }}
                className="flex-1 px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary border border-theme rounded-md transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddStock}
                disabled={!stockValidation.valid || !addStockForm.shares || !addStockForm.avgPrice}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {editingStock && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-card border border-theme rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Position bearbeiten</h3>
              <button
                onClick={() => setEditingStock(null)}
                className="p-1 text-theme-muted hover:text-theme-primary rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Aktie</label>
                <div className="p-3 bg-theme-secondary rounded-md">
                  <div className="font-semibold text-theme-primary">{editingStock.ticker}</div>
                  <div className="text-sm text-theme-muted">{editingStock.name}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Anzahl Aktien</label>
                  <input
                    type="number"
                    min="1"
                    value={editingStock.shares}
                    onChange={(e) => setEditingStock(prev => prev ? {...prev, shares: e.target.value} : null)}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Ø Kaufpreis</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingStock.avgPrice}
                    onChange={(e) => setEditingStock(prev => prev ? {...prev, avgPrice: e.target.value} : null)}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingStock(null)}
                className="flex-1 px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary border border-theme rounded-md transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleUpdateStock}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}