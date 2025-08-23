// src/app/superinvestor/investors/page.tsx - OPTIMIZED WITH API
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import InvestorAvatar from '@/components/InvestorAvatar'
import { ArrowTopRightOnSquareIcon, UserIcon, BuildingOffice2Icon, Squares2X2Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useInvestorsData } from '@/hooks/useInvestorsData'

// Format currency helper
function formatCurrency(value: number): string {
  if (value === 0) return '–'
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)} Mrd. $`
  } else if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(0)} Mio. $`
  } else if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K $`
  }
  return `${Math.round(value)} $`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–'
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  } catch {
    return dateStr
  }
}

export default function InvestorsPage() {
  // ✅ OPTIMIZED: Use API Hook instead of direct holdings import
  const { data: investorsData, loading, error } = useInvestorsData()
  
  // ✅ STATE für Filter + Suche
  const [filter, setFilter] = useState<'all' | 'investor' | 'fund'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade Investoren-Daten...</p>
        </div>
      </div>
    )
  }

  // ✅ ERROR STATE
  if (error || !investorsData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4">⚠️ Fehler beim Laden</div>
          <p className="text-gray-400 text-sm mb-4">{error || 'Keine Daten verfügbar'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  // ✅ GEFILTERTE und GESUCHTE Daten
  const filteredInvestors = useMemo(() => {
    if (!investorsData?.investors) return []
    
    return investorsData.investors.filter(investor => {
      // Filter by type
      const matchesFilter = filter === 'all' || investor.type === filter
      
      // Filter by search query
      const matchesSearch = searchQuery === '' || 
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesFilter && matchesSearch
    })
  }, [filter, searchQuery, investorsData])

  // ✅ STATISTIKEN für Filter Buttons - using API data
  const stats = useMemo(() => {
    if (!investorsData) return { total: 0, investors: 0, funds: 0 }
    return investorsData.stats
  }, [investorsData])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      {/* Header */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Alle Super-Investoren & Fonds
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Entdecke die Portfolios der erfolgreichsten Investoren und Top-Performing Fonds der Welt
          </p>
        </div>

        {/* Filter + Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4 inline mr-2" />
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setFilter('investor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'investor'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-2" />
              Investoren ({stats.investors})
            </button>
            <button
              onClick={() => setFilter('fund')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'fund'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BuildingOffice2Icon className="w-4 h-4 inline mr-2" />
              Fonds ({stats.funds})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInvestors.map((investor) => (
          <Link
            key={investor.slug}
            href={`/superinvestor/${investor.slug}`}
            className="group bg-[#161618] rounded-2xl p-6 hover:bg-[#1A1A1D] transition-all duration-300 border border-white/[0.06] hover:border-white/[0.1]"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <InvestorAvatar
                  name={investor.name}
                  imageUrl={`/images/${investor.slug}.png`}
                  size="md"
                  className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200"
                />
                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-green-400 transition-colors line-clamp-1">
                    {investor.name}
                  </h3>
                  {investor.subtitle && (
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {investor.subtitle}
                    </p>
                  )}
                </div>
              </div>
              
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Portfolio:</span>
                <span className="font-medium text-green-400">
                  {formatCurrency(investor.totalValue)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Positionen:</span>
                <span className="font-medium text-white">
                  {investor.positionsCount}
                </span>
              </div>
              
              {investor.lastUpdate && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Update:</span>
                  <span className="font-medium text-gray-300">
                    {formatDate(investor.lastUpdate)}
                  </span>
                </div>
              )}
            </div>

            {/* Type Badge */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  investor.type === 'investor' 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  {investor.type === 'investor' ? (
                    <>
                      <UserIcon className="w-3 h-3" />
                      Investor
                    </>
                  ) : (
                    <>
                      <BuildingOffice2Icon className="w-3 h-3" />
                      Fonds
                    </>
                  )}
                </span>
                
                <span className="text-xs text-gray-500 group-hover:text-green-400 transition-colors">
                  Portfolio ansehen →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* No Results */}
      {filteredInvestors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse gefunden</h3>
            <p className="text-sm">
              {searchQuery ? 
                `Keine Investoren gefunden für "${searchQuery}"` : 
                'Keine Investoren für die aktuelle Filterauswahl'
              }
            </p>
          </div>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilter('all')
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg font-medium transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  )
}