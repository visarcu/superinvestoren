// src/app/(terminal)/analyse/earnings/page.tsx - Earnings Calendar for Watchlist
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  CalendarIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BookmarkIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

const MARKET_CAP_FILTERS = [
  { id: 'mega', label: 'Mega & Large Cap', min: 20000000000, hint: '> 20 Mrd. $' },
  { id: 'mid', label: 'Mid Cap +', min: 3000000000, hint: '> 3 Mrd. $' },
  { id: 'all', label: 'Alle Caps', min: 0, hint: 'inkl. Small Caps' }
] as const

const TIME_FILTERS = [
  { id: 'all', label: 'Alle Zeiten' },
  { id: 'bmo', label: 'Vor Börse' },
  { id: 'amc', label: 'Nach Börse' }
] as const

type MarketCapFilterId = typeof MARKET_CAP_FILTERS[number]['id']
type TimeFilterId = typeof TIME_FILTERS[number]['id']

interface WatchlistItem {
  id: string
  ticker: string
  created_at: string
}

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  fiscalYear: string
  estimatedEPS: number | null
  actualEPS: number | null
  marketCap?: number
}

export default function EarningsCalendarPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([])
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [showMyStocksOnly, setShowMyStocksOnly] = useState(false)
  const [displayCount, setDisplayCount] = useState(50) // Show 50 initial non-watchlist entries
  const [marketCapFilter, setMarketCapFilter] = useState<MarketCapFilterId>('mega')
  const [timeFilter, setTimeFilter] = useState<TimeFilterId>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  // Fetch user watchlist
  useEffect(() => {
    async function fetchWatchlist() {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
        
        if (sessionErr) {
          console.error('[Earnings Calendar] Session Error:', sessionErr.message)
          router.push('/auth/signin')
          return
        }

        if (!session?.user) {
          router.push('/auth/signin')
          return
        }


        const { data, error: dbErr } = await supabase
          .from('watchlists')
          .select('id, ticker, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (dbErr) {
          console.error('[Earnings Calendar] DB Error:', dbErr.message)
          setError('Fehler beim Laden der Watchlist')
        } else {
          setWatchlistItems(data || [])
          
          // Load all earnings data, not just watchlist
          await loadAllEarningsData()
        }
      } catch (error) {
        console.error('[Earnings Calendar] Unexpected error:', error)
        setError('Unerwarteter Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }

    fetchWatchlist()
  }, [router])

  // Load all earnings data (not filtered by watchlist)
  async function loadAllEarningsData(priorityTickers: string[] = []) {
    setEarningsLoading(true)
    try {
      const params = new URLSearchParams()
      if (priorityTickers.length > 0) {
        params.set('priority', priorityTickers.join(','))
      }
      const response = await fetch(`/api/earnings-calendar-all${params.toString() ? `?${params.toString()}` : ''}`)
      
      if (response.ok) {
        const events = await response.json()
        setEarningsEvents(events)
      } else {
        console.error('Failed to load earnings data')
        setError('Fehler beim Laden der Earnings-Daten')
      }
    } catch (error) {
      console.error('Error loading earnings data:', error)
      setError('Fehler beim Laden der Earnings-Daten')
    } finally {
      setEarningsLoading(false)
    }
  }

  // Load earnings data for watchlist tickers
  async function loadEarningsData(tickers: string[]) {
    if (tickers.length === 0) return

    setEarningsLoading(true)
    try {
      const response = await fetch(`/api/earnings-calendar?tickers=${tickers.join(',')}`)
      
      if (response.ok) {
        const events = await response.json()
        setEarningsEvents(events)
      } else {
        console.error('Failed to load earnings data')
        setError('Fehler beim Laden der Earnings-Daten')
      }
    } catch (error) {
      console.error('Error loading earnings data:', error)
      setError('Fehler beim Laden der Earnings-Daten')
    } finally {
      setEarningsLoading(false)
    }
  }

  // Refresh earnings data
  const refreshEarnings = () => {
    if (showMyStocksOnly && watchlistItems.length > 0) {
      loadEarningsData(watchlistItems.map(item => item.ticker))
    } else {
      loadAllEarningsData(watchlistItems.map(item => item.ticker))
    }
  }

  // Toggle between all stocks and my stocks
  const toggleStockFilter = () => {
    setShowMyStocksOnly(!showMyStocksOnly)
    setDisplayCount(50) // Reset display count when switching modes
    
    if (!showMyStocksOnly && watchlistItems.length > 0) {
      // Switch to my stocks only
      loadEarningsData(watchlistItems.map(item => item.ticker))
    } else {
      // Switch to all stocks
      loadAllEarningsData(watchlistItems.map(item => item.ticker))
    }
  }

  const watchlistTickerSet = useMemo(() => new Set(watchlistItems.map(item => item.ticker.toUpperCase())), [watchlistItems])
  const marketCapThreshold = useMemo(() => {
    const filter = MARKET_CAP_FILTERS.find(filter => filter.id === marketCapFilter)
    return filter ? filter.min : 0
  }, [marketCapFilter])

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return earningsEvents.filter(event => {
      const tickerUpper = event.ticker?.toUpperCase() || ''
      const isWatchlist = watchlistTickerSet.has(tickerUpper)
      const marketCap = event.marketCap || 0
      const meetsCap = isWatchlist || marketCap >= marketCapThreshold
      const eventTime = (event.time || '').toLowerCase()
      const matchesTime = timeFilter === 'all' || eventTime === timeFilter
      const matchesSearch = !term || event.ticker.toLowerCase().includes(term) || (event.companyName?.toLowerCase().includes(term))
      return meetsCap && matchesTime && matchesSearch
    })
  }, [earningsEvents, watchlistTickerSet, marketCapThreshold, timeFilter, searchTerm])

  const watchlistEvents = filteredEvents.filter(event => watchlistTickerSet.has(event.ticker.toUpperCase()))
  const marketLeaderEvents = filteredEvents.filter(event => !watchlistTickerSet.has(event.ticker.toUpperCase()))
  const additionalMarketLeaders = showMyStocksOnly ? [] : marketLeaderEvents.slice(0, Math.max(displayCount - watchlistEvents.length, 0))
  const remainingMarketLeaders = Math.max(marketLeaderEvents.length - additionalMarketLeaders.length, 0)
  const displayedEvents = showMyStocksOnly ? watchlistEvents : [...watchlistEvents, ...additionalMarketLeaders]
  
  // Group earnings by date
  const groupedEarnings = displayedEvents.reduce((groups, event) => {
    const date = new Date(event.date).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {} as Record<string, EarningsEvent[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedEarnings).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  )

  // Generate single calendar month
  const generateCalendarMonth = (date: Date) => {
    const today = new Date()
    const monthName = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7 // Monday = 0
    const daysInMonth = lastDayOfMonth.getDate()
    
    const days = []
    
    // Add empty cells for days before month starts
    for (let j = 0; j < firstDayWeekday; j++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(date.getFullYear(), date.getMonth(), day)
      const dateString = currentDate.toDateString()
      const events = groupedEarnings[dateString] || []
      days.push({
        date: currentDate,
        day,
        events,
        isToday: dateString === today.toDateString(),
        isPast: currentDate < today && dateString !== today.toDateString()
      })
    }
    
    return {
      name: monthName,
      days,
      year: date.getFullYear(),
      month: date.getMonth()
    }
  }

  const currentCalendarMonth = generateCalendarMonth(selectedMonth)

  // Navigation functions
  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))
  }

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date())
  }

  // Get month navigation boundaries (3 months forward and backward)
  const today = new Date()
  const minMonth = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 6, 1)
  const canGoPrevious = selectedMonth > minMonth
  const canGoNext = selectedMonth < maxMonth

  // Format functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Heute'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen'
    } else {
      return date.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  const formatTime = (time: string) => {
    if (time === 'amc') return 'Nach Börsenschluss'
    if (time === 'bmo') return 'Vor Börseneröffnung'
    if (time === 'TBD' || time === 'tbd') return 'Zeit offen'
    return time
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Earnings Kalender...</p>
          </div>

          {/* Filter Controls */}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      
      {/* Professional Header */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-8">
          
          {/* Back Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Analyse
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CalendarIcon className="w-6 h-6 text-green-400" />
                <h1 className="text-3xl font-bold text-theme-primary">
                  Earnings Kalender
                </h1>
              </div>
              <div className="flex items-center gap-4 text-theme-secondary">
                <span className="text-sm">
                  {showMyStocksOnly 
                    ? `${watchlistEvents.length} ${watchlistEvents.length === 1 ? 'Aktie' : 'Aktien'} aus deiner Watchlist`
                    : `${filteredEvents.length} Earnings nach Filter`
                  }
                </span>
                {filteredEvents.length > 0 && (
                  <>
                    <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                    <span className="text-sm text-green-400">
                      Watchlist: {watchlistEvents.length} • Market Leaders: {marketLeaderEvents.length}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleStockFilter}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  showMyStocksOnly 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-theme-secondary hover:bg-theme-secondary/70 text-theme-primary border border-theme/20'
                }`}
              >
                <BookmarkIcon className="w-4 h-4" />
                <span className="font-medium">
                  {showMyStocksOnly ? 'Nur meine Aktien' : 'Alle Aktien'}
                </span>
              </button>
              <button
                onClick={refreshEarnings}
                disabled={earningsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${earningsLoading ? 'animate-spin' : ''}`} />
                <span className="font-medium">
                  {earningsLoading ? 'Laden...' : 'Aktualisieren'}
                </span>
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="mt-8 bg-theme-secondary/30 border border-theme/10 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nach Ticker oder Unternehmen suchen..."
                  className="w-full bg-theme-primary border border-theme/20 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {TIME_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setTimeFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      timeFilter === filter.id
                        ? 'bg-green-500 text-black'
                        : 'bg-theme-primary text-theme-muted border border-theme/20 hover:border-green-500/40'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {MARKET_CAP_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setMarketCapFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      marketCapFilter === filter.id
                        ? 'bg-green-500/10 text-green-400 border-green-500/40'
                        : 'bg-theme-primary text-theme-muted border-theme/20 hover:border-green-500/30'
                    }`}
                    title={filter.hint}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-theme-muted">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              <span>
                Filter aktiv: {timeFilter === 'all' ? 'alle Zeiten' : timeFilter === 'bmo' ? 'Vor Börse' : 'Nach Börse'} •
                Mindest-Marktkapitalisierung {MARKET_CAP_FILTERS.find(filter => filter.id === marketCapFilter)?.hint}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-6 lg:px-8 py-8 space-y-8">

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Empty Watchlist State */}
        {watchlistItems.length === 0 ? (
          <div className="bg-theme-card border border-theme/5 rounded-xl p-12 text-center">
            <div className="w-24 h-24 mx-auto bg-theme-secondary rounded-2xl flex items-center justify-center mb-6">
              <BookmarkIcon className="w-12 h-12 text-theme-muted" />
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-theme-primary">
                Keine Aktien in der Watchlist
              </h2>
              <p className="text-theme-secondary text-sm">
                Füge Aktien zu deiner Watchlist hinzu, um ihre anstehenden Earnings-Termine zu verfolgen.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/analyse/watchlist"
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
              >
                Zur Watchlist
              </Link>
              <Link
                href="/analyse"
                className="px-6 py-3 bg-theme-card border border-theme/10 text-theme-secondary rounded-lg hover:bg-theme-hover hover:text-theme-primary transition font-medium"
              >
                Aktien entdecken
              </Link>
            </div>
          </div>
        ) : earningsEvents.length === 0 ? (
          /* No Earnings Found */
          <div className="bg-theme-card border border-theme/5 rounded-xl p-12 text-center">
            <div className="w-24 h-24 mx-auto bg-theme-secondary rounded-2xl flex items-center justify-center mb-6">
              <CalendarIcon className="w-12 h-12 text-theme-muted" />
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-theme-primary">
                Keine anstehenden Earnings
              </h2>
              <p className="text-theme-secondary text-sm">
                Für deine Watchlist-Aktien sind aktuell keine Earnings-Termine in den nächsten 3 Monaten bekannt.
              </p>
            </div>
            
            <button
              onClick={refreshEarnings}
              className="mt-6 px-6 py-3 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded-lg transition font-medium"
            >
              Erneut prüfen
            </button>
          </div>
        ) : (
          /* Single Calendar with Navigation */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-theme-primary">
                Earnings Kalender
              </h2>
              <div className="text-sm text-theme-muted">
                Wähle einen Monat aus
              </div>
            </div>

            {/* Single Calendar */}
            <div className="bg-theme-card border border-theme/10 rounded-xl overflow-hidden">
              {/* Month Header with Navigation */}
              <div className="px-6 py-4 bg-theme-secondary/30 border-b border-theme/10">
                <div className="flex items-center justify-between">
                  <button
                    onClick={goToPreviousMonth}
                    disabled={!canGoPrevious}
                    className="p-2 rounded-lg border border-theme/20 hover:bg-theme-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-theme-primary" />
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-theme-primary capitalize">
                      {currentCalendarMonth.name}
                    </h3>
                    
                    {/* Today Button */}
                    <button
                      onClick={goToCurrentMonth}
                      className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 transition-colors"
                    >
                      Heute
                    </button>
                  </div>
                  
                  <button
                    onClick={goToNextMonth}
                    disabled={!canGoNext}
                    className="p-2 rounded-lg border border-theme/20 hover:bg-theme-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-theme-primary" />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-theme/10 bg-theme-secondary/10">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-theme-muted border-r border-theme/10 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {currentCalendarMonth.days.map((dayData, index) => (
                  <div
                    key={index}
                    className={`min-h-[120px] border-r border-b border-theme/10 last:border-r-0 ${
                      index >= currentCalendarMonth.days.length - 7 ? 'border-b-0' : ''
                    } ${
                      !dayData ? 'bg-theme-secondary/5' : dayData.isPast ? 'bg-theme-secondary/5' : ''
                    }`}
                  >
                    {dayData && (
                      <div className="p-2 h-full">
                        {/* Day Number */}
                        <div className={`flex items-center justify-between mb-2 ${
                          dayData.isToday ? 'text-green-400' : dayData.isPast ? 'text-theme-muted' : 'text-theme-primary'
                        }`}>
                          <span className={`text-sm font-semibold ${
                            dayData.isToday ? 'w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center' : ''
                          }`}>
                            {dayData.day}
                          </span>
                          {dayData.events.length > 0 && (
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          )}
                        </div>

                        {/* Events */}
                        <div className="space-y-1">
                          {dayData.events.slice(0, 3).map((event, eventIndex) => {
                            const isWatchlistEvent = watchlistTickerSet.has(event.ticker.toUpperCase())
                            return (
                              <Link
                                key={eventIndex}
                                href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                                className={`block text-xs px-2 py-1 rounded-md cursor-pointer transition-all hover:scale-105 border ${
                                  isWatchlistEvent
                                    ? 'bg-green-500/15 text-green-400 border-green-500/40'
                                    : event.time === 'amc'
                                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30'
                                      : event.time === 'bmo'
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
                                        : 'bg-theme-secondary/50 text-theme-primary border-theme/20 hover:bg-theme-secondary'
                                }`}
                                title={`${event.ticker} - ${event.companyName} (${formatTime(event.time)})`}
                              >
                                <div className="font-semibold truncate flex items-center gap-1">
                                  {event.ticker}
                                  {isWatchlistEvent && (
                                    <span className="text-[10px] uppercase tracking-wide bg-green-500/40 text-black rounded-full px-1">
                                      WL
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs opacity-80 truncate">
                                  {formatTime(event.time)}
                                </div>
                              </Link>
                            )
                          })}
                          
                          {dayData.events.length > 3 && (
                            <div className="text-xs text-theme-muted text-center">
                              +{dayData.events.length - 3} weitere
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Events List */}
            {sortedDates.length > 0 && (
              <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">
                  Detaillierte Earnings-Termine
                </h3>
                <div className="space-y-4">
                  {sortedDates.slice(0, 10).map((dateString) => {
                    const events = groupedEarnings[dateString]
                    const date = new Date(dateString)
                    const isToday = date.toDateString() === new Date().toDateString()
                    
                    return (
                      <div key={dateString} className={`p-4 rounded-lg border ${
                        isToday ? 'border-green-500/30 bg-green-500/5' : 'border-theme/20'
                      }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`text-center ${isToday ? 'text-green-400' : 'text-theme-primary'}`}>
                            <div className="text-lg font-bold">{date.getDate()}</div>
                            <div className="text-xs uppercase">
                              {date.toLocaleDateString('de-DE', { month: 'short' })}
                            </div>
                          </div>
                          <div>
                            <h4 className={`font-semibold ${isToday ? 'text-green-400' : 'text-theme-primary'}`}>
                              {formatDate(dateString)}
                            </h4>
                            <p className="text-sm text-theme-muted">
                              {events.length} Earnings-Termine
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {events.map((event, eventIndex) => {
                            const isWatchlist = watchlistTickerSet.has(event.ticker.toUpperCase())
                            return (
                            <Link
                              key={eventIndex}
                              href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                              className={`flex items-center gap-3 p-3 border rounded-lg transition-all group ${
                                isWatchlist 
                                  ? 'border-green-500/40 bg-green-500/5 hover:border-green-500/60' 
                                  : 'border-theme/20 hover:border-theme/40'
                              }`}
                            >
                              <Logo 
                                ticker={event.ticker} 
                                alt={`${event.ticker} Logo`} 
                                className="w-8 h-8 rounded-lg flex-shrink-0" 
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-theme-primary group-hover:text-green-400 transition-colors flex items-center gap-2">
                                  <span>{event.ticker}</span>
                                  {isWatchlist && (
                                    <span className="text-[10px] uppercase tracking-wide text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-full">
                                      Watchlist
                                    </span>
                                  )}
                                  {event.marketCap && event.marketCap > 100000000 && (
                                    <span className="text-[11px] bg-theme-secondary/50 text-theme-primary px-1.5 py-0.5 rounded border border-theme/20">
                                      {event.marketCap > 1_000_000_000_000 ? 
                                        `${(event.marketCap / 1_000_000_000_000).toFixed(1)} Bio.` : 
                                        event.marketCap > 1_000_000_000 ?
                                        `${(event.marketCap / 1_000_000_000).toFixed(1)} Mrd.` :
                                        `${(event.marketCap / 1_000_000).toFixed(0)} Mio.`
                                      }
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-theme-muted truncate">
                                  {event.companyName !== event.ticker ? event.companyName : formatTime(event.time)} • {event.quarter}
                                </div>
                              </div>
                              <div className={`w-3 h-3 rounded-full ${
                                event.time === 'amc' ? 'bg-orange-400' :
                                event.time === 'bmo' ? 'bg-blue-400' :
                                'bg-theme-muted'
                              }`}></div>
                            </Link>
                          )})}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Show More Button - Only show for "All Stocks" mode */}
            {!showMyStocksOnly && remainingMarketLeaders > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setDisplayCount(prev => prev + 50)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  Mehr anzeigen ({remainingMarketLeaders} weitere)
                </button>
              </div>
            )}

            {/* Legend */}
            <div className="bg-theme-secondary/20 border border-theme/10 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-theme-primary mb-3">Zeitangaben:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-theme-muted">
                    <strong className="text-theme-primary">Vor Börseneröffnung</strong> - Vor 9:30 Uhr EST
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="text-theme-muted">
                    <strong className="text-theme-primary">Nach Börsenschluss</strong> - Nach 16:00 Uhr EST
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-theme-muted rounded-full"></div>
                  <span className="text-theme-muted">
                    <strong className="text-theme-primary">Zeit offen</strong> - Noch nicht festgelegt
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
