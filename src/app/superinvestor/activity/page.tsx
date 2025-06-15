// src/app/superinvestor/activity/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import holdingsHistory from '@/data/holdings'

interface ActivityEntry {
  id: string
  date: string
  investor: string
  investorSlug: string
  activity: 'Buy' | 'Sell' | 'New Position' | 'Sold Out' | 'Increased' | 'Decreased'
  security: string
  ticker?: string
  shares: number
  value: number
  changePercent?: number
  quarter: string
}

function generateActivityFromHoldings(): ActivityEntry[] {
  const activities: ActivityEntry[] = []
  
  const investorNames: Record<string, string> = {
    'buffett': 'Warren Buffett',
    'ackman': 'Bill Ackman', 
    'smith': 'Terry Smith',
    'gates': 'Bill & Melinda Gates Foundation',
    'icahn': 'Carl Icahn',
    'einhorn': 'David Einhorn',
    'klarman': 'Seth Klarman',
    // Add your other investors
  }
  
  Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
    if (!Array.isArray(snapshots) || snapshots.length < 2) return
    
    // Compare each snapshot with the previous one
    for (let i = 1; i < snapshots.length; i++) {
      const current = snapshots[i].data
      const previous = snapshots[i - 1].data
      
      if (!current?.positions || !previous?.positions) continue
      
      const changes = calculateDetailedChanges(current.positions, previous.positions)
      const date = current.date
      const quarter = dateToQuarter(date)
      
      // Add activities for this comparison
      changes.forEach(change => {
        activities.push({
          id: `${slug}-${date}-${change.cusip}`,
          date,
          investor: investorNames[slug] || slug,
          investorSlug: slug,
          activity: change.activity,
          security: change.name,
          ticker: change.ticker,
          shares: Math.abs(change.shares),
          value: change.value,
          changePercent: change.changePercent,
          quarter
        })
      })
    }
  })
  
  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function calculateDetailedChanges(current: any[], previous: any[]) {
  const prevMap = new Map()
  previous.forEach(pos => {
    if (pos?.cusip) {
      prevMap.set(pos.cusip, {
        shares: (prevMap.get(pos.cusip)?.shares || 0) + (pos.shares || 0),
        value: (prevMap.get(pos.cusip)?.value || 0) + (pos.value || 0),
        name: pos.name,
        ticker: pos.ticker
      })
    }
  })
  
  const currentMap = new Map()
  current.forEach(pos => {
    if (pos?.cusip) {
      currentMap.set(pos.cusip, {
        shares: (currentMap.get(pos.cusip)?.shares || 0) + (pos.shares || 0),
        value: (currentMap.get(pos.cusip)?.value || 0) + (pos.value || 0),
        name: pos.name,
        ticker: pos.ticker
      })
    }
  })
  
  const changes: Array<{
    cusip: string
    name: string
    ticker?: string
    activity: 'Buy' | 'Sell' | 'New Position' | 'Sold Out' | 'Increased' | 'Decreased'
    shares: number
    value: number
    changePercent?: number
  }> = []
  
  // Check all current positions
  currentMap.forEach((curr, cusip) => {
    const prev = prevMap.get(cusip)
    
    if (!prev) {
      // New position
      changes.push({
        cusip,
        name: curr.name || cusip,
        ticker: curr.ticker,
        activity: 'New Position',
        shares: curr.shares,
        value: curr.value,
        changePercent: 100
      })
    } else {
      // Position changed
      const sharesDiff = curr.shares - prev.shares
      const changePercent = prev.shares > 0 ? (sharesDiff / prev.shares) * 100 : 0
      
      if (Math.abs(changePercent) >= 5) { // Only show significant changes (≥5%)
        if (sharesDiff > 0) {
          changes.push({
            cusip,
            name: curr.name || cusip,
            ticker: curr.ticker,
            activity: changePercent >= 25 ? 'Buy' : 'Increased',
            shares: sharesDiff,
            value: curr.value - prev.value,
            changePercent: Math.abs(changePercent)
          })
        } else {
          changes.push({
            cusip,
            name: curr.name || cusip,
            ticker: curr.ticker,
            activity: Math.abs(changePercent) >= 25 ? 'Sell' : 'Decreased',
            shares: Math.abs(sharesDiff),
            value: Math.abs(curr.value - prev.value),
            changePercent: Math.abs(changePercent)
          })
        }
      }
    }
  })
  
  // Check for completely sold positions
  prevMap.forEach((prev, cusip) => {
    if (!currentMap.has(cusip)) {
      changes.push({
        cusip,
        name: prev.name || cusip,
        ticker: prev.ticker,
        activity: 'Sold Out',
        shares: prev.shares,
        value: prev.value,
        changePercent: 100
      })
    }
  })
  
  return changes
}

function dateToQuarter(dateStr: string): string {
  try {
    const [year, month] = dateStr.split('-').map(Number)
    if (isNaN(year) || isNaN(month)) return 'Q1 2024'
    const quarter = Math.ceil(month / 3)
    return `Q${quarter} ${year}`
  } catch (error) {
    return 'Q1 2024'
  }
}

export default function PortfolioActivityPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvestor, setSelectedInvestor] = useState('all')
  const [selectedActivity, setSelectedActivity] = useState('all')
  const [sortField, setSortField] = useState<'date' | 'investor' | 'value'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const allActivities = useMemo(() => {
    try {
      return generateActivityFromHoldings()
    } catch (error) {
      console.error('Error generating activities:', error)
      return []
    }
  }, [])
  
  const uniqueInvestors = Array.from(new Set(allActivities.map(a => a.investorSlug)))
  const uniqueActivities = Array.from(new Set(allActivities.map(a => a.activity)))
  
  const filteredActivities = useMemo(() => {
    let filtered = allActivities.filter(activity => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesInvestor = activity.investor.toLowerCase().includes(searchLower)
        const matchesSecurity = activity.security.toLowerCase().includes(searchLower)
        const matchesTicker = activity.ticker?.toLowerCase().includes(searchLower)
        
        if (!matchesInvestor && !matchesSecurity && !matchesTicker) return false
      }
      
      if (selectedInvestor !== 'all' && activity.investorSlug !== selectedInvestor) return false
      if (selectedActivity !== 'all' && activity.activity !== selectedActivity) return false
      
      return true
    })
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortField) {
        case 'date':
          aVal = new Date(a.date)
          bVal = new Date(b.date)
          break
        case 'investor':
          aVal = a.investor
          bVal = b.investor
          break
        case 'value':
          aVal = a.value
          bVal = b.value
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [allActivities, searchTerm, selectedInvestor, selectedActivity, sortField, sortDirection])
  
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(0)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount.toLocaleString()}`
    }
  }
  
  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'New Position': return <PlusIcon className="w-4 h-4 text-green-400" />
      case 'Buy':
      case 'Increased': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
      case 'Sell':
      case 'Decreased': return <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
      case 'Sold Out': return <MinusIcon className="w-4 h-4 text-red-400" />
      default: return <ChartBarIcon className="w-4 h-4 text-gray-400" />
    }
  }
  
  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'New Position':
      case 'Buy':
      case 'Increased':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'Sell':
      case 'Decreased':
      case 'Sold Out':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }
  
  // Stats
  const stats = useMemo(() => {
    const buyActivities = filteredActivities.filter(a => ['New Position', 'Buy', 'Increased'].includes(a.activity))
    const sellActivities = filteredActivities.filter(a => ['Sell', 'Decreased', 'Sold Out'].includes(a.activity))
    
    return {
      totalActivities: filteredActivities.length,
      totalInvestors: uniqueInvestors.length,
      buyActivities: buyActivities.length,
      sellActivities: sellActivities.length,
      latestQuarter: filteredActivities.length > 0 ? filteredActivities[0].quarter : '-'
    }
  }, [filteredActivities, uniqueInvestors])
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Portfolio Activity</h1>
            <p className="text-gray-400">Real-Time Käufe und Verkäufe der Super-Investoren</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.totalActivities}</div>
            <div className="text-sm text-gray-400">Aktivitäten</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.totalInvestors}</div>
            <div className="text-sm text-gray-400">Investoren</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.buyActivities}</div>
            <div className="text-sm text-gray-400">Käufe</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{stats.sellActivities}</div>
            <div className="text-sm text-gray-400">Verkäufe</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.latestQuarter}</div>
            <div className="text-sm text-gray-400">Neuestes Quarter</div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Filter & Suche</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Investor oder Aktie suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <select
            value={selectedInvestor}
            onChange={(e) => setSelectedInvestor(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Alle Investoren</option>
            {uniqueInvestors.map(slug => {
              const activity = allActivities.find(a => a.investorSlug === slug)
              return (
                <option key={slug} value={slug}>
                  {activity?.investor || slug}
                </option>
              )
            })}
          </select>
          
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Alle Aktivitäten</option>
            {uniqueActivities.map(activity => (
              <option key={activity} value={activity}>{activity}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Activities Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th 
                  className="text-left p-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortField === 'date' && (
                      sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                  onClick={() => handleSort('investor')}
                >
                  <div className="flex items-center gap-2">
                    Investor
                    {sortField === 'investor' && (
                      sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-300">Activity</th>
                <th className="text-left p-4 text-sm font-medium text-gray-300">Security</th>
                <th className="text-right p-4 text-sm font-medium text-gray-300">Shares</th>
                <th 
                  className="text-right p-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Value
                    {sortField === 'value' && (
                      sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="text-center p-4 text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((activity) => (
                <tr key={activity.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <div className="text-white font-medium">
                      {format(parseISO(activity.date), 'dd.MM.yyyy', { locale: de })}
                    </div>
                    <div className="text-xs text-gray-500">{activity.quarter}</div>
                  </td>
                  <td className="p-4">
                    <Link 
                      href={`/superinvestor/${activity.investorSlug}`}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {activity.investor}
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getActivityColor(activity.activity)}`}>
                      {getActivityIcon(activity.activity)}
                      {activity.activity}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-white font-medium">
                      {activity.ticker || activity.security.split(' ')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                      {activity.security}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-medium">
                      {activity.shares.toLocaleString()}
                    </div>
                    {activity.changePercent && (
                      <div className="text-xs text-gray-500">
                        {activity.changePercent.toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-semibold">
                      {formatCurrency(activity.value)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      <Link
                        href={`/superinvestor/${activity.investorSlug}`}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Portfolio ansehen"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400">Keine Aktivitäten gefunden</div>
            <div className="text-gray-600 text-sm">
              {allActivities.length === 0 
                ? 'Holdings-Daten konnten nicht geladen werden'
                : 'Versuche andere Filter-Einstellungen'
              }
            </div>
          </div>
        )}
      </div>
      
      {/* Info Box */}
      <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <CalendarIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-green-400 font-semibold mb-2">Portfolio Activity Information</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                Diese Seite zeigt <strong>Portfolio-Änderungen</strong> zwischen den Quartalen basierend auf 13F-Daten.
              </p>
              <p>
                <strong>New Position:</strong> Erstmalige Position | <strong>Buy/Increased:</strong> ≥25%/5% Aufstockung<br />
                <strong>Sell/Decreased:</strong> ≥25%/5% Verkauf | <strong>Sold Out:</strong> Position komplett aufgelöst
              </p>
              <p>
                Nur signifikante Änderungen (≥5%) werden angezeigt. Daten basieren auf verfügbaren 13F-Filings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}