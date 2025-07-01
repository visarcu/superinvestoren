// src/app/superinvestor/investors/page.tsx - FIXED: Richtige Holdings Count
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  FunnelIcon,
  ChevronDownIcon,
  TrophyIcon,
  Squares2X2Icon,
  TableCellsIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { investors, Investor } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import InvestorAvatar from '@/components/InvestorAvatar'
import { calculateMergedHoldingsCount } from '@/utils/portfolioAnalytics' // ✅ NEU

function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

// Portfolio-Größen Kategorien
const sizeCategories = [
  { id: 'all', label: 'Alle Größen', min: 0, max: Infinity },
  { id: 'mega', label: '10+ Mrd.', min: 10_000_000_000, max: Infinity },
  { id: 'large', label: '5+ Mrd.', min: 5_000_000_000, max: Infinity },
  { id: 'medium', label: '1+ Mrd.', min: 1_000_000_000, max: Infinity },
  { id: 'small', label: '500+ Mio.', min: 500_000_000, max: Infinity },
  { id: 'mini', label: '< 500 Mio.', min: 0, max: 500_000_000 },
]

// Sortier-Optionen
const sortOptions = [
  { id: 'portfolio-desc', label: 'Portfolio-Wert (hoch → niedrig)' },
  { id: 'portfolio-asc', label: 'Portfolio-Wert (niedrig → hoch)' },
  { id: 'name-asc', label: 'Name (A → Z)' },
  { id: 'name-desc', label: 'Name (Z → A)' },
  { id: 'holdings-desc', label: 'Anzahl Holdings (hoch → niedrig)' },
  { id: 'holdings-asc', label: 'Anzahl Holdings (niedrig → hoch)' },
]

export default function AllInvestorsPage() {
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSize, setSelectedSize] = useState('all')
  const [selectedSort, setSelectedSort] = useState('portfolio-desc')
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)

  // ✅ FIXED: Portfolio-Werte und Holdings Count berechnen (richtig gemerged)
  const portfolioValue: Record<string, number> = {}
  const holdingsCounts: Record<string, number> = {}
  
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0)
    portfolioValue[slug] = total
    
    // ✅ FIXED: Verwende die richtige Merge-Funktion wie in der Investor-Seite
    holdingsCounts[slug] = calculateMergedHoldingsCount(latest.positions)
  })

  // Gefilterte und sortierte Investoren
  const processedInvestors = useMemo(() => {
    let filtered = investors.filter(investor => {
      // Such-Filter
      const matchesSearch = investor.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Größen-Filter
      const portfolioVal = portfolioValue[investor.slug] || 0
      const selectedCategory = sizeCategories.find(cat => cat.id === selectedSize)
      const matchesSize = selectedCategory ? 
        portfolioVal >= selectedCategory.min && portfolioVal < selectedCategory.max : true
      
      return matchesSearch && matchesSize
    })

    // Sortierung
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'portfolio-desc':
          return (portfolioValue[b.slug] || 0) - (portfolioValue[a.slug] || 0)
        case 'portfolio-asc':
          return (portfolioValue[a.slug] || 0) - (portfolioValue[b.slug] || 0)
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'holdings-desc':
          return (holdingsCounts[b.slug] || 0) - (holdingsCounts[a.slug] || 0)
        case 'holdings-asc':
          return (holdingsCounts[a.slug] || 0) - (holdingsCounts[b.slug] || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [searchTerm, selectedSize, selectedSort, portfolioValue, holdingsCounts])

  // Hilfsfunktionen für Display
  const getValueColor = (value: number) => {
    if (value >= 10_000_000_000) return 'text-green-400'
    if (value >= 5_000_000_000) return 'text-emerald-400'
    if (value >= 1_000_000_000) return 'text-green-300'
    if (value >= 500_000_000) return 'text-gray-300'
    return 'text-gray-400'
  }

  const formatPortfolioValue = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} Mrd.`
    } else if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)} Mio.`
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}k`
    } else {
      return '–'
    }
  }

  const highlighted = ['buffett', 'ackman', 'smith']
  const hasActiveFilters = selectedSize !== 'all' || searchTerm.trim() !== ''

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* ✅ CLEAN Header */}
        <div className="mb-12">
          <Link
            href="/superinvestor"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Zurück zur Übersicht</span>
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="w-6 h-6 text-green-400" />
                <h1 className="text-3xl font-bold text-white">Alle Investoren</h1>
              </div>
              <p className="text-gray-400">
                Vollständige Liste aller {investors.length} Super-Investoren mit erweiterten Filtern.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{processedInvestors.length} Investoren</span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ REDESIGNED Search & Filter Bar */}
        <div className="mb-8">
          {/* Main Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Warren Buffett, Bill Ackman, Terry Smith..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all backdrop-blur-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* View & Filter Toggles */}
            <div className="flex items-center gap-2">
              
              {/* View Mode Toggle */}
              <div className="flex bg-gray-900/50 border border-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Grid-Ansicht"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'table'
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Tabellen-Ansicht"
                >
                  <TableCellsIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <FunnelIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilters && (
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* ✅ CLEAN Expandable Filters */}
          {showFilters && (
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row gap-4">
                
                {/* Portfolio-Größe Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Portfolio-Größe
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {sizeCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sortierung */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sortierung
                  </label>
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {sortOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedSize('all')
                      }}
                      className="px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      Filter zurücksetzen
                    </button>
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-gray-800/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Aktive Filter:</span>
                    {searchTerm && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-xs">
                        Suche: "{searchTerm}"
                        <button onClick={() => setSearchTerm('')}>
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedSize !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600/20 border border-gray-600/30 rounded text-gray-300 text-xs">
                        {sizeCategories.find(cat => cat.id === selectedSize)?.label}
                        <button onClick={() => setSelectedSize('all')}>
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
            <span>
              {processedInvestors.length} von {investors.length} Investoren
              {searchTerm && ` für "${searchTerm}"`}
            </span>
            <span className="text-xs">
              Sortiert nach {sortOptions.find(opt => opt.id === selectedSort)?.label}
            </span>
          </div>
        </div>

        {/* ✅ IMPROVED Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedInvestors.map(investor => {
              const portfolioVal = portfolioValue[investor.slug] || 0
              const holdingsCount = holdingsCounts[investor.slug] || 0
              const isHighlighted = highlighted.includes(investor.slug)
              
              return (
                <Link
                  key={investor.slug}
                  href={`/superinvestor/${investor.slug}`}
                  className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 relative backdrop-blur-sm"
                >
                  {/* Crown for highlighted */}
                  {isHighlighted && (
                    <div className="absolute top-4 right-4">
                      <TrophyIcon className="w-5 h-5 text-yellow-400" />
                    </div>
                  )}
                  
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <InvestorAvatar
                      name={investor.name}
                      imageUrl={investor.imageUrl}
                      size="lg"
                      className="ring-2 ring-gray-700 group-hover:ring-green-500/40 transition-all duration-200"
                    />
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-lg font-bold text-white text-center mb-2 group-hover:text-green-400 transition-colors">
                    {investor.name.split('–')[0].trim()}
                  </h3>
                  
                  {/* Company */}
                  {investor.name.includes('–') && (
                    <p className="text-gray-500 text-sm text-center mb-4 line-clamp-2">
                      {investor.name.split('–')[1].trim()}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Portfolio:</span>
                      <span className={`font-semibold text-sm ${getValueColor(portfolioVal)}`}>
                        {formatPortfolioValue(portfolioVal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Holdings:</span>
                      <span className="text-gray-300 text-sm">{holdingsCount}</span>
                    </div>
                  </div>
                  
                  {/* View Button */}
                  <div className="mt-4 pt-4 border-t border-gray-800/50 text-center">
                    <span className="text-green-400 text-sm font-medium group-hover:text-green-300 transition-colors">
                      Portfolio ansehen →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* ✅ IMPROVED Table View */}
        {viewMode === 'table' && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4 bg-gray-800/30">
              <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 font-medium">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Investor</div>
                <div className="col-span-3 text-right">Portfolio-Wert</div>
                <div className="col-span-2 text-right">Holdings</div>
                <div className="col-span-1"></div>
              </div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-gray-800/50">
              {processedInvestors.map((investor, idx) => {
                const portfolioVal = portfolioValue[investor.slug] || 0
                const holdingsCount = holdingsCounts[investor.slug] || 0
                const isHighlighted = highlighted.includes(investor.slug)
                
                return (
                  <Link
                    key={investor.slug}
                    href={`/superinvestor/${investor.slug}`}
                    className="block hover:bg-gray-800/30 transition-colors group"
                  >
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                      {/* Rang */}
                      <div className="col-span-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm font-mono min-w-[2ch]">
                            {idx + 1}
                          </span>
                          {isHighlighted && (
                            <TrophyIcon className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Investor Info */}
                      <div className="col-span-5">
                        <div className="flex items-center gap-3">
                          <InvestorAvatar
                            name={investor.name}
                            imageUrl={investor.imageUrl}
                            size="sm"
                            className="flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium group-hover:text-green-400 transition-colors truncate">
                              {investor.name.split('–')[0].trim()}
                            </p>
                            {investor.name.includes('–') && (
                              <p className="text-gray-500 text-xs truncate">
                                {investor.name.split('–')[1].trim()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Portfolio-Wert */}
                      <div className="col-span-3 text-right">
                        {portfolioVal > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-semibold ${getValueColor(portfolioVal)}`}>
                              {formatPortfolioValue(portfolioVal)}
                            </span>
                            {portfolioVal >= 1_000_000_000 && (
                              <span className="text-gray-600 text-xs">
                                {formatCurrency(portfolioVal, 'USD', 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-sm">–</span>
                        )}
                      </div>
                      
                      {/* Holdings */}
                      <div className="col-span-2 text-right">
                        <span className="text-gray-300 font-medium">{holdingsCount}</span>
                      </div>
                      
                      {/* Action */}
                      <div className="col-span-1 text-right">
                        <span className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ✅ IMPROVED Empty State */}
        {processedInvestors.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserGroupIcon className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Keine Investoren gefunden
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? `Keine Ergebnisse für "${searchTerm}". Versuche andere Suchbegriffe.`
                : 'Keine Investoren entsprechen den gewählten Filtern.'
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedSize('all')
                }}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}