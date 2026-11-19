'use client'
// Investorenliste (Client-Teil): Filter, Suche, Ansicht. Daten kommen fertig
// berechnet von der Server-Seite page.tsx.

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import InvestorAvatar from '@/components/InvestorAvatar'
import InvestorCard from '@/components/InvestorCard'
import { ArrowTopRightOnSquareIcon, UserIcon, BuildingOffice2Icon, Squares2X2Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { InvestorListItem } from '@/lib/investorListData'

function formatLargeNumber(value: number): string {
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

export default function InvestorsClient({ investorData }: { investorData: InvestorListItem[] }) {
  // ✅ STATE für Filter + Suche
  const [filter, setFilter] = useState<'all' | 'investor' | 'fund'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')

  // ✅ GEFILTERTE und GESUCHTE Daten
  const filteredInvestors = useMemo(() => {
    return investorData.filter(investor => {
      // Filter by type
      const matchesFilter = filter === 'all' || investor.type === filter
      
      // Filter by search query
      const matchesSearch = searchQuery === '' || 
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesFilter && matchesSearch
    })
  }, [filter, searchQuery, investorData])

  // ✅ STATISTIKEN für Filter Buttons
  const stats = useMemo(() => {
    const investors = investorData.filter(i => i.type === 'investor').length
    const funds = investorData.filter(i => i.type === 'fund').length
    return { total: investorData.length, investors, funds }
  }, [investorData])


  return (
  <div className="min-h-screen bg-dark">
    {/* Header */}
    <section className="bg-dark pt-8 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <UserIcon className="w-6 h-6 text-neutral-500" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Alle Investoren & Fonds</h1>
        </div>
        <p className="text-sm text-neutral-400">
          Entdecke die Portfolios der erfolgreichsten Investoren und Top-Performing Fonds der Welt
        </p>
      </div>
    </section>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

      {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-brand text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4 inline mr-2" />
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setFilter('investor')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'investor'
                  ? 'bg-brand text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-2" />
              Investoren ({stats.investors})
            </button>
            <button
              onClick={() => setFilter('fund')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'fund'
                  ? 'bg-brand text-black'
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
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-green-500/50 transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
          {filteredInvestors.map((investor) => (
            <InvestorCard
              key={investor.slug}
              investor={investor}
            />
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
                className="px-4 py-2 bg-brand hover:bg-green-400 text-black rounded-xl font-medium transition-colors"
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