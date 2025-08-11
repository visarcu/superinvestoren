// src/app/superinvestor/activity/page.tsx - Mit neuem Design Theme
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  BoltIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface RealTimeActivity {
  id: string
  date: string
  filing: string
  investor: string
  activity: string
  security: string
  ticker: string
  shares: number
  price: number
  total: number
  source: string
  quarter: string
}

interface ActivityData {
  lastUpdated: string
  source: string
  totalActivities: number
  activities: RealTimeActivity[]
}

export default function DataromaRealTimeActivityPage() {
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvestor, setSelectedInvestor] = useState('all')
  const [selectedActivity, setSelectedActivity] = useState('all')
  const [sortField, setSortField] = useState<'date' | 'investor' | 'total'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  useEffect(() => {
    loadRealTimeData()
  }, [])
  
  const loadRealTimeData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to load activity data from JSON file
      const response = await fetch('/data/realtime-activity.json')
      
      if (!response.ok) {
        throw new Error('Real-time data not available.')
      }
      
      const data: ActivityData = await response.json()
      setActivityData(data)
      setLastRefresh(new Date())
      
    } catch (err) {
      console.error('Error loading real-time data:', err)
      setError('Real-time data temporarily unavailable. Please try again later.')
      
      // Fallback to demo data
      setActivityData({
        lastUpdated: new Date().toISOString(),
        source: 'demo',
        totalActivities: 0,
        activities: []
      })
    } finally {
      setLoading(false)
    }
  }
  
  const triggerScrape = async () => {
    try {
      setError(null)
      
      // Call API endpoint to update data
      const response = await fetch('/api/update-activity-data', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to update data')
      }
      
      // Reload data after update
      setTimeout(() => {
        loadRealTimeData()
      }, 2000)
      
    } catch (err) {
      console.error('Error updating data:', err)
      setError('Data update failed. Please try again later.')
    }
  }
  
  const activities = activityData?.activities || []
  const uniqueInvestors = Array.from(new Set(activities.map(a => a.investor)))
  const uniqueActivities = Array.from(new Set(activities.map(a => a.activity)))
  
  const filteredActivities = useMemo(() => {
    let filtered = activities.filter(activity => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesInvestor = activity.investor.toLowerCase().includes(searchLower)
        const matchesSecurity = activity.security.toLowerCase().includes(searchLower)
        const matchesTicker = activity.ticker?.toLowerCase().includes(searchLower)
        
        if (!matchesInvestor && !matchesSecurity && !matchesTicker) return false
      }
      
      if (selectedInvestor !== 'all' && activity.investor !== selectedInvestor) return false
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
        case 'total':
          aVal = a.total
          bVal = b.total
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [activities, searchTerm, selectedInvestor, selectedActivity, sortField, sortDirection])
  
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
    switch (activity.toLowerCase()) {
      case 'new position': return <PlusIcon className="w-4 h-4 text-green-400" />
      case 'buy':
      case 'purchase':
      case 'increased': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
      case 'sell':
      case 'sale':
      case 'decreased': return <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
      case 'sold out': return <MinusIcon className="w-4 h-4 text-red-400" />
      default: return <BoltIcon className="w-4 h-4 text-gray-400" />
    }
  }
  
  const getActivityColor = (activity: string) => {
    const activityLower = activity.toLowerCase()
    
    if (['new position', 'buy', 'purchase', 'increased'].includes(activityLower)) {
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    } else if (['sell', 'sale', 'decreased', 'sold out'].includes(activityLower)) {
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    } else {
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }
  
  const isRecentActivity = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 7 // Recent = last 7 days
    } catch (error) {
      return false
    }
  }
  
  // Stats
  const stats = useMemo(() => {
    const buyActivities = filteredActivities.filter(a => 
      ['new position', 'buy', 'purchase', 'increased'].includes(a.activity.toLowerCase())
    )
    const sellActivities = filteredActivities.filter(a => 
      ['sell', 'sale', 'decreased', 'sold out'].includes(a.activity.toLowerCase())
    )
    const recentActivities = filteredActivities.filter(a => isRecentActivity(a.date))
    
    return {
      totalActivities: filteredActivities.length,
      totalInvestors: uniqueInvestors.length,
      buyActivities: buyActivities.length,
      sellActivities: sellActivities.length,
      recentActivities: recentActivities.length
    }
  }, [filteredActivities, uniqueInvestors])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <BoltIcon className="w-12 h-12 text-green-500 mx-auto mb-4 animate-pulse" />
            <div className="text-green-400">Lade Real-Time Aktivitäten...</div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <BoltIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Real-Time Aktivität</h1>
                <p className="text-theme-secondary">Live Superinvestor Transaktionen</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {activityData?.lastUpdated && (
                <div className="text-sm text-theme-secondary">
                  Zuletzt aktualisiert: {format(parseISO(activityData.lastUpdated), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              )}
              <button 
                onClick={loadRealTimeData}
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                className="px-4 py-2 text-white rounded-lg hover:bg-theme-hover transition text-sm flex items-center gap-2 border"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Aktualisieren
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <LinkIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Fehler beim Laden der Daten</p>
                  <p className="text-sm text-theme-secondary mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.totalActivities}</div>
              <div className="text-sm text-theme-secondary">Transaktionen</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.totalInvestors}</div>
              <div className="text-sm text-theme-secondary">Investoren</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{stats.buyActivities}</div>
              <div className="text-sm text-theme-secondary">Käufe</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{stats.sellActivities}</div>
              <div className="text-sm text-theme-secondary">Verkäufe</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.recentActivities}</div>
              <div className="text-sm text-theme-secondary">Aktuell (7d)</div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
             className=" rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-4 h-4 text-theme-secondary" />
            <h3 className="text-base font-medium text-white">Filter</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-theme-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Investor oder Aktie suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-white placeholder-theme-secondary focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>
            
            <select
              value={selectedInvestor}
              onChange={(e) => setSelectedInvestor(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="px-3 py-2 border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition text-sm"
            >
              <option value="all">Alle Investoren</option>
              {uniqueInvestors.map(investor => (
                <option key={investor} value={investor}>{investor}</option>
              ))}
            </select>
            
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="px-3 py-2 border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition text-sm"
            >
              <option value="all">Alle Aktivitäten</option>
              {uniqueActivities.map(activity => (
                <option key={activity} value={activity}>{activity}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Activities Table */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
             className=" rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                     className="border-b">
                <tr>
                  <th 
                    className="text-left p-4 text-sm font-medium text-theme-secondary cursor-pointer hover:text-white"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Datum
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-theme-secondary">Filing</th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-theme-secondary cursor-pointer hover:text-white"
                    onClick={() => handleSort('investor')}
                  >
                    <div className="flex items-center gap-2">
                      Investor
                      {sortField === 'investor' && (
                        sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-theme-secondary">Aktivität</th>
                  <th className="text-left p-4 text-sm font-medium text-theme-secondary">Wertpapier</th>
                  <th className="text-right p-4 text-sm font-medium text-theme-secondary">Aktien</th>
                  <th className="text-right p-4 text-sm font-medium text-theme-secondary">Preis</th>
                  <th 
                    className="text-right p-4 text-sm font-medium text-theme-secondary cursor-pointer hover:text-white"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Volumen
                      {sortField === 'total' && (
                        sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} style={{ borderColor: 'var(--border-color)' }}
                      className="border-b hover:bg-theme-hover transition-colors">
                    <td className="p-4">
                      <div className="text-white font-medium">
                        {format(parseISO(activity.date), 'dd.MM.yyyy', { locale: de })}
                      </div>
                      {isRecentActivity(activity.date) && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          Aktuell
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-theme-secondary font-mono text-sm">{activity.filing}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-blue-400 font-medium">{activity.investor}</div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getActivityColor(activity.activity)}`}>
                        {getActivityIcon(activity.activity)}
                        {activity.activity}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{activity.ticker}</div>
                      <div className="text-xs text-theme-secondary truncate max-w-[200px]">
                        {activity.security}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-medium">
                        {activity.shares.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-medium">
                        ${activity.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-semibold">
                        {formatCurrency(activity.total)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredActivities.length === 0 && !loading && (
            <div className="text-center py-12">
              <BoltIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <div className="text-theme-secondary">
                {activities.length === 0 ? 'Keine Real-Time Daten verfügbar' : 'Keine Aktivitäten entsprechen deinen Filtern'}
              </div>
              <div className="text-theme-secondary text-sm mt-2">
                {activities.length === 0 
                  ? 'Bitte versuche die Daten zu aktualisieren oder schaue später nochmal vorbei'
                  : 'Versuche deine Filter-Einstellungen anzupassen'
                }
              </div>
            </div>
          )}
        </div>
        
        {/* Info Box */}
        <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-green-400 font-semibold mb-2">Real-Time Superinvestor Activity</h3>
              <div className="text-sm text-theme-secondary space-y-2">
                <p>
                  Diese Sektion zeigt aktuelle Transaktionen der Super-Investoren zwischen den 
                  quarterly 13F-Filings. Daten enthalten Amendment Filings, Form 4s und andere 
                  sofort gemeldete Transaktionen.
                </p>
                <p>
                  Die Daten werden regelmäßig aktualisiert und bieten Einblicke in die 
                  Investment-Aktivitäten der erfolgreichsten Investoren der Welt.
                </p>
                <p>
                  <strong>Hinweis:</strong> Nutze die Filter-Funktionen um nach bestimmten 
                  Investoren oder Aktivitäten zu suchen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}