// src/app/analyse/screener/page.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BookmarkIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  FireIcon,
  TrophyIcon,
  LightBulbIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  ChartPieIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Logo from '@/components/Logo'

// ===== ENHANCED TYPES =====
interface ScreenerCriteria {
  // Basic filters
  marketCapMoreThan?: number
  marketCapLowerThan?: number
  priceMoreThan?: number
  priceLowerThan?: number
  betaMoreThan?: number
  betaLowerThan?: number
  volumeMoreThan?: number
  volumeLowerThan?: number
  dividendMoreThan?: number
  dividendLowerThan?: number
  
  // Growth filters (NEW)
  revenueGrowthMoreThan?: number
  revenueGrowthLowerThan?: number
  epsGrowthMoreThan?: number
  epsGrowthLowerThan?: number
  
  // Profitability filters (NEW)
  roicMoreThan?: number
  roeMoreThan?: number
  grossMarginMoreThan?: number
  operatingMarginMoreThan?: number
  netMarginMoreThan?: number
  
  // Valuation filters (NEW)
  peMoreThan?: number
  peLowerThan?: number
  pegLowerThan?: number
  pbLowerThan?: number
  psLowerThan?: number
  
  // Financial health (NEW)
  currentRatioMoreThan?: number
  debtToEquityLowerThan?: number
  
  // Other
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  isEtf?: boolean
  isActivelyTrading?: boolean
  limit?: number
}

interface StockResult {
  symbol: string
  companyName: string
  marketCap: number
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  volume: number
  avgVolume: number
  exchange: string
  pe?: number
  eps?: number
  beta?: number
  lastDiv?: number
  dividendYield?: number
  sector?: string
  industry?: string
  country?: string
  
  // Enhanced metrics (NEW)
  revenueGrowth?: number
  epsGrowth?: number
  roe?: number
  roic?: number
  grossMargin?: number
  operatingMargin?: number
  netMargin?: number
  pegRatio?: number
  pbRatio?: number
  psRatio?: number
  currentRatio?: number
  debtToEquity?: number
}

interface SavedScreener {
  id: string
  name: string
  description?: string
  criteria: ScreenerCriteria
  created_at: string
  updated_at: string
  is_public: boolean
  user_id: string
}

interface PresetScreener {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  color: string
  criteria: ScreenerCriteria
}

// ===== ENHANCED PRESET SCREENERS =====
const PRESET_SCREENERS: PresetScreener[] = [
  {
    id: 'high-growth',
    name: 'High Growth',
    description: 'Schnell wachsende Unternehmen (>20% Umsatzwachstum)',
    icon: ArrowTrendingUpIcon,
    color: 'purple',
    criteria: {
      revenueGrowthMoreThan: 20,
      epsGrowthMoreThan: 15,
      marketCapMoreThan: 1000000000,
      isActivelyTrading: true,
      isEtf: false,
      limit: 50
    }
  },
  {
    id: 'value-quality',
    name: 'Quality Value',
    description: 'Unterbewertete Qualitätsaktien (KGV<20, ROE>15%)',
    icon: ScaleIcon,
    color: 'blue',
    criteria: {
      peLowerThan: 20,
      roeMoreThan: 15,
      currentRatioMoreThan: 1.5,
      marketCapMoreThan: 5000000000,
      isActivelyTrading: true,
      isEtf: false,
      limit: 50
    }
  },
  {
    id: 'profitable-growth',
    name: 'Profitable Growth',
    description: 'Wachstum + Profitabilität (Wachstum>10%, Marge>10%)',
    icon: ChartPieIcon,
    color: 'green',
    criteria: {
      revenueGrowthMoreThan: 10,
      netMarginMoreThan: 10,
      roeMoreThan: 12,
      marketCapMoreThan: 1000000000,
      isActivelyTrading: true,
      isEtf: false,
      limit: 50
    }
  },
  {
    id: 'high-dividend',
    name: 'High Dividend',
    description: 'Solide Dividendenzahler (>3% Rendite)',
    icon: BanknotesIcon,
    color: 'green',
    criteria: {
      dividendMoreThan: 3,
      marketCapMoreThan: 5000000000,
      priceMoreThan: 5,
      isActivelyTrading: true,
      isEtf: false,
      limit: 50
    }
  },
  {
    id: 'mega-caps',
    name: 'Mega Caps',
    description: 'Die größten Unternehmen (>200B)',
    icon: BuildingOfficeIcon,
    color: 'blue',
    criteria: {
      marketCapMoreThan: 200000000000,
      isActivelyTrading: true,
      isEtf: false,
      limit: 50
    }
  },
  {
    id: 'tech-growth',
    name: 'Tech Growth',
    description: 'Wachstumsstarke Tech-Unternehmen',
    icon: BoltIcon,
    color: 'cyan',
    criteria: {
      sector: 'Technology',
      revenueGrowthMoreThan: 15,
      marketCapMoreThan: 10000000000,
      isActivelyTrading: true,
      isEtf: false,
      limit: 50
    }
  }
]

// ===== FILTER OPTIONS =====
const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive',
  'Energy', 'Utilities', 'Real Estate', 'Basic Materials'
]

const EXCHANGES = [
  'NASDAQ', 'NYSE', 'AMEX', 'XETRA', 'LSE', 'TSX', 'HKEX'
]

const COUNTRIES = [
  'US', 'DE', 'GB', 'CN', 'JP', 'CA', 'FR', 'CH', 'AU', 'KR'
]

// ===== HELPER FUNCTIONS =====
const formatMarketCap = (value: number | null | undefined): string => {
  if (!value || isNaN(value)) return '–'
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  return `${value.toLocaleString()}`
}

const formatVolume = (value: number | null | undefined): string => {
  if (!value || isNaN(value)) return '–'
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toLocaleString()
}

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '–'
  return `${value.toFixed(1)}%`
}

// ===== MAIN COMPONENT =====
export default function StockScreener() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'saved'>('presets')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [criteria, setCriteria] = useState<ScreenerCriteria>({})
  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [savedScreeners, setSavedScreeners] = useState<SavedScreener[]>([])
  const [screenName, setScreenName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [sortBy, setSortBy] = useState<string>('marketCap')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterCategory, setFilterCategory] = useState<'basic' | 'growth' | 'profitability' | 'valuation' | 'health'>('basic')

  // Load saved screeners
  useEffect(() => {
    loadSavedScreeners()
  }, [])

  const loadSavedScreeners = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('screeners')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSavedScreeners(data)
      }
    } catch (error) {
      console.error('Error loading screeners:', error)
    }
  }

  const runScreener = async (screenCriteria: ScreenerCriteria) => {
    setLoading(true)
    setResults([])

    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      // Add all criteria to params
      Object.entries(screenCriteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      // ALWAYS use advanced API for all screeners to ensure consistent results
      const response = await fetch(`/api/screener-advanced?${params.toString()}`)
      
      if (!response.ok) {
        console.error('Screener API error:', response.status)
        throw new Error('Screener API error')
      }
      
      const data = await response.json()
      console.log(`✅ Screener results: ${data.length} stocks found`)
      setResults(data)
      
    } catch (error) {
      console.error('Screener error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handlePresetSelect = (preset: PresetScreener) => {
    setSelectedPreset(preset.id)
    setCriteria(preset.criteria)
    runScreener(preset.criteria)
  }

  const handleCustomScreen = () => {
    setSelectedPreset(null)
    if (Object.keys(criteria).length > 0) {
      runScreener(criteria)
    }
  }

  const saveScreener = async () => {
    if (!screenName.trim()) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { error } = await supabase
        .from('screeners')
        .insert({
          name: screenName,
          criteria,
          user_id: session.user.id,
          is_public: false
        })

      if (!error) {
        setShowSaveDialog(false)
        setScreenName('')
        loadSavedScreeners()
      }
    } catch (error) {
      console.error('Error saving screener:', error)
    }
  }

  const deleteScreener = async (id: string) => {
    try {
      const { error } = await supabase
        .from('screeners')
        .delete()
        .eq('id', id)

      if (!error) {
        loadSavedScreeners()
      }
    } catch (error) {
      console.error('Error deleting screener:', error)
    }
  }

  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      let aVal = a[sortBy as keyof StockResult] || 0
      let bVal = b[sortBy as keyof StockResult] || 0
      
      if (isNaN(aVal as number) || aVal === null) aVal = 0
      if (isNaN(bVal as number) || bVal === null) bVal = 0
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
    return sorted
  }, [results, sortBy, sortOrder])

  // Clear all filters
  const clearAllFilters = () => {
    setCriteria({})
    setSelectedPreset(null)
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-theme-primary mb-1">
                Professional Stock Screener
              </h1>
              <p className="text-sm text-theme-secondary">
                Finde Aktien mit erweiterten Fundamentaldaten-Filtern
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {Object.keys(criteria).length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span>Filter zurücksetzen</span>
                </button>
              )}
              
              {activeTab === 'custom' && Object.keys(criteria).length > 0 && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-primary border border-green-500 text-green-400 rounded-lg hover:bg-green-500/10 transition-colors text-sm"
                >
                  <BookmarkIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Speichern</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 bg-theme-card border border-theme/10 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'presets'
                  ? 'bg-theme-primary text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Presets
            </button>
            
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'custom'
                  ? 'bg-theme-primary text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Custom
            </button>
            
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-theme-primary text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Gespeichert
              {savedScreeners.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                  {savedScreeners.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-theme-card border border-theme/10 rounded-lg p-4 h-fit sticky top-4">
            
              {/* Preset Screeners */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wide mb-4">
                    Wähle einen Screener
                  </h3>
                  {PRESET_SCREENERS.map((preset) => {
                    const Icon = preset.icon
                    const isSelected = selectedPreset === preset.id
                    
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'bg-theme-secondary border-green-500 shadow-sm'
                            : 'bg-theme-primary border-theme/10 hover:border-theme/30 hover:bg-theme-secondary/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isSelected ? 'text-green-400' : 'text-theme-muted'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-theme-primary">
                              {preset.name}
                            </h4>
                            <p className="text-xs text-theme-secondary mt-0.5 break-words">
                              {preset.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Custom Filters - ENHANCED */}
              {activeTab === 'custom' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wide mb-4">
                    Filter definieren
                  </h3>
                  
                  {/* Filter Categories */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    <button
                      onClick={() => setFilterCategory('basic')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        filterCategory === 'basic'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-theme-secondary text-theme-muted hover:text-theme-primary'
                      }`}
                    >
                      Basis
                    </button>
                    <button
                      onClick={() => setFilterCategory('growth')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        filterCategory === 'growth'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-theme-secondary text-theme-muted hover:text-theme-primary'
                      }`}
                    >
                      Wachstum
                    </button>
                    <button
                      onClick={() => setFilterCategory('profitability')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        filterCategory === 'profitability'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-theme-secondary text-theme-muted hover:text-theme-primary'
                      }`}
                    >
                      Profitabilität
                    </button>
                    <button
                      onClick={() => setFilterCategory('valuation')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        filterCategory === 'valuation'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-theme-secondary text-theme-muted hover:text-theme-primary'
                      }`}
                    >
                      Bewertung
                    </button>
                    <button
                      onClick={() => setFilterCategory('health')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        filterCategory === 'health'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-theme-secondary text-theme-muted hover:text-theme-primary'
                      }`}
                    >
                      Bilanz
                    </button>
                  </div>
                  
                  {/* BASIC FILTERS */}
                  {filterCategory === 'basic' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Market Cap</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={criteria.marketCapMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              marketCapMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={criteria.marketCapLowerThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              marketCapLowerThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Preis ($)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={criteria.priceMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              priceMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={criteria.priceLowerThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              priceLowerThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Dividende %</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Min"
                              value={criteria.dividendMoreThan || ''}
                              onChange={(e) => setCriteria({
                                ...criteria,
                                dividendMoreThan: e.target.value ? Number(e.target.value) : undefined
                              })}
                              className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Max"
                              value={criteria.dividendLowerThan || ''}
                              onChange={(e) => setCriteria({
                                ...criteria,
                                dividendLowerThan: e.target.value ? Number(e.target.value) : undefined
                              })}
                              className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Sektor</label>
                        <select
                          value={criteria.sector || ''}
                          onChange={(e) => setCriteria({
                            ...criteria,
                            sector: e.target.value || undefined
                          })}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                        >
                          <option value="">Alle Sektoren</option>
                          {SECTORS.map(sector => (
                            <option key={sector} value={sector}>{sector}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* GROWTH FILTERS */}
                  {filterCategory === 'growth' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Umsatzwachstum %</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              placeholder="Min"
                              value={criteria.revenueGrowthMoreThan || ''}
                              onChange={(e) => setCriteria({
                                ...criteria,
                                revenueGrowthMoreThan: e.target.value ? Number(e.target.value) : undefined
                              })}
                              className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              placeholder="Max"
                              value={criteria.revenueGrowthLowerThan || ''}
                              onChange={(e) => setCriteria({
                                ...criteria,
                                revenueGrowthLowerThan: e.target.value ? Number(e.target.value) : undefined
                              })}
                              className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                          </div>
                        </div>
                        <p className="text-xs text-theme-muted">YoY Umsatzwachstum (Jahr zu Jahr)</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">EPS Wachstum %</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              placeholder="Min"
                              value={criteria.epsGrowthMoreThan || ''}
                              onChange={(e) => setCriteria({
                                ...criteria,
                                epsGrowthMoreThan: e.target.value ? Number(e.target.value) : undefined
                              })}
                              className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              placeholder="Max"
                              value={criteria.epsGrowthLowerThan || ''}
                              onChange={(e) => setCriteria({
                                ...criteria,
                                epsGrowthLowerThan: e.target.value ? Number(e.target.value) : undefined
                              })}
                              className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                          </div>
                        </div>
                        <p className="text-xs text-theme-muted">Gewinn je Aktie Wachstum</p>
                      </div>
                    </>
                  )}

                  {/* PROFITABILITY FILTERS */}
                  {filterCategory === 'profitability' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">ROE (Min) %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            placeholder="z.B. 15 für 15%"
                            value={criteria.roeMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              roeMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                        </div>
                        <p className="text-xs text-theme-muted">Return on Equity (Eigenkapitalrendite)</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">ROIC (Min) %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            placeholder="z.B. 12 für 12%"
                            value={criteria.roicMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              roicMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                        </div>
                        <p className="text-xs text-theme-muted">Return on Invested Capital</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Nettomarge (Min) %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            placeholder="z.B. 10 für 10%"
                            value={criteria.netMarginMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              netMarginMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Op. Marge (Min) %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            placeholder="z.B. 15 für 15%"
                            value={criteria.operatingMarginMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              operatingMarginMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">%</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* VALUATION FILTERS */}
                  {filterCategory === 'valuation' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">KGV (P/E)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="1"
                            placeholder="Min"
                            value={criteria.peMoreThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              peMoreThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            step="1"
                            placeholder="Max"
                            value={criteria.peLowerThan || ''}
                            onChange={(e) => setCriteria({
                              ...criteria,
                              peLowerThan: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">PEG Ratio (Max)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="z.B. 1.5"
                          value={criteria.pegLowerThan || ''}
                          onChange={(e) => setCriteria({
                            ...criteria,
                            pegLowerThan: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                        />
                        <p className="text-xs text-theme-muted">Price/Earnings to Growth</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">KBV (P/B) Max</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="z.B. 3"
                          value={criteria.pbLowerThan || ''}
                          onChange={(e) => setCriteria({
                            ...criteria,
                            pbLowerThan: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">KUV (P/S) Max</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="z.B. 2"
                          value={criteria.psLowerThan || ''}
                          onChange={(e) => setCriteria({
                            ...criteria,
                            psLowerThan: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* FINANCIAL HEALTH FILTERS */}
                  {filterCategory === 'health' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Current Ratio (Min)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="z.B. 1.5"
                          value={criteria.currentRatioMoreThan || ''}
                          onChange={(e) => setCriteria({
                            ...criteria,
                            currentRatioMoreThan: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                        />
                        <p className="text-xs text-theme-muted">Liquidität (Current Assets / Current Liabilities)</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-primary">Debt/Equity (Max)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="z.B. 0.5"
                          value={criteria.debtToEquityLowerThan || ''}
                          onChange={(e) => setCriteria({
                            ...criteria,
                            debtToEquityLowerThan: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                        />
                        <p className="text-xs text-theme-muted">Verschuldungsgrad</p>
                      </div>
                    </>
                  )}

                  {/* Active Filters Display */}
                  {Object.keys(criteria).length > 0 && (
                    <div className="mt-4 p-3 bg-theme-secondary/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-theme-muted">Aktive Filter ({Object.keys(criteria).length})</span>
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Alle löschen
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {criteria.revenueGrowthMoreThan && (
                          <span className="px-2 py-1 bg-theme-primary text-xs rounded">
                            Umsatz {'>'} {criteria.revenueGrowthMoreThan}%
                          </span>
                        )}
                        {criteria.roeMoreThan && (
                          <span className="px-2 py-1 bg-theme-primary text-xs rounded">
                            ROE {'>'} {criteria.roeMoreThan}%
                          </span>
                        )}
                        {criteria.peLowerThan && (
                          <span className="px-2 py-1 bg-theme-primary text-xs rounded">
                            KGV {'<'} {criteria.peLowerThan}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCustomScreen}
                    className="w-full py-2.5 bg-theme-primary border border-green-500 text-green-400 rounded-lg font-medium hover:bg-green-500/10 transition-colors"
                  >
                    Screener ausführen
                  </button>
                </div>
              )}

              {/* Saved Screeners */}
              {activeTab === 'saved' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wide mb-4">
                    Deine Screener
                  </h3>
                  {savedScreeners.length === 0 ? (
                    <div className="text-center py-8 text-theme-secondary">
                      <BookmarkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Keine gespeicherten Screener</p>
                    </div>
                  ) : (
                    savedScreeners.map((screener) => (
                      <div
                        key={screener.id}
                        className="p-3 bg-theme-primary border border-theme/10 rounded-lg hover:border-theme/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-theme-primary text-sm">
                            {screener.name}
                          </h4>
                          <button
                            onClick={() => deleteScreener(screener.id)}
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-theme-secondary mb-3">
                          {new Date(screener.created_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => {
                            setCriteria(screener.criteria)
                            runScreener(screener.criteria)
                          }}
                          className="w-full py-2 bg-theme-primary border border-theme/20 text-theme-primary rounded-lg text-sm font-medium hover:bg-theme-hover transition-colors"
                        >
                          Ausführen
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Results */}
          <div className="lg:col-span-3">
            
            {/* Results Header */}
            {results.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-theme-primary">
                    {results.length} Ergebnisse
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-sm"
                    >
                      <option value="marketCap">Market Cap</option>
                      <option value="price">Preis</option>
                      <option value="changesPercentage">% Heute</option>
                      <option value="volume">Volumen</option>
                      <option value="dividendYield">Dividende</option>
                      <option value="pe">KGV</option>
                      <option value="revenueGrowth">Umsatzwachstum</option>
                      <option value="roe">ROE</option>
                      <option value="netMargin">Nettomarge</option>
                    </select>
                    
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 bg-theme-secondary border border-theme/20 rounded-lg hover:bg-theme-hover transition-colors"
                    >
                      {sortOrder === 'asc' ? (
                        <ArrowUpIcon className="w-4 h-4" />
                      ) : (
                        <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Filter Summary */}
                {(selectedPreset || Object.keys(criteria).length > 0) && (
                  <div className="mt-3 p-3 bg-theme-secondary/30 border border-theme/10 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-theme-secondary">
                      <FunnelIcon className="w-3 h-3" />
                      <span className="font-medium">Aktive Filter:</span>
                      <div className="flex flex-wrap gap-2">
                        {criteria.marketCapMoreThan && (
                          <span className="px-2 py-1 bg-theme-primary border border-theme/20 rounded">
                            Market Cap {'>'} {formatMarketCap(criteria.marketCapMoreThan)}
                          </span>
                        )}
                        {criteria.revenueGrowthMoreThan && (
                          <span className="px-2 py-1 bg-theme-primary border border-theme/20 rounded">
                            Umsatzwachstum {'>'} {criteria.revenueGrowthMoreThan}%
                          </span>
                        )}
                        {criteria.roeMoreThan && (
                          <span className="px-2 py-1 bg-theme-primary border border-theme/20 rounded">
                            ROE {'>'} {criteria.roeMoreThan}%
                          </span>
                        )}
                        {criteria.peLowerThan && (
                          <span className="px-2 py-1 bg-theme-primary border border-theme/20 rounded">
                            KGV {'<'} {criteria.peLowerThan}
                          </span>
                        )}
                        {criteria.dividendMoreThan && (
                          <span className="px-2 py-1 bg-theme-primary border border-theme/20 rounded">
                            Dividende {'>'} {criteria.dividendMoreThan}%
                          </span>
                        )}
                        {criteria.sector && (
                          <span className="px-2 py-1 bg-theme-primary border border-theme/20 rounded">
                            Sektor: {criteria.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-theme-card border border-theme/10 rounded-lg p-16">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm text-theme-secondary">Lade Ergebnisse...</p>
                </div>
              </div>
            )}

            {/* Results Table - ENHANCED */}
            {!loading && results.length > 0 && (
              <div className="bg-theme-card border border-theme/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-theme-secondary/30 border-b border-theme/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider hidden sm:table-cell">
                          Name
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                          Preis
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                          % Heute
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider hidden md:table-cell">
                          Market Cap
                        </th>
                        
                        {/* Always show growth column for growth presets */}
                        {(selectedPreset === 'high-growth' || selectedPreset === 'profitable-growth' || selectedPreset === 'tech-growth' || 
                          criteria.revenueGrowthMoreThan || criteria.epsGrowthMoreThan) && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider hidden lg:table-cell">
                            Wachstum %
                          </th>
                        )}
                        
                        {/* Always show ROE for value/profitability presets */}
                        {(selectedPreset === 'quality-value' || selectedPreset === 'profitable-growth' ||
                          criteria.roeMoreThan || criteria.netMarginMoreThan) && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider hidden lg:table-cell">
                            ROE %
                          </th>
                        )}
                        
                        <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                          KGV
                        </th>
                        
                        {(selectedPreset === 'high-dividend' || criteria.dividendMoreThan) && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                            Div %
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme/10">
                      {sortedResults.map((stock) => (
                        <tr
                          key={stock.symbol}
                          onClick={() => router.push(`/analyse/stocks/${stock.symbol.toLowerCase()}`)}
                          className="hover:bg-theme-hover cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Logo 
                                ticker={stock.symbol}
                                alt={stock.symbol}
                                className="w-8 h-8 rounded-lg flex-shrink-0"
                                padding="small"
                              />
                              <span className="font-bold text-theme-primary">
                                {stock.symbol}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-theme-secondary text-sm max-w-[200px] truncate hidden sm:table-cell">
                            {stock.companyName}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-theme-primary">
                            ${stock.price?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isNaN(stock.changesPercentage) && stock.changesPercentage !== null ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                                stock.changesPercentage >= 0
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {stock.changesPercentage >= 0 ? (
                                  <ArrowUpIcon className="w-3 h-3" />
                                ) : (
                                  <ArrowDownIcon className="w-3 h-3" />
                                )}
                                {Math.abs(stock.changesPercentage).toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-theme-muted text-xs">–</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-theme-primary hidden md:table-cell">
                            {formatMarketCap(stock.marketCap)}
                          </td>
                          
                          {/* Growth metrics - show for growth presets */}
                          {(selectedPreset === 'high-growth' || selectedPreset === 'profitable-growth' || selectedPreset === 'tech-growth' ||
                            criteria.revenueGrowthMoreThan || criteria.epsGrowthMoreThan) && (
                            <td className="px-4 py-3 text-right hidden lg:table-cell">
                              {stock.revenueGrowth !== null && stock.revenueGrowth !== undefined ? (
                                <span className={`text-sm font-bold ${
                                  stock.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {stock.revenueGrowth > 0 ? '+' : ''}{stock.revenueGrowth.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-theme-muted">–</span>
                              )}
                            </td>
                          )}
                          
                          {/* ROE for value/profitability presets */}
                          {(selectedPreset === 'quality-value' || selectedPreset === 'profitable-growth' ||
                            criteria.roeMoreThan || criteria.netMarginMoreThan) && (
                            <td className="px-4 py-3 text-right hidden lg:table-cell">
                              {stock.roe !== null && stock.roe !== undefined ? (
                                <span className="text-sm font-bold text-theme-primary">
                                  {stock.roe.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-theme-muted">–</span>
                              )}
                            </td>
                          )}
                          
                          <td className="px-4 py-3 text-right text-theme-secondary">
                            {stock.pe && stock.pe > 0 ? stock.pe.toFixed(1) : '–'}
                          </td>
                          
                          {(selectedPreset === 'high-dividend' || criteria.dividendMoreThan) && (
                            <td className="px-4 py-3 text-right">
                              {stock.dividendYield && stock.dividendYield > 0 ? (
                                <span className="font-bold text-green-400">
                                  {(stock.dividendYield * 100).toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-theme-muted">–</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && results.length === 0 && (
              <div className="bg-theme-card border border-theme/10 rounded-lg p-16">
                <div className="text-center">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-theme-muted opacity-50" />
                  <h3 className="text-lg font-medium text-theme-primary mb-1">
                    Keine Ergebnisse
                  </h3>
                  <p className="text-sm text-theme-secondary">
                    Wähle einen Screener oder definiere eigene Filter um Aktien zu finden
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-card border border-theme/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-theme-primary mb-4">
              Screener speichern
            </h3>
            <input
              type="text"
              placeholder="Name des Screeners"
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              className="w-full px-4 py-3 bg-theme-secondary border border-theme/20 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setScreenName('')
                }}
                className="flex-1 py-3 bg-theme-secondary text-theme-primary rounded-lg font-medium hover:bg-theme-hover transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={saveScreener}
                disabled={!screenName.trim()}
                className="flex-1 py-3 bg-theme-primary border border-green-500 text-green-400 rounded-lg font-medium hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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