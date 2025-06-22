// src/app/superinvestor/investors/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  FunnelIcon,
  ChevronDownIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { investors, Investor } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import InvestorAvatar from '@/components/InvestorAvatar'

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

// View-Modi
const viewModes = [
  { id: 'grid', label: 'Grid' },
  { id: 'table', label: 'Tabelle' },
]

export default function AllInvestorsPage() {
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSize, setSelectedSize] = useState('all')
  const [selectedSort, setSelectedSort] = useState('portfolio-desc')
  const [viewMode, setViewMode] = useState('grid')

  // Portfolio-Werte berechnen
  const portfolioValue: Record<string, number> = {}
  const holdingsCounts: Record<string, number> = {}
  
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0)
    portfolioValue[slug] = total
    holdingsCounts[slug] = latest.positions.length
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
    if (value >= 1_000_000_000) return 'text-blue-400'
    if (value >= 500_000_000) return 'text-cyan-400'
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

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/superinvestor"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Zurück zur Übersicht</span>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="w-6 h-6 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Alle Investoren</h1>
          </div>
          
          <p className="text-gray-400 text-lg">
            Vollständige Liste aller {investors.length} Super-Investoren mit erweiterten Filtern und Suchfunktion.
          </p>
        </div>

        {/* Filter & Controls */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Suche */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Investor suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-3">
              
              {/* Portfolio-Größe Filter */}
              <div className="relative">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  {sizeCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sortierung */}
              <div className="relative">
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  {sortOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode */}
              <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
                {viewModes.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      viewMode === mode.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Info */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {processedInvestors.length} von {investors.length} Investoren
              {searchTerm && ` für "${searchTerm}"`}
            </span>
            {selectedSize !== 'all' && (
              <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">
                Filter: {sizeCategories.find(cat => cat.id === selectedSize)?.label}
              </span>
            )}
          </div>
        </div>

        {/* Grid View */}
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
                  className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 relative"
                >
                  {/* Crown for highlighted */}
                  {isHighlighted && (
                    <div className="absolute top-3 right-3">
                      <TrophyIcon className="w-5 h-5 text-yellow-400" />
                    </div>
                  )}
                  
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <InvestorAvatar
                      name={investor.name}
                      imageUrl={investor.imageUrl}
                      size="lg"
                      className="ring-2 ring-gray-700 group-hover:ring-blue-500/40 transition-all duration-200"
                    />
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-lg font-bold text-white text-center mb-2 group-hover:text-blue-400 transition-colors">
                    {investor.name.split('–')[0].trim()}
                  </h3>
                  
                  {/* Company */}
                  {investor.name.includes('–') && (
                    <p className="text-gray-500 text-sm text-center mb-3">
                      {investor.name.split('–')[1].trim()}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="space-y-2">
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
                  <div className="mt-4 text-center">
                    <span className="text-blue-400 text-sm font-medium">
                      Portfolio ansehen →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-3 bg-gray-800/30">
              <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 font-medium">
                <div className="col-span-1">Rang</div>
                <div className="col-span-5">Investor</div>
                <div className="col-span-3 text-right">Portfolio-Wert</div>
                <div className="col-span-2 text-right">Holdings</div>
                <div className="col-span-1"></div>
              </div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-gray-800">
              {processedInvestors.map((investor, idx) => {
                const portfolioVal = portfolioValue[investor.slug] || 0
                const holdingsCount = holdingsCounts[investor.slug] || 0
                const isHighlighted = highlighted.includes(investor.slug)
                
                return (
                  <Link
                    key={investor.slug}
                    href={`/superinvestor/${investor.slug}`}
                    className="block hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                      {/* Rang */}
                      <div className="col-span-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm font-mono">
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
                          />
                          <div className="min-w-0">
                            <p className="text-white font-medium group-hover:text-blue-400 transition-colors truncate">
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
                        <span className="text-gray-300">{holdingsCount}</span>
                      </div>
                      
                      {/* Action */}
                      <div className="col-span-1 text-right">
                        <span className="text-blue-400 text-sm">→</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {processedInvestors.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Keine Investoren gefunden
            </h3>
            <p className="text-gray-500">
              Versuche andere Suchbegriffe oder Filter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}