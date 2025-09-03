// src/app/analyse/etf-screener/page.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { xetraETFs as etfs } from '@/data/xetraETFsComplete'

interface ETFQuoteData {
  symbol: string
  price?: number
  change?: number
  changesPercentage?: number
  volume?: number
  avgVolume?: number
  marketCap?: number
}


interface FilterState {
  assetClass: string
  issuer: string
  terRange: [number, number]
  search: string
  priceRange: [number, number]
  category: string
  exchange: string
}

interface AdvancedFilters {
  minVolume: number
  maxVolume: number
  minMarketCap: number
  maxMarketCap: number
  hasPrice: boolean
  hasTER: boolean
}

export default function ETFScreenerPage() {
  const [etfQuotes, setETFQuotes] = useState<ETFQuoteData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string>('marketCap')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<FilterState>({
    assetClass: '',
    issuer: '',
    terRange: [0, 2],
    search: '',
    priceRange: [0, 1000],
    category: '',
    exchange: ''
  })
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    minVolume: 0,
    maxVolume: Infinity,
    minMarketCap: 0,
    maxMarketCap: Infinity,
    hasPrice: false,
    hasTER: false
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  const router = useRouter()
  const itemsPerPage = 50

  useEffect(() => {
    loadETFData()
  }, [currentPage])


  const loadETFData = async () => {
    setLoading(true)
    try {
      // Load German XETRA ETFs only
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const etfBatch = etfs.slice(startIndex, endIndex)
      
      if (etfBatch.length === 0) {
        setETFQuotes([])
        setLoading(false)
        return
      }

      const symbols = etfBatch.map(etf => etf.symbol).join(',')
      
      // Fetch quotes
      const quotesRes = await fetch(`/api/quotes?symbols=${symbols}`)
      if (quotesRes.ok) {
        const quotes = await quotesRes.json()
        setETFQuotes(quotes || [])
      } else {
        setETFQuotes([])
      }

    } catch (error) {
      console.error('ETF data loading error:', error)
      setETFQuotes([])
    } finally {
      setLoading(false)
    }
  }

  const filteredETFs = useMemo(() => {
    const currentETFs = etfs
    
    return currentETFs.filter(etf => {
      const matchesSearch = !filters.search || 
        etf.symbol.toLowerCase().includes(filters.search.toLowerCase()) ||
        etf.name.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesAssetClass = !filters.assetClass || etf.assetClass === filters.assetClass
      const matchesIssuer = !filters.issuer || etf.issuer === filters.issuer
      const matchesCategory = !filters.category || etf.category === filters.category
      const matchesExchange = !filters.exchange || etf.exchange === filters.exchange
      
      // Use TER from static data
      const matchesTER = !etf.ter || (etf.ter >= filters.terRange[0] && etf.ter <= filters.terRange[1])
      
      const quote = etfQuotes.find(q => q.symbol === etf.symbol)
      const price = quote?.price || etf.price || 0
      const matchesPrice = price >= filters.priceRange[0] && price <= filters.priceRange[1]
      
      // Advanced filters
      const matchesHasPrice = !advancedFilters.hasPrice || (quote?.price !== undefined || etf.price !== undefined)
      const matchesHasTER = !advancedFilters.hasTER || etf.ter !== undefined
      const matchesVolume = !quote?.volume || (quote.volume >= advancedFilters.minVolume && quote.volume <= advancedFilters.maxVolume)
      const matchesMarketCap = !quote?.marketCap || (quote.marketCap >= advancedFilters.minMarketCap && quote.marketCap <= advancedFilters.maxMarketCap)
      
      return matchesSearch && matchesAssetClass && matchesIssuer && matchesCategory && 
             matchesExchange && matchesTER && matchesPrice && matchesHasPrice && 
             matchesHasTER && matchesVolume && matchesMarketCap
    })
  }, [filters, advancedFilters, etfQuotes])

  const sortedETFs = useMemo(() => {
    const etfsWithQuotes = filteredETFs.map(etf => {
      const quote = etfQuotes.find(q => q.symbol === etf.symbol)
      return { ...etf, quote }
    })

    return etfsWithQuotes.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortField) {
        case 'symbol':
          aVal = a.symbol
          bVal = b.symbol
          break
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'price':
          aVal = a.quote?.price || 0
          bVal = b.quote?.price || 0
          break
        case 'change':
          aVal = a.quote?.changesPercentage || 0
          bVal = b.quote?.changesPercentage || 0
          break
        case 'volume':
          aVal = a.quote?.volume || 0
          bVal = b.quote?.volume || 0
          break
        case 'ter':
          aVal = a.ter || 0
          bVal = b.ter || 0
          break
        case 'marketCap':
          aVal = a.quote?.marketCap || 0
          bVal = b.quote?.marketCap || 0
          break
        default:
          aVal = 0
          bVal = 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [filteredETFs, etfQuotes, sortField, sortDirection])

  const paginatedETFs = sortedETFs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(sortedETFs.length / itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatPrice = (price: number | undefined): string => {
    if (!price) return 'N/A'
    return `${price.toFixed(2).replace('.', ',')} $`
  }

  const formatChange = (change: number | undefined): string => {
    if (change === undefined) return 'N/A'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2).replace('.', ',')}%`
  }

  const formatVolume = (volume: number | undefined): string => {
    if (!volume) return 'N/A'
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`
    return volume.toLocaleString('de-DE')
  }


  const currentETFList = etfs
  const uniqueAssetClasses = [...new Set(currentETFList.map(etf => etf.assetClass))].sort()
  const uniqueIssuers = [...new Set(currentETFList.map(etf => etf.issuer))].sort()
  const uniqueCategories = [...new Set(currentETFList.map(etf => etf.category))].sort()
  const uniqueExchanges = [...new Set(currentETFList.map(etf => etf.exchange))].filter(Boolean).sort()

  return (
    <>
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #10B981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-thumb::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #10B981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="border-b border-theme/5">
          <div className="pb-8">
            <div className="flex items-center gap-3 mb-2">
              <ArrowLeftIcon 
                className="w-5 h-5 text-theme-secondary hover:text-green-400 cursor-pointer transition-colors"
                onClick={() => router.push('/analyse')}
              />
              <ChartBarIcon className="w-6 h-6 text-green-400" />
              <h1 className="text-3xl font-bold text-theme-primary">ETF Screener</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <p className="text-theme-secondary">
                Durchsuche alle {etfs.length.toLocaleString('de-DE')} verfügbaren ETFs nach deinen Kriterien
              </p>
              
              {/* Market Info */}
              <div className="flex items-center gap-2 text-theme-secondary">
                <GlobeAltIcon className="w-4 h-4" />
                <span className="text-sm">XETRA & Deutsche Börsen 🇩🇪</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-theme-card rounded-xl p-6 space-y-6">
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-tertiary" />
            <input
              type="text"
              placeholder="Suche nach Symbol oder Namen..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 bg-theme-card border border-theme/20 rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all"
            />
          </div>

          {/* Basic Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Asset Class Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Asset Class</label>
              <select
                value={filters.assetClass}
                onChange={(e) => setFilters(prev => ({ ...prev, assetClass: e.target.value }))}
                className="w-full px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                <option value="">Alle</option>
                {uniqueAssetClasses.map(ac => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>

            {/* Issuer Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Anbieter</label>
              <select
                value={filters.issuer}
                onChange={(e) => setFilters(prev => ({ ...prev, issuer: e.target.value }))}
                className="w-full px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                <option value="">Alle</option>
                {uniqueIssuers.map(issuer => (
                  <option key={issuer} value={issuer}>{issuer}</option>
                ))}
              </select>
            </div>

            {/* TER Range */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                TER: {filters.terRange[0].toFixed(2)}% - {filters.terRange[1].toFixed(2)}%
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={filters.terRange[1]}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  terRange: [0, parseFloat(e.target.value)] 
                }))}
                className="w-full h-2 bg-theme-secondary/20 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: 'linear-gradient(to right, #10B981 0%, #10B981 var(--value, 50%), rgba(107, 114, 128, 0.2) var(--value, 50%), rgba(107, 114, 128, 0.2) 100%)'
                }}
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Kategorie</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                <option value="">Alle</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Filters Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-theme-secondary/20 text-theme-secondary rounded-lg hover:bg-theme-secondary/30 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              Erweiterte Filter
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <div className="text-theme-secondary text-sm">
              <span className="font-medium text-green-400">{sortedETFs.length}</span> ETFs gefunden
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t border-theme/20 pt-6 space-y-4">
              <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">Erweiterte Filter</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Preis: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange[0]}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceRange: [parseFloat(e.target.value) || 0, prev.priceRange[1]] 
                      }))}
                      className="w-full px-2 py-1 bg-theme-card border border-theme/20 rounded text-sm"
                    />
                    <span className="text-theme-tertiary">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange[1]}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceRange: [prev.priceRange[0], parseFloat(e.target.value) || 1000] 
                      }))}
                      className="w-full px-2 py-1 bg-theme-card border border-theme/20 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Exchange Filter */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Börse</label>
                  <select
                    value={filters.exchange}
                    onChange={(e) => setFilters(prev => ({ ...prev, exchange: e.target.value }))}
                    className="w-full px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  >
                    <option value="">Alle</option>
                    {uniqueExchanges.map(ex => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                  </select>
                </div>

                {/* Data Quality Filters */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Datenqualität</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedFilters.hasPrice}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasPrice: e.target.checked }))}
                        className="rounded border-theme/20 text-green-500 focus:ring-green-500/30"
                      />
                      <span className="text-sm text-theme-secondary">Nur mit Kurs</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedFilters.hasTER}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasTER: e.target.checked }))}
                        className="rounded border-theme/20 text-green-500 focus:ring-green-500/30"
                      />
                      <span className="text-sm text-theme-secondary">Nur mit TER</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ETF Table */}
        <div className="bg-theme-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-secondary/10 border-b border-theme/10">
                <tr>
                  {[
                    { key: 'symbol', label: 'Symbol', align: 'left' },
                    { key: 'name', label: 'Name', align: 'left' },
                    { key: 'assetClass', label: 'Asset Class', align: 'center' },
                    { key: 'price', label: 'Preis', align: 'right' },
                    { key: 'change', label: 'Veränderung', align: 'right' },
                    { key: 'volume', label: 'Volumen', align: 'right' },
                    { key: 'ter', label: 'TER', align: 'right' },
                    { key: 'issuer', label: 'Anbieter', align: 'center' }
                  ].map(({ key, label, align }) => (
                    <th
                      key={key}
                      className={`px-4 py-4 text-xs font-semibold text-theme-secondary uppercase tracking-wider cursor-pointer hover:text-theme-primary transition-colors text-${align}`}
                      onClick={() => handleSort(key)}
                    >
                      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {label}
                        {sortField === key && (
                          sortDirection === 'asc' 
                            ? <ArrowUpIcon className="w-3 h-3" />
                            : <ArrowDownIcon className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme/20">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-4 bg-theme-secondary/20 rounded animate-pulse"></div>
                          <div className="w-32 h-4 bg-theme-secondary/20 rounded animate-pulse"></div>
                          <div className="w-20 h-4 bg-theme-secondary/20 rounded animate-pulse"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedETFs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-theme-secondary">
                      <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Keine ETFs gefunden mit den aktuellen Filtern</p>
                    </td>
                  </tr>
                ) : (
                  paginatedETFs.map((etf) => {
                    const quote = etfQuotes.find(q => 
                      q.symbol === etf.symbol
                    )
                    
                    return (
                      <tr 
                        key={etf.symbol}
                        className="hover:bg-theme-secondary/5 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/analyse/etfs/${etf.symbol.toLowerCase()}`)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                                {etf.symbol}
                              </span>
                              {etf.isin && (
                                <span className="text-xs text-theme-tertiary">{etf.isin}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-xs">
                            <div className="font-medium text-theme-primary truncate">{etf.name}</div>
                            <div className="text-xs text-theme-tertiary mt-1">{etf.category}</div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            etf.assetClass === 'Equity' ? 'bg-blue-500/20 text-blue-400' :
                            etf.assetClass === 'Fixed Income' ? 'bg-purple-500/20 text-purple-400' :
                            etf.assetClass === 'Commodity' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {etf.assetClass}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right font-mono">
                          <span className="text-theme-primary font-semibold">
                            {formatPrice(quote?.price)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <span className={`font-bold ${
                            !quote?.changesPercentage ? 'text-theme-tertiary' :
                            quote.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatChange(quote?.changesPercentage)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-theme-secondary">
                          {formatVolume(quote?.volume)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <span className={`font-semibold ${
                            !etf.ter ? 'text-theme-tertiary' :
                            etf.ter <= 0.2 ? 'text-green-400' :
                            etf.ter <= 0.5 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {etf.ter ? `${etf.ter.toFixed(2)}%` : 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="text-theme-secondary text-sm font-medium">
                            {etf.issuer}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-theme/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-theme-secondary">
                  Seite {currentPage} von {totalPages} ({sortedETFs.length} ETFs)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-theme-secondary/20 text-theme-secondary rounded-md hover:bg-theme-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-theme-secondary/20 text-theme-secondary rounded-md hover:bg-theme-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(filters.search || filters.assetClass || filters.issuer || filters.category || filters.exchange || 
          filters.terRange[1] !== 2 || filters.priceRange[0] !== 0 || filters.priceRange[1] !== 1000 ||
          advancedFilters.hasPrice || advancedFilters.hasTER) && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                setFilters({
                  assetClass: '',
                  issuer: '',
                  terRange: [0, 2],
                  search: '',
                  priceRange: [0, 1000],
                  category: '',
                  exchange: ''
                })
                setAdvancedFilters({
                  minVolume: 0,
                  maxVolume: Infinity,
                  minMarketCap: 0,
                  maxMarketCap: Infinity,
                  hasPrice: false,
                  hasTER: false
                })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Alle Filter zurücksetzen
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  )
}